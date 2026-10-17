import mongoose, { Schema } from "mongoose";

const ReviewLogSchema = new Schema(
    {
        repoName: {
            type: String,
            required: true,
            trim: true,
        },
        ownerLogin: {
            type: String,
            required: true,
            trim: true,
        },
        pullNumber: {
            type: Number,
            required: true,
        },
        pullTitle: {
            type: String,
            default: "Untitled Pull Request",
        },
        pullUrl: {
            type: String,
        },
        commentUrl: {
            type: String,
        },
        filesCount: {
            type: Number,
            default: 0,
        },
        modelUsed: {
            type: String,
            default: "gpt-4o-mini",
        },
        reviewComment: {
            type: String,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "AIUser",
        },
    },
    { timestamps: true }
);

const ReviewLog =
    mongoose.models.ReviewLog || mongoose.model("ReviewLog", ReviewLogSchema);

export default ReviewLog;
