import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";


export async function GET() {
    try {
        const clientId = process.env.GITHUB_CLIENT_ID;

        const state = randomBytes(32).toString("hex");

        const url = new URL("https://github.com/login/oauth/authorize");

        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`);
        url.searchParams.set("scope", "repo read:user user:email");
        url.searchParams.set("state", state);

        const response = NextResponse.redirect(url);

        response.cookies.set("github_oauth_state", state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 600,
        });

        return response;

    } catch (error) {
        if (error?.digest?.startsWith("NEXT_") || error?.digest === "HANGING_PROMISE_REJECTION") {
            throw error;
        }
        console.log(error)
        return NextResponse.json({ message: "Internal Server error", statusText: false }, { status: 500 })
    }
}