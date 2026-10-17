import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    repos: [],
    isLoading: false,
    error: null,
}


const Repo = createSlice({
    name: "RepoList",
    initialState,
    reducers: {
        setGitHubRepos: (state, action) => {
            state.repos = action.payload;
            state.isLoading = false;
            state.error = null;
        }
    }
})


export const { setGitHubRepos } = Repo.actions
export default Repo.reducer