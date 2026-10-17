import { NextResponse, after } from "next/server";
import crypto from "crypto";
import dbConnect from "../../../../lib/dbconnect";
import AIUser from "../../../../models/User";
import SubscribedRepos from "../../../../models/SubscribedRepo";
import ReviewLog from "../../../../models/ReviewLog";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function shouldReviewFile(filename) {
    if (!filename || typeof filename !== "string") return false;
    const lower = filename.toLowerCase();

    // Ignore dependency lockfiles
    if (
        lower.endsWith("package-lock.json") ||
        lower.endsWith("yarn.lock") ||
        lower.endsWith("pnpm-lock.yaml") ||
        lower.endsWith("bun.lockb") ||
        lower.endsWith("bun.lock") ||
        lower.endsWith("composer.lock") ||
        lower.endsWith("cargo.lock") ||
        lower.endsWith("gemfile.lock") ||
        lower.endsWith("poetry.lock")
    ) {
        return false;
    }

    // Ignore minified / sourcemap files
    if (lower.endsWith(".min.js") || lower.endsWith(".min.css") || lower.endsWith(".map")) {
        return false;
    }

    // Ignore binary / media assets
    const binaryExtensions = [
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
        ".pdf", ".woff", ".woff2", ".ttf", ".eot", ".otf",
        ".mp4", ".webm", ".mp3", ".wav", ".zip", ".tar", ".gz"
    ];
    if (binaryExtensions.some((ext) => lower.endsWith(ext))) {
        return false;
    }

    // Ignore build output artifacts
    if (
        lower.startsWith("dist/") ||
        lower.startsWith("build/") ||
        lower.startsWith(".next/") ||
        lower.startsWith("node_modules/") ||
        lower.startsWith("out/") ||
        lower.startsWith(".turbo/")
    ) {
        return false;
    }

    return true;
}

