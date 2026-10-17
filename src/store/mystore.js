import { configureStore } from "@reduxjs/toolkit";
import RepoReducer from "../features/RepoSlice"


export const store = configureStore({
    reducer: {
        repos: RepoReducer,
    }
})