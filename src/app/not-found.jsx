import Link from "next/link";
import { FaGithub } from "react-icons/fa";

export const metadata = {
  title: "404 - Page Not Found | AI Code Review",
  description: "The page you are looking for does not exist or has been moved.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 relative overflow-hidden font-sans">
      {/* Background ambient glow effects */}
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        {/* Brand / Logo */}
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/40">
          <FaGithub className="w-8 h-8 text-white" />
        </div>

        {/* 404 Visual badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            404 Error
          </span>
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist, has been removed, or requires authentication.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-zinc-950 hover:bg-zinc-200 shadow-md transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Return to Dashboard
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            Go to Login
          </Link>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-zinc-900 text-xs text-zinc-600">
          AI Code Review • Automated GitHub Pull Request Reviews
        </div>
      </div>
    </main>
  );
}
