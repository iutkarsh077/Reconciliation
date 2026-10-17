import SubscribedRepos from "../../../models/SubscribedRepo";
import dbConnect from "../../../lib/dbconnect";
import AIUser from "../../../models/User";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";


export async function GET(){
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const github_token = cookieStore.get("github_token");

        if(!github_token){
            return NextResponse.json({message: "Connect GitHub first" , statusText: false}, { status: 401 })
        }

        const user = await AIUser.findOne({
            githubAccessToken: github_token.value
        });

        if(!user){
            return NextResponse.json({message: "User not found" , statusText: false}, { status: 404 })
        }

        const subscribedRepo = await SubscribedRepos.find({
            owner: user._id
        }).select("repoName repoUrl repoId createdAt updatedAt hookId");

        return NextResponse.json({message: "Subscribed repositories fetched successfully" , statusText: true, subscribedRepo}, { status: 200 })
    } catch (error) {
        if (error?.digest?.startsWith("NEXT_") || error?.digest === "HANGING_PROMISE_REJECTION") {
            throw error;
        }
        console.log(error);
        return NextResponse.json({message: "Internal Server Error" , statusText: false}, { status: 500 })
    }
}