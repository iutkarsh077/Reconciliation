import mongoose, { Schema } from "mongoose";

const User = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    avatar: {
        type: String,
        required: false,
        trim: true
    },
    githubId: {
        type: Number,
        required: true,
        unique: true,
    },
    githubUsername: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    githubAccessToken: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    githubRefreshToken: {
        type: String,
        required: false,
        trim: true
    }
}, { timestamps: true })

const AIUser = mongoose.models.AIUser || mongoose.model("AIUser", User);

export default AIUser;