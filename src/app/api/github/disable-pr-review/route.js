import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import dbConnect from "../../../../lib/dbconnect";
import SubscribedRepos from "../../../../models/SubscribedRepo";
import AIUser from "../../../../models/User";

export async function POST(req) {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        const accessToken = cookieStore.get("github_token")?.value;

        if (!accessToken) {
            return NextResponse.json(
                { message: "Connect GitHub first", statusText: false },
                { status: 401 }
            );
        }

        const body = await req.json().catch(() => ({}));
        const { owner, repo, hookId } = body;

        if (!owner || !repo) {
            return NextResponse.json(
                { message: "Invalid details provided", statusText: false },
                { status: 400 }
            );
        }

        const user =
            (await AIUser.findOne({ githubAccessToken: accessToken })) ||
            (await AIUser.findOne({ githubUsername: owner }));

        if (!user) {
            return NextResponse.json(
                { message: "User not found", statusText: false },
                { status: 404 }
            );
        }

        let targetHookId = hookId;
        if (!targetHookId) {
            const existingSubscription = await SubscribedRepos.findOne({
                owner: user._id,
                $or: [
                    { repoName: repo },
                    { repoUrl: `https://github.com/${owner}/${repo}` },
                ],
            });
            if (existingSubscription?.hookId) {
                targetHookId = existingSubscription.hookId;
            }
        }

        if (targetHookId) {
            try {
                const response = await axios.delete(
                    `https://api.github.com/repos/${owner}/${repo}/hooks/${targetHookId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: "application/vnd.github+json",
                            "X-GitHub-Api-Version": "2022-11-28",
                        },
                    }
                );
                console.log("Deleted GitHub webhook response status:", response.status);
            } catch (githubError) {
                if (githubError.response?.status !== 404) {
                    console.error(
                        "Error deleting GitHub webhook:",
                        githubError.response?.data || githubError.message
                    );
                }
            }
        }

        const deleteConditions = [
            { repoName: repo },
            { repoUrl: `https://github.com/${owner}/${repo}` },
        ];
        if (targetHookId) {
            deleteConditions.push({ hookId: Number(targetHookId) });
        }

        const deleted = await SubscribedRepos.findOneAndDelete({
            owner: user._id,
            $or: deleteConditions,
        });

        console.log("Removed from MongoDB SubscribedRepos:", deleted?._id);

        return NextResponse.json({
            message: "PR review disabled and webhook removed successfully",
            statusText: true,
            success: true,
        }, { status: 200 });

    } catch (error) {
        console.error("Error disabling PR review:", error);
        return NextResponse.json(
            { message: "Internal Server Error", statusText: false },
            { status: 500 }
        );
    }
}