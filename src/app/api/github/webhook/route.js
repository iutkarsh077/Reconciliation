import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "../../../../lib/dbconnect";
import AIUser from "../../../../models/User";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

        await dbConnect();

        const user = await AIUser.findOne({ githubUsername: owner });
        const accessToken = user?.githubAccessToken;

        if (isPrivate && !accessToken) {
            console.error(`Private repository PR received for ${owner}/${repo}, but no access token was found.`);
            return NextResponse.json(
                { error: `No access token found for ${owner}. Connect GitHub first or configure GITHUB_ACCESS_TOKEN.` },
                { status: 401 }
            );
        }

        const headers = {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        };

        if (accessToken) {
            headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const baseUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

        const diffResponse = await fetch(baseUrl, {
            headers: {
                ...headers,
                Accept: "application/vnd.github.diff",
            },
            cache: "no-store",
        });

        if (!diffResponse.ok) {
            console.error("Failed to fetch PR diff:", await diffResponse.text());
            return NextResponse.json(
                { error: "Failed to fetch PR diff from GitHub" },
                { status: 502 }
            );
        }

        const diff = await diffResponse.text();

        const filesResponse = await fetch(`${baseUrl}/files?per_page=100`, {
            headers,
            cache: "no-store",
        });

        if (!filesResponse.ok) {
            console.error("Failed to fetch changed files:", await filesResponse.text());
            return NextResponse.json(
                { error: "Failed to fetch changed files from GitHub" },
                { status: 502 }
            );
        }

        const files = await filesResponse.json();

        const filesWithPatchesAndCode = await Promise.all(
            files.map(async (file) => {
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
                    rawUrl: file.raw_url,
                    blobUrl: file.blob_url,
                };
            })
        );

        console.log("Processed Pull Request:", {
            action,
            repository: `${owner}/${repo}`,
            pullNumber,
            title: body.pull_request.title,
            headSha,
            changedFilesCount: filesWithPatchesAndCode.length,
            // filesWithPatchesAndCode
        });

        let reviewComment = null;
        let commentUrl = null;

        
            try {
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

Pull Request Title: ${body.pull_request.title}
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

                const completion = await openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
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

                reviewComment = completion.choices[0]?.message?.content;

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
            } catch (aiError) {
                console.error("Error during AI review or GitHub commenting:", aiError);
            }

        return NextResponse.json({
            success: true,
            pullRequest: {
                number: pullNumber,
                title: body.pull_request.title,
                body: body.pull_request.body,
                author: body.pull_request.user?.login,
                baseBranch: body.pull_request.base.ref,
                headBranch: body.pull_request.head.ref,
                headSha,
            },
            reviewPosted: !!commentUrl,
            commentUrl,
            reviewComment,
            diff,
            files: filesWithPatchesAndCode,
        });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { error: "Internal Server Error in webhook handler" },
            { status: 500 }
        );
    }
}
