import mongoose, { Schema } from "mongoose";

const SubscribedRepo = new Schema({
    repoName : {
        type:String,
        required:true,
        trim:true
    },

    repoUrl : {
        type:String,
        required:true,
        trim:true
    },

    repoId : {
        type:String,
        required:true,
        trim:true
    },

    owner : {
        type: Schema.Types.ObjectId,
        ref: "AIUser",
        required: true
    },

    hookId: {
        type: Number,
        required: true,
        trim: true
    }
}, { timestamps: true })

const SubscribedRepos =  mongoose.models.SubscribedRepository || mongoose.model("SubscribedRepository", SubscribedRepo);

export default SubscribedRepos;