export async function POST(req) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-hub-signature-256");
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

        if (webhookSecret && signature) {
            const hmac = crypto.createHmac("sha256", webhookSecret);
            const digest = "sha256=" + hmac.update(rawBody).digest("hex");
            if (signature !== digest) {
                console.error("Invalid GitHub webhook signature");
                return NextResponse.json(
                    { error: "Invalid signature" },
                    { status: 401 }
                );
            }
        }

        const event = req.headers.get("x-github-event");
        const body = JSON.parse(rawBody);

        if (event === "ping") {
            console.log("GitHub Webhook ping received successfully:", body.zen);
            return NextResponse.json({
                message: "Pong! Webhook connected successfully.",
                zen: body.zen,
            });
        }

        if (event !== "pull_request") {
            return NextResponse.json({ ignored: true, reason: `Ignored event: ${event}` });
        }

        const action = body.action;
        if (!["opened", "reopened", "synchronize"].includes(action)) {
            return NextResponse.json({ ignored: true, action });
        }

        const owner = body.repository.owner.login;
        const repo = body.repository.name;
        const pullNumber = body.pull_request.number;
        const headSha = body.pull_request.head.sha;
        const isPrivate = body.repository.private;
        const pullTitle = body.pull_request.title || "Untitled Pull Request";
        const pullUrl = body.pull_request.html_url;

        await dbConnect();

        // 1. Resolve access token & user: First check SubscribedRepos, then AIUser
        let user = null;
        let accessToken = null;

        const subscription = await SubscribedRepos.findOne({
            $or: [
                { repoName: repo },
                { repoName: `${owner}/${repo}` },
                { repoId: String(body.repository.id) },
                { repoUrl: body.repository.html_url },
            ]
        }).populate("owner");

        if (subscription?.owner?.githubAccessToken) {
            user = subscription.owner;
            accessToken = subscription.owner.githubAccessToken;
        }

        if (!accessToken) {
            const directUser = await AIUser.findOne({ githubUsername: owner });
            if (directUser) {
                user = directUser;
                accessToken = directUser.githubAccessToken;
            }
        }

        if (!accessToken && process.env.GITHUB_ACCESS_TOKEN) {
            accessToken = process.env.GITHUB_ACCESS_TOKEN;
        }

        if (isPrivate && !accessToken) {
            console.error(`Private repository PR received for ${owner}/${repo}, but no access token was found.`);
            return NextResponse.json(
                { error: `No access token found for ${owner}. Connect GitHub first.` },
                { status: 401 }
            );
        }

        // Run the heavy OpenAI code review & comment posting in the background via Next.js after()
        after(async () => {
            try {
                console.log(`Starting background AI code review for ${owner}/${repo} #${pullNumber}...`);

                const headers = {
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                };

                const baseUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

                const filesResponse = await fetch(`${baseUrl}/files?per_page=100`, {
                    headers,
                    cache: "no-store",
                });

                if (!filesResponse.ok) {
                    console.error("Failed to fetch changed files:", await filesResponse.text());
                    return;
                }

                const allFiles = await filesResponse.json();
                const reviewableFiles = Array.isArray(allFiles)
                    ? allFiles.filter((f) => shouldReviewFile(f.filename))
                    : [];

                if (reviewableFiles.length === 0) {
                    console.log(`No reviewable code files found for ${owner}/${repo} #${pullNumber}. Skipping review.`);
                    return;
                }

                // Limit review to the first 15 files to maintain concise, high-value prompt
                const filesToAnalyze = reviewableFiles.slice(0, 15);

                const filesWithPatchesAndCode = await Promise.all(
                    filesToAnalyze.map(async (file) => {
                        let code = null;

                        if (file.status !== "removed" && file.patch) {
                            try {
                                const fileContentResponse = await fetch(
                                    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(file.filename)}?ref=${headSha}`,
                                    {
                                        headers: {
                                            ...headers,
                                            Accept: "application/vnd.github.raw+json",
                                        },
                                        cache: "no-store",
                                    }
                                );

                                if (fileContentResponse.ok) {
                                    code = await fileContentResponse.text();
                                }
                            } catch (err) {
                                console.warn(`Could not fetch full source code for ${file.filename}:`, err.message);
                            }
                        }

                        return {
                            filename: file.filename,
                            status: file.status,
                            additions: file.additions,
                            deletions: file.deletions,
                            changes: file.changes,
                            patch: file.patch || null,
                            code,
                        };
                    })
                );

                const formattedFiles = filesWithPatchesAndCode
                    .map((file) => {
                        let text = `### File: ${file.filename} (${file.status})\n`;
                        if (file.patch) {
                            text += `**Diff:**\n\`\`\`diff\n${file.patch}\n\`\`\`\n`;
                        }
                        if (file.code) {
                            const codeSnippet =
                                file.code.length > 3500
                                    ? file.code.slice(0, 3500) + "\n... (truncated)"
                                    : file.code;
                            text += `**Full Code Context:**\n\`\`\`\n${codeSnippet}\n\`\`\`\n`;
                        }
                        return text;
                    })
                    .join("\n---\n");

                const prompt = `
You are an expert AI code reviewer. Conduct a detailed, professional code review for the following GitHub Pull Request.

Pull Request Title: ${pullTitle}
Pull Request Description: ${body.pull_request.body || "No description provided"}
Repository: ${owner}/${repo}
Branch: ${body.pull_request.head.ref} -> ${body.pull_request.base.ref}

Changed Files and Diffs:
${formattedFiles}

You MUST structure your response strictly into the following 3 sections using clean GitHub-flavored Markdown:

### 1. 🔍 What Has Been Changed
- Provide a clear, concise bulleted summary of all functional and structural changes across the files.

### 2. ⚠️ Potential Risks & Edge Cases
- Identify potential bugs, security vulnerabilities, edge cases, breaking changes, or performance bottlenecks. If no risks are found, state that clearly.

### 3. 💡 Recommended Improvements
- Provide actionable suggestions, clean code improvements, best practices, or refactored code snippets to enhance code quality.
`;

                const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
                const completion = await openai.chat.completions.create({
                    model,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an automated, high-precision AI Code Review assistant. Provide concise, clear, and actionable feedback in Markdown format.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.2,
                });

                const reviewComment = completion.choices[0]?.message?.content;
                let commentUrl = null;

                if (reviewComment && accessToken) {
                    const commentResponse = await fetch(
                        `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                Accept: "application/vnd.github+json",
                                "X-GitHub-Api-Version": "2022-11-28",
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                body: reviewComment,
                            }),
                        }
                    );

                    if (commentResponse.ok) {
                        const commentData = await commentResponse.json();
                        commentUrl = commentData.html_url;
                        console.log(`Successfully posted PR review comment to PR #${pullNumber}:`, commentUrl);
                    } else {
                        console.error("Failed to post comment to GitHub PR:", await commentResponse.text());
                    }
                }

                // Record review execution in ReviewLog
                await ReviewLog.create({
                    repoName: `${owner}/${repo}`,
                    ownerLogin: owner,
                    pullNumber,
                    pullTitle,
                    pullUrl,
                    commentUrl: commentUrl || "",
                    filesCount: filesToAnalyze.length,
                    modelUsed: model,
                    reviewComment: reviewComment || "",
                    owner: user?._id || null,
                });

                console.log(`Saved review log for ${owner}/${repo} #${pullNumber}.`);
            } catch (bgError) {
                console.error("Background code review error:", bgError);
            }
        });

        // Immediately respond to GitHub within <200ms to eliminate 10s timeout failures
        return NextResponse.json(
            {
                success: true,
                message: "Pull request review scheduled in background",
                pullRequest: {
                    number: pullNumber,
                    title: pullTitle,
                    repository: `${owner}/${repo}`,
                },
            },
            { status: 202 }
        );
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { error: "Internal Server Error in webhook handler" },
            { status: 500 }
        );
    }
}
