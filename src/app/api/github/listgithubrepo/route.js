import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";


export async function POST(req) {
    try {
        const cookieStore = await cookies();
        const gitToken = cookieStore.get("github_token")?.value;
        const body = await req.json().catch(() => ({}));
        const page = body.page || 1;
        const per_page = body.per_page || 100;

        console.log(page, per_page);

        if (!gitToken) {
            return NextResponse.json(
                { error: "GitHub Token missing" },
                { status: 401 }
            );
        }

        const response = await axios.get(
            `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=${per_page}&page=${page}`,
            {
                headers: {
                    Authorization: `Bearer ${gitToken}`,
                    Accept: "application/vnd.github+json",
                },
            }
        );

        return NextResponse.json({ repos: response.data });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch repositories" },
            { status: 500 }
        );
    }
}