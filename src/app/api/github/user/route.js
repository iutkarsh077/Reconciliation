import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "../../../../lib/dbconnect";
import AIUser from "../../../../models/User";
import axios from "axios";


export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json(
                { authenticated: false, error: "Not authenticated" },
                { status: 401 }
            );
        }

        await dbConnect();
        const user = await AIUser.findOne({ githubAccessToken: token });

        if (user) {
            return NextResponse.json({
                authenticated: true,
                user: {
                    name: user.name,
                    username: user.githubUsername,
                    avatar: user.avatar,
                    email: user.email,
                },
            });
        }

        // Fallback: Fetch directly from GitHub API if DB record not matched yet
        try {
            const ghRes = await axios.get("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github+json",
                },
            });

            return NextResponse.json({
                authenticated: true,
                user: {
                    name: ghRes.data.name || ghRes.data.login,
                    username: ghRes.data.login,
                    avatar: ghRes.data.avatar_url,
                    email: ghRes.data.email,
                },
            });
        } catch {
            return NextResponse.json(
                { authenticated: false, error: "User session expired" },
                { status: 401 }
            );
        }
    } catch (error) {
        if (error?.digest?.startsWith("NEXT_") || error?.digest === "HANGING_PROMISE_REJECTION") {
            throw error;
        }
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch user profile" },
            { status: 500 }
        );
    }
}
