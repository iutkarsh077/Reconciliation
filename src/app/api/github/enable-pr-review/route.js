import dbConnect from "../../../../lib/dbconnect";
import { NextResponse } from "next/server";
import SubscribedRepos from "../../../../models/SubscribedRepo";
import AIUser from "../../../../models/User";

export async function POST(req) {
    try {
        await dbConnect();
        const accessToken =
            req.cookies.get("github_token")?.value;

        if (!accessToken) {
            return NextResponse.json(
                { error: "Connect GitHub first" },
                { status: 401 }
            );
        }

        const { owner, repo, repoId: clientRepoId, repoUrl: clientRepoUrl } = await req.json();

        if (
            typeof owner !== "string" ||
            typeof repo !== "string" ||
            !/^[a-zA-Z0-9-]+$/.test(owner) ||
            !/^[a-zA-Z0-9._-]+$/.test(repo)
        ) {
            return NextResponse.json(
                { error: "Invalid repository" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "web",
                    active: true,
                    events: ["pull_request"],
                    config: {
                        url: process.env.GITHUB_WEBHOOK_URL,
                        content_type: "json",
                        secret: process.env.GITHUB_WEBHOOK_SECRET,
                        insecure_ssl: "0",
                    },
                }),
                cache: "no-store",
            }
        );

        const data = await response.json();

        console.log("start hook: ", data)

        if (!response.ok) {
            console.error("GitHub webhook creation error:", data);

            const isAlreadyExists = data.errors?.some(
                (err) => typeof err.message === "string" && err.message.toLowerCase().includes("hook already exists")
            );

            if (!isAlreadyExists) {
                return NextResponse.json(
                    {
                        error: "Could not create webhook",
                        details: data.errors?.[0]?.message || data.message,
                        errors: data.errors,
                    },
                    { status: response.status }
                );
            }
        }

        let hookId = data?.id;

        if (!hookId && response.status === 422) {
            try {
                const listHooksRes = await fetch(
                    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: "application/vnd.github+json",
                            "X-GitHub-Api-Version": "2022-11-28",
                        },
                        cache: "no-store",
                    }
                );
                if (listHooksRes.ok) {
                    const hooksList = await listHooksRes.json();
                    const matchedHook = Array.isArray(hooksList)
                        ? hooksList.find((h) => h.config?.url === process.env.GITHUB_WEBHOOK_URL) || hooksList[0]
                        : null;
                    if (matchedHook?.id) {
                        hookId = matchedHook.id;
                    }
                }
            } catch (err) {
                console.error("Error retrieving existing webhook ID from GitHub:", err);
            }
        }

        const user =
            (await AIUser.findOne({ githubAccessToken: accessToken })) ||
            (await AIUser.findOne({ githubUsername: owner }));

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const repoUrl = clientRepoUrl || `https://github.com/${owner}/${repo}`;
        const finalRepoId = clientRepoId ? String(clientRepoId) : String(data?.id || repo);

        const repoExists = await SubscribedRepos.findOne({
            owner: user._id,
            $or: [
                { repoName: repo },
                { repoUrl: repoUrl },
                { repoId: finalRepoId }
            ]
        });

        if (!repoExists) {
            await SubscribedRepos.create({
                owner: user._id,
                repoName: repo,
                repoId: finalRepoId,
                repoUrl,
                hookId: hookId,
            });
        }

        return NextResponse.json({
            success: true,
            webhookId: hookId,
            alreadyConfigured: !response.ok,
            message: !response.ok
                ? "Webhook is already active on this repository"
                : "Webhook configured successfully",
        });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: "Internal Server error", statusText: false }, { status: 500 })
    }
}