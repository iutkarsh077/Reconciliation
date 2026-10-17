"use client";

import axios from "axios";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { setGitHubRepos } from "../features/RepoSlice";
import { FaGithub } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const LANGUAGE_COLORS = {
    JavaScript: "#f7df1e",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Rust: "#dea584",
    Go: "#00ADD8",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Shell: "#89e051",
    Vue: "#41b883",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
};

function formatRelativeTime(dateString) {
    if (!dateString) return "";
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
        return "";
    }
}

const ListRepoPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const repos = useSelector((state) => state.repos?.repos) || [];

    const [activeTab, setActiveTab] = useState("repos"); // 'repos' | 'history'
    const [totalRepos, setTotalRepos] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibilityFilter, setVisibilityFilter] = useState("all");
    const [sortBy, setSortBy] = useState("updated");
    const [enabledRepos, setEnabledRepos] = useState({});
    const [subscribedRepos, setSubscribedRepos] = useState([]);
    const [showSubscribedOnly, setShowSubscribedOnly] = useState(false);

    // User & Session state
    const [user, setUser] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Review history state
    const [reviewHistory, setReviewHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);

    // Toast notification state
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => {
            setToast((current) => (current?.message === message ? null : current));
        }, 3500);
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await axios.post("/api/github/logout");
            router.push("/login");
        } catch {
            router.push("/login");
        }
    };

    const isSubscribedRepo = useCallback((repo) => {
        if (!repo) return false;
        if (enabledRepos[repo.id]) return true;
        if (!Array.isArray(subscribedRepos) || subscribedRepos.length === 0) return false;

        const repoIdStr = repo.id != null ? String(repo.id).trim() : "";
        const repoNameLower = repo.name ? String(repo.name).toLowerCase().trim() : "";
        const repoFullNameLower = repo.full_name ? String(repo.full_name).toLowerCase().trim() : "";
        const repoUrlNorm = repo.html_url ? String(repo.html_url).toLowerCase().trim().replace(/\/+$/, "") : "";

        return subscribedRepos.some((sub) => {
            if (!sub) return false;

            const subIdStr = sub.repoId != null ? String(sub.repoId).trim() : "";
            const subNameLower = sub.repoName ? String(sub.repoName).toLowerCase().trim() : "";
            const subUrlNorm = sub.repoUrl ? String(sub.repoUrl).toLowerCase().trim().replace(/\/+$/, "") : "";

            if (subIdStr && repoIdStr && subIdStr === repoIdStr) {
                return true;
            }

            if (subNameLower) {
                if (subNameLower === repoNameLower || subNameLower === repoFullNameLower) {
                    return true;
                }
                if (repoFullNameLower && repoFullNameLower.endsWith(`/${subNameLower}`)) {
                    return true;
                }
                if (subNameLower.includes("/") && repoNameLower) {
                    const subShort = subNameLower.split("/").pop();
                    if (subShort === repoNameLower) return true;
                }
            }

            if (subUrlNorm && repoUrlNorm && subUrlNorm === repoUrlNorm) {
                return true;
            }

            return false;
        });
    }, [enabledRepos, subscribedRepos]);

    const refreshSubscribed = useCallback(async () => {
        try {
            const response = await axios.get("/api/list-subscribed-repo");
            if (response.data && Array.isArray(response.data.subscribedRepo)) {
                setSubscribedRepos(response.data.subscribedRepo);
            }
        } catch {
            // Ignored
        }
    }, []);

    const toggleRepo = async (owner, repo, repoId, repoUrl, isCurrentlySubscribed, hookId) => {
        try {
            if (isCurrentlySubscribed) {
                await axios.post("/api/github/disable-pr-review", {
                    owner,
                    repo,
                    hookId: hookId || undefined,
                });
                setEnabledRepos((prev) => {
                    const next = { ...prev };
                    delete next[repoId];
                    return next;
                });
                showToast(`Disabled AI review for ${repo}`, "info");
            } else {
                await axios.post("/api/github/enable-pr-review", {
                    owner,
                    repo,
                    repoId,
                    repoUrl: repoUrl || `https://github.com/${owner}/${repo}`,
                });
                setEnabledRepos((prev) => ({
                    ...prev,
                    [repoId]: true,
                }));
                showToast(`Enabled AI review for ${repo}`, "success");
            }
            await refreshSubscribed();
        } catch (error) {
            showToast(
                error.response?.data?.error || "Failed to update review status",
                "error"
            );
        }
    };

    const handleRefreshRepos = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const countResponse = await axios.get("/api/github/repocount");
            setTotalRepos(countResponse.data?.count || 0);

            const repoResponse = await axios.post("/api/github/listgithubrepo", {
                page: currentPage,
                per_page: 100,
            });

            dispatch(setGitHubRepos(repoResponse.data?.repos || []));
            showToast("Repositories refreshed", "info");
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to load repositories. Please ensure you are authenticated."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await axios.get("/api/github/review-history");
            if (res.data?.success) {
                setReviewHistory(res.data.reviews || []);
                showToast("Review history refreshed", "info");
            }
        } catch (err) {
            console.error("Error refreshing review history:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Initial load: User profile and Subscribed Repositories
    useEffect(() => {
        let isMounted = true;
        axios
            .get("/api/github/user")
            .then((res) => {
                if (isMounted && res.data?.authenticated && res.data?.user) {
                    setUser(res.data.user);
                }
            })
            .catch(() => {});

        axios
            .get("/api/list-subscribed-repo")
            .then((res) => {
                if (isMounted && res.data && Array.isArray(res.data.subscribedRepo)) {
                    setSubscribedRepos(res.data.subscribedRepo);
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, []);

    // Load repositories on page change
    useEffect(() => {
        let isMounted = true;
        const loadRepos = async () => {
            try {
                const countRes = await axios.get("/api/github/repocount");
                if (isMounted) setTotalRepos(countRes.data?.count || 0);

                const repoRes = await axios.post("/api/github/listgithubrepo", {
                    page: currentPage,
                    per_page: 100,
                });

                if (isMounted) {
                    dispatch(setGitHubRepos(repoRes.data?.repos || []));
                    setIsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err.response?.data?.error ||
                        "Failed to load repositories. Please ensure you are authenticated."
                    );
                    setIsLoading(false);
                }
            }
        };

        loadRepos();
        return () => {
            isMounted = false;
        };
    }, [currentPage, dispatch]);

    // Load review history when tab switches
    useEffect(() => {
        if (activeTab !== "history") return;
        let isMounted = true;
        axios
            .get("/api/github/review-history")
            .then((res) => {
                if (isMounted && res.data?.success) {
                    setReviewHistory(res.data.reviews || []);
                }
            })
            .catch((err) => {
                console.error("Error loading review history:", err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingHistory(false);
            });

        return () => {
            isMounted = false;
        };
    }, [activeTab]);

    const filteredRepos = useMemo(() => {
        let result = [...repos];

        if (showSubscribedOnly) {
            result = result.filter((repo) => isSubscribedRepo(repo));

            if (Array.isArray(subscribedRepos) && subscribedRepos.length > 0) {
                const missingSubscribed = subscribedRepos.filter((sub) => {
                    const subIdStr = sub?.repoId != null ? String(sub.repoId).trim() : "";
                    const subNameLower = sub?.repoName ? String(sub.repoName).toLowerCase().trim() : "";
                    const subUrlNorm = sub?.repoUrl ? String(sub.repoUrl).toLowerCase().trim().replace(/\/+$/, "") : "";

                    return !repos.some((repo) => {
                        const repoIdStr = repo?.id != null ? String(repo.id).trim() : "";
                        const repoNameLower = repo?.name ? String(repo.name).toLowerCase().trim() : "";
                        const repoFullNameLower = repo?.full_name ? String(repo.full_name).toLowerCase().trim() : "";
                        const repoUrlNorm = repo?.html_url ? String(repo.html_url).toLowerCase().trim().replace(/\/+$/, "") : "";

                        return (
                            (subIdStr && repoIdStr && subIdStr === repoIdStr) ||
                            (subNameLower && (subNameLower === repoNameLower || subNameLower === repoFullNameLower)) ||
                            (subUrlNorm && repoUrlNorm && subUrlNorm === repoUrlNorm)
                        );
                    });
                });

                if (missingSubscribed.length > 0) {
                    const extraCards = missingSubscribed.map((sub) => {
                        const ownerLogin = sub.repoUrl ? sub.repoUrl.split("/")[3] || "user" : "user";
                        return {
                            id: sub.repoId || sub._id || sub.repoName,
                            name: sub.repoName,
                            full_name: sub.repoName.includes("/") ? sub.repoName : `${ownerLogin}/${sub.repoName}`,
                            html_url: sub.repoUrl || `https://github.com/${ownerLogin}/${sub.repoName}`,
                            description: "Subscribed Repository (AI PR Review Active)",
                            private: false,
                            owner: { login: ownerLogin },
                            updated_at: sub.updatedAt || new Date().toISOString(),
                            stargazers_count: 0,
                        };
                    });
                    result = [...result, ...extraCards];
                }
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (repo) =>
                    repo.name.toLowerCase().includes(query) ||
                    (repo.description && repo.description.toLowerCase().includes(query)) ||
                    (repo.language && repo.language.toLowerCase().includes(query))
            );
        }

        if (visibilityFilter === "public") {
            result = result.filter((repo) => !repo.private);
        } else if (visibilityFilter === "private") {
            result = result.filter((repo) => repo.private);
        }

        result.sort((a, b) => {
            if (sortBy === "stars") {
                return (b.stargazers_count || 0) - (a.stargazers_count || 0);
            }
            if (sortBy === "name") {
                return a.name.localeCompare(b.name);
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        return result;
    }, [repos, subscribedRepos, showSubscribedOnly, isSubscribedRepo, searchQuery, visibilityFilter, sortBy]);

    const totalPages = Math.ceil(totalRepos / 100) || 1;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans relative">
            {/* Toast Notification Banner */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                        toast.type === "success"
                            ? "bg-emerald-950/90 border-emerald-700/60 text-emerald-200"
                            : toast.type === "error"
                            ? "bg-red-950/90 border-red-700/60 text-red-200"
                            : "bg-blue-950/90 border-blue-700/60 text-blue-200"
                    }`}
                >
                    <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                    <span>{toast.message}</span>
                    <button
                        onClick={() => setToast(null)}
                        className="ml-2 text-zinc-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800/80">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
                                <FaGithub className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    AI Code Review
                                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        Pro
                                    </span>
                                </h1>
                                <p className="text-sm text-zinc-400">
                                    Intelligent, automated Pull Request analysis powered by OpenAI
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* User Profile Pill */}
                        {user && (
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
                                {user.avatar ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={user.avatar}
                                        alt={user.name || user.username}
                                        className="w-5 h-5 rounded-full border border-zinc-700 object-cover"
                                    />
                                ) : (
                                    <span className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px]">
                                        {user.username?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <span className="font-medium text-zinc-200">
                                    {user.name || `@${user.username}`}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-300 border border-zinc-800 hover:border-red-900/50 transition cursor-pointer disabled:opacity-50"
                            title="Sign out of GitHub"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {isLoggingOut ? "Signing out..." : "Sign Out"}
                        </button>
                    </div>
                </header>

                {/* Primary Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-zinc-800">
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setActiveTab("repos")}
                            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                                activeTab === "repos"
                                    ? "border-blue-500 text-white"
                                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <span>Repositories</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                                {totalRepos}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("history")}
                            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                                activeTab === "history"
                                    ? "border-blue-500 text-white"
                                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <span>Review History</span>
                            {reviewHistory.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {reviewHistory.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === "repos" ? (
                        <button
                            onClick={handleRefreshRepos}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition disabled:opacity-50 cursor-pointer mb-2"
                            title="Refresh repositories"
                        >
                            <svg
                                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Refresh
                        </button>
                    ) : (
                        <button
                            onClick={handleRefreshHistory}
                            disabled={isLoadingHistory}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition disabled:opacity-50 cursor-pointer mb-2"
                            title="Refresh review history"
                        >
                            <svg
                                className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Refresh History
                        </button>
                    )}
                </div>

                {/* TAB 1: REPOSITORIES VIEW */}
                {activeTab === "repos" && (
                    <div className="space-y-6">
                        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <svg
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Find a repository..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    onClick={() => setShowSubscribedOnly((prev) => !prev)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition cursor-pointer flex items-center gap-2 ${
                                        showSubscribedOnly
                                            ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700"
                                            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                                    }`}
                                >
                                    <span>Subscribed Repositories</span>
                                    {Array.isArray(subscribedRepos) && subscribedRepos.length > 0 && (
                                        <span
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                                showSubscribedOnly ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-300"
                                            }`}
                                        >
                                            {subscribedRepos.length}
                                        </span>
                                    )}
                                </button>

                                <div className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
                                    {["all", "public", "private"].map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => {
                                                setVisibilityFilter(filter);
                                                if (filter === "all") {
                                                    setShowSubscribedOnly(false);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-md font-medium capitalize transition cursor-pointer ${
                                                visibilityFilter === filter && (!showSubscribedOnly || filter !== "all")
                                                    ? "bg-zinc-800 text-white shadow-sm"
                                                    : "text-zinc-400 hover:text-zinc-200"
                                            }`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-pointer"
                                >
                                    <option value="updated">Recently Updated</option>
                                    <option value="stars">Most Stars</option>
                                    <option value="name">Name (A-Z)</option>
                                </select>
                            </div>
                        </section>

                        {showSubscribedOnly && (
                            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    <span>
                                        Showing <strong>{filteredRepos.length}</strong> subscribed {filteredRepos.length === 1 ? "repository" : "repositories"}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowSubscribedOnly(false)}
                                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                                >
                                    Show all repositories
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm">{error}</span>
                                </div>
                                <button
                                    onClick={handleRefreshRepos}
                                    className="text-xs font-semibold px-3 py-1 bg-red-900/60 hover:bg-red-800/60 text-red-100 rounded-md transition"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-44 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-5 flex flex-col justify-between animate-pulse"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                                                <div className="h-4 bg-zinc-800 rounded-full w-14"></div>
                                            </div>
                                            <div className="h-3 bg-zinc-800/60 rounded w-5/6"></div>
                                            <div className="h-3 bg-zinc-800/40 rounded w-2/3"></div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
                                            <div className="h-3 bg-zinc-800 rounded w-20"></div>
                                            <div className="h-3 bg-zinc-800 rounded w-12"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredRepos.length === 0 ? (
                            <div className="text-center py-16 px-4 rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-800">
                                <div className="inline-flex p-3 rounded-full bg-zinc-900 text-zinc-500 mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-zinc-200">
                                    {showSubscribedOnly ? "No subscribed repositories yet" : "No repositories found"}
                                </h3>
                                <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
                                    {showSubscribedOnly
                                        ? "You have not enabled review on any repositories yet. Toggle on any repository to subscribe."
                                        : searchQuery
                                        ? `No repository matches "${searchQuery}". Try a different keyword.`
                                        : "No repositories are available under the selected filter."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRepos.map((repo) => {
                                    const langColor =
                                        (repo.language && LANGUAGE_COLORS[repo.language]) || "#71717a";

                                    const isSubscribed = isSubscribedRepo(repo);
                                    const matchingSub = Array.isArray(subscribedRepos)
                                        ? subscribedRepos.find((sub) => {
                                            const subIdStr = sub.repoId != null ? String(sub.repoId).trim() : "";
                                            const subNameLower = sub.repoName ? String(sub.repoName).toLowerCase().trim() : "";
                                            const subUrlNorm = sub.repoUrl ? String(sub.repoUrl).toLowerCase().trim().replace(/\/+$/, "") : "";
                                            const repoIdStr = repo.id != null ? String(repo.id).trim() : "";
                                            const repoNameLower = repo.name ? String(repo.name).toLowerCase().trim() : "";
                                            const repoFullNameLower = repo.full_name ? String(repo.full_name).toLowerCase().trim() : "";
                                            const repoUrlNorm = repo.html_url ? String(repo.html_url).toLowerCase().trim().replace(/\/+$/, "") : "";

                                            return (
                                                (subIdStr && repoIdStr && subIdStr === repoIdStr) ||
                                                (subNameLower && (subNameLower === repoNameLower || subNameLower === repoFullNameLower)) ||
                                                (subUrlNorm && repoUrlNorm && subUrlNorm === repoUrlNorm)
                                            );
                                        })
                                        : null;

                                    return (
                                        <div
                                            key={repo.id}
                                            className="group relative flex flex-col justify-between rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/50"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <Link
                                                        href={repo.html_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-base font-semibold text-zinc-100 hover:text-blue-400 group-hover:underline flex items-center gap-1.5 transition break-all"
                                                    >
                                                        {repo.name}
                                                        <svg
                                                            className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-zinc-400 shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                            />
                                                        </svg>
                                                    </Link>

                                                    <div className="flex items-center gap-2.5 shrink-0">
                                                        <span
                                                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${repo.private
                                                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                }`}
                                                        >
                                                            {repo.private ? "Private" : "Public"}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={isSubscribed}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleRepo(
                                                                    repo.owner?.login || repo.full_name?.split("/")[0],
                                                                    repo.name,
                                                                    repo.id,
                                                                    repo.html_url,
                                                                    isSubscribed,
                                                                    matchingSub?.hookId
                                                                );
                                                            }}
                                                            title={isSubscribed ? "Deactivate" : "Activate"}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                                                                isSubscribed ? "bg-blue-600" : "bg-zinc-700 hover:bg-zinc-600"
                                                            }`}
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                    isSubscribed ? "translate-x-4" : "translate-x-0"
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-zinc-400 line-clamp-2 min-h-[2rem] leading-relaxed">
                                                    {repo.description || "No description provided"}
                                                </p>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                                                <div className="flex items-center gap-3">
                                                    {repo.language && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full"
                                                                style={{ backgroundColor: langColor }}
                                                            />
                                                            <span>{repo.language}</span>
                                                        </div>
                                                    )}

                                                    {repo.stargazers_count > 0 && (
                                                        <div className="flex items-center gap-1 hover:text-zinc-200">
                                                            <svg
                                                                className="w-3.5 h-3.5 text-zinc-400"
                                                                fill="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                                            </svg>
                                                            <span>{repo.stargazers_count}</span>
                                                        </div>
                                                    )}

                                                    {repo.forks_count > 0 && (
                                                        <div className="flex items-center gap-1 hover:text-zinc-200">
                                                            <svg
                                                                className="w-3.5 h-3.5 text-zinc-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M8 7v8a2 2 0 002 2h4M8 7a2 2 0 100-4 2 2 0 000 4zm8 8a2 2 0 100-4 2 2 0 000 4zm0-8a2 2 0 100-4 2 2 0 000 4z"
                                                                />
                                                            </svg>
                                                            <span>{repo.forks_count}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <span className="text-[11px] text-zinc-500">
                                                    {formatRelativeTime(repo.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <footer className="flex items-center justify-between pt-6 border-t border-zinc-800 text-xs text-zinc-400">
                                <span>
                                    Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                                </span>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1 || isLoading}
                                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || isLoading}
                                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </footer>
                        )}
                    </div>
                )}

                {/* TAB 2: REVIEW HISTORY VIEW */}
                {activeTab === "history" && (
                    <div className="space-y-6">
                        {isLoadingHistory ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-28 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-5 flex flex-col justify-between animate-pulse"
                                    >
                                        <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
                                        <div className="h-3 bg-zinc-800/60 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : reviewHistory.length === 0 ? (
                            <div className="text-center py-20 px-4 rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-800">
                                <div className="inline-flex p-3 rounded-full bg-zinc-900 text-zinc-500 mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-zinc-200">
                                    No reviews executed yet
                                </h3>
                                <p className="text-sm text-zinc-500 max-w-md mx-auto mt-1">
                                    Enable AI review on any repository in the Repositories tab. Whenever someone opens or updates a Pull Request, the AI code review will automatically execute and appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviewHistory.map((rev) => (
                                    <div
                                        key={rev._id}
                                        className="rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-white text-sm">
                                                    {rev.repoName}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                                    #{rev.pullNumber}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    {formatRelativeTime(rev.createdAt)}
                                                </span>
                                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                                    {rev.modelUsed || "gpt-4o-mini"}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-medium text-zinc-200 truncate">
                                                {rev.pullTitle}
                                            </h4>

                                            <div className="flex items-center gap-4 text-xs text-zinc-400">
                                                <span>
                                                    Files evaluated: <strong>{rev.filesCount}</strong>
                                                </span>
                                                {rev.commentUrl && (
                                                    <span className="text-emerald-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        Review Comment Posted
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            {rev.reviewComment && (
                                                <button
                                                    onClick={() => setSelectedReview(rev)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
                                                >
                                                    View Critique
                                                </button>
                                            )}

                                            {rev.commentUrl && (
                                                <Link
                                                    href={rev.commentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
                                                >
                                                    <span>Open on GitHub</span>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </Link>
                                            )}

                                            {rev.pullUrl && !rev.commentUrl && (
                                                <Link
                                                    href={rev.pullUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                                                >
                                                    <span>View PR</span>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal for viewing detailed AI critique */}
            {selectedReview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedReview(null)}
                >
                    <div
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>AI Code Review Critique</span>
                                    <span className="text-xs font-normal text-zinc-400">
                                        ({selectedReview.repoName} #{selectedReview.pullNumber})
                                    </span>
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                                    {selectedReview.pullTitle}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReview(null)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap bg-zinc-950/60">
                            {selectedReview.reviewComment}
                        </div>

                        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 bg-zinc-900">
                            <span>
                                Model: <strong>{selectedReview.modelUsed}</strong> • Files evaluated: <strong>{selectedReview.filesCount}</strong>
                            </span>
                            {selectedReview.commentUrl && (
                                <Link
                                    href={selectedReview.commentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline"
                                >
                                    View comment on GitHub →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListRepoPage;