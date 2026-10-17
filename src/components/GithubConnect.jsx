"use client";

import { useState } from "react";
import { FaGithub, FaBolt, FaShieldAlt, FaLightbulb, FaArrowRight } from "react-icons/fa";

const GithubConnect = () => {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = () => {
        setIsConnecting(true);
        window.location.href = "/api/github/login";
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-500/30">
            <div
                aria-hidden="true"
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-purple-600/15 rounded-full blur-3xl pointer-events-none"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
            />

            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"
            />

            <div className="relative z-10 max-w-md w-full">
                <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800/80 p-8 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-300 hover:border-zinc-700/80">
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="relative mb-5 group">
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-60 blur-md group-hover:opacity-100 transition duration-300" />
                            <div className="relative p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-xl flex items-center justify-center">
                                <FaGithub className="w-9 h-9" />
                            </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            AI-Powered Pull Request Reviews
                        </span>

                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Connect with GitHub
                        </h1>

                        <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed">
                            Supercharge your repository workflow. Get intelligent, automated code reviews right inside your pull requests.
                        </p>
                    </div>

                    <div className="mt-7 space-y-3 pt-6 border-t border-zinc-800/80">
                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                                <FaBolt className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-semibold text-zinc-200">
                                    Instant Automated Analysis
                                </h2>
                                <p className="text-[11px] text-zinc-400 leading-normal">
                                    Analyzes code diffs automatically on every PR open or push.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                                <FaShieldAlt className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-semibold text-zinc-200">
                                    Risk & Bug Detection
                                </h2>
                                <p className="text-[11px] text-zinc-400 leading-normal">
                                    Catches edge cases, security flaws, and regression risks early.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                                <FaLightbulb className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-semibold text-zinc-200">
                                    Actionable Recommendations
                                </h2>
                                <p className="text-[11px] text-zinc-400 leading-normal">
                                    Actionable suggestions formatted as clean PR comments.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-7">
                        <button
                            type="button"
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="w-full relative group cursor-pointer inline-flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-semibold text-sm bg-white text-zinc-950 hover:bg-zinc-200 transition-all duration-200 shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isConnecting ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-950"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        />
                                    </svg>
                                    <span>Connecting to GitHub...</span>
                                </>
                            ) : (
                                <>
                                    <FaGithub className="w-5 h-5" />
                                    <span>Continue with GitHub</span>
                                    <FaArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 text-zinc-600" />
                                </>
                            )}
                        </button>
                    </div>

                  
                </div>

               
            </div>
        </main>
    );
};

export default GithubConnect;