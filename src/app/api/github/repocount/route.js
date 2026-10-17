import { cookies } from "next/headers";
import { NextResponse } from "next/server";


export async function GET() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get("github_token")?.value;

        if (!accessToken) {
            return NextResponse.json(
                { error: "GitHub Token missing" },
                { status: 401 }
            );
        }
        let totalRepos = 0;
        let page = 1;

        while (true) {
            const response = await fetch(
                `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100&page=${page}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch repositories");
            }

            const repos = await response.json();

            totalRepos += repos.length;

            if (repos.length < 100) {
                break;
            }

            page++;
        }

        return NextResponse.json({ count: totalRepos });
    } catch (error) {
        if (error?.digest?.startsWith("NEXT_") || error?.digest === "HANGING_PROMISE_REJECTION") {
            throw error;
        }
        console.log(error);
        return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }
}