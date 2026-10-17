import axios from "axios";
import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbconnect";
import AIUser from "../../../../models/User";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const savedState = request.cookies.get(
            "github_oauth_state"
        )?.value;

        if (!code || !state || !savedState || state !== savedState) {
            return NextResponse.json(
                { error: "Invalid OAuth callback" },
                { status: 400 }
            );
        }

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;

        const tokenResponse = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: clientId,
                client_secret: clientSecret,
                code,
            },
            {
                headers: {
                    Accept: "application/json",
                },
            }
        );

        const tokenData = tokenResponse.data;

        if (!tokenData || tokenData.error || !tokenData.access_token) {
            console.error("GitHub OAuth error:", tokenData);
            const errorReason = tokenData?.error || "token_exchange";
            const response = NextResponse.redirect(
                new URL(`/?github_error=${encodeURIComponent(errorReason)}`, request.url)
            );
            response.cookies.delete("github_oauth_state");
            return response;
        }

        await dbConnect();


        console.log("token data is: ", tokenData)
        const userProfileRes = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: "application/vnd.github+json",
            },
        });
        const profile = userProfileRes.data;
        console.log("user profile res: ", userProfileRes)

        let email = profile.email;
        if (!email) {
            try {
                const emailsRes = await axios.get("https://api.github.com/user/emails", {
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                        Accept: "application/vnd.github+json",
                    },
                });
                const primary = emailsRes.data?.find((e) => e.primary && e.verified) || emailsRes.data?.[0];
                email = primary?.email;
            } catch (err) {
                console.warn("Could not fetch user emails:", err.message);
            }
        }

        console.log("email is: ", email)
        if (!email) {
            email = `${profile.login}@users.noreply.github.com`;
        }

        await AIUser.findOneAndUpdate(
            { githubId: profile.id },
            {
                name: profile.name || profile.login,
                email,
                avatar: profile.avatar_url || "",
                githubId: profile.id,
                githubUsername: profile.login,
                githubAccessToken: tokenData.access_token,
                githubRefreshToken: tokenData.refresh_token || "",
            },
            { upsert: true, new: true }
        );

        const response = NextResponse.redirect(new URL("/", request.url));

        response.cookies.set("github_token", tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60,
        });

        response.cookies.delete("github_oauth_state");

        return response;
    } catch (error) {
        console.log("dbc onnection: ", error);
        return NextResponse.json({ message: "Internal Server error", statusText: false }, { status: 500 })
    }
}