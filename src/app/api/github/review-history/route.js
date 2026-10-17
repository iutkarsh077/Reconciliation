import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "../../../../lib/dbconnect";
import AIUser from "../../../../models/User";
import ReviewLog from "../../../../models/ReviewLog";


export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("github_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Not authenticated" },
                { status: 401 }
            );
        }

        await dbConnect();
        const user = await AIUser.findOne({ githubAccessToken: token });

        const filter = user
            ? {
                  $or: [
                      { owner: user._id },
                      { ownerLogin: user.githubUsername },
                  ],
              }
            : {};

        const reviews = await ReviewLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json({
            success: true,
            reviews,
        });
    } catch (error) {
        if (error?.digest?.startsWith("NEXT_") || error?.digest === "HANGING_PROMISE_REJECTION") {
            throw error;
        }
        console.error("Error fetching review history:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch review history" },
            { status: 500 }
        );
    }
}
