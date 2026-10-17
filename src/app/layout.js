import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxProvider from "../providers/ReduxProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL;

export const viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Code Review | Automated GitHub Pull Request Reviewer",
    template: "%s | AI Code Review",
  },
  description:
    "Automate your code reviews with OpenAI. Connect GitHub repositories to instantly analyze unified PR diffs, detect risks, and post structured review comments.",
  keywords: [
    "AI code review",
    "automated code reviewer",
    "GitHub pull request review",
    "OpenAI code analysis",
    "PR review bot",
    "code quality",
    "vulnerability detection",
    "developer tools",
    "smart PR comments",
    "GitHub webhook review",
  ],
  authors: [{ name: "Utkarsh Singh", url: "https://github.com/iutkarsh077" }],
  creator: "Utkarsh Singh",
  publisher: "AI Code Review",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Code Review | Automated GitHub Pull Request Reviewer",
    description:
      "Automate your code reviews with OpenAI. Connect GitHub repositories to instantly analyze unified PR diffs, detect risks, and post structured review comments.",
    url: siteUrl,
    siteName: "AI Code Review",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Code Review | Automated GitHub Pull Request Reviewer",
    description:
      "Automate your code reviews with OpenAI. Connect GitHub repositories to instantly analyze unified PR diffs, detect risks, and post structured review comments.",
    creator: "@iutkarsh077",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      "name": "AI Code Review",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "All (Web-based, GitHub)",
      "description":
        "Automated AI-powered code review bot for GitHub Pull Requests. Scans unified code diffs, identifies security risks and edge cases, and posts structured review recommendations directly on GitHub PRs.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "Automated Pull Request Code Reviews",
        "Security, Bug & Edge Case Detection",
        "Actionable Recommendations & Refactoring Suggestions",
        "Instant GitHub Webhook Integration",
        "One-click Repository Review Toggle",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "AI Code Review",
      "url": siteUrl,
      "sameAs": ["https://github.com/iutkarsh077/ai-code-review"],
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is AI Code Review?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "AI Code Review is an intelligent developer tool that connects to your GitHub repositories via webhooks and automatically reviews every opened or updated Pull Request using OpenAI models.",
          },
        },
        {
          "@type": "Question",
          "name": "How does automated PR review work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "When a Pull Request is opened or synchronized, GitHub sends a webhook to the application. The system analyzes the unified diff, detects risks and code smells, and posts a structured 3-part review comment on the PR.",
          },
        },
        {
          "@type": "Question",
          "name": "What does each AI code review comment contain?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Each review is organized into three distinct sections: 1. What has been changed, 2. Potential risks and edge cases, and 3. Recommended code improvements.",
          },
        },
        {
          "@type": "Question",
          "name": "How do I subscribe a repository to AI Code Review?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Connect your GitHub account via OAuth, browse your repositories dashboard, and toggle the switch on any repository you wish to enable for automated AI code reviews.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
