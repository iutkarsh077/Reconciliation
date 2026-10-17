import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: "Logged out successfully",
    });

    response.cookies.delete("github_token");
    response.cookies.delete("github_oauth_state");

    return response;
}
