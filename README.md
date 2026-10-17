# AI Code Review

Automated code review system for GitHub pull requests powered by Next.js, MongoDB, and OpenAI.

<p align="center">
  <img src="https://res.cloudinary.com/dakddv1pm/image/upload/v1792238919/posts/bwfcjiynxhfvnkqmkggy.png" alt="AI Code Review" width="100%" />
</p>

This project follows the **ASD-STE100** (Simplified Technical English) documentation standard to ensure clear, simple, and unambiguous instructions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Installation and Setup](#installation-and-setup)
7. [Local Webhook Configuration](#local-webhook-configuration)
8. [How the Review Works](#how-the-review-works)
9. [Project Directory Structure](#project-directory-structure)
10. [License](#license)

---

## 1. Project Overview

AI Code Review connects to your GitHub account and monitors pull requests. When a developer creates or updates a pull request, the system automatically:

1. Downloads the code differences and changed files.
2. Analyzes the changes using an OpenAI model.
3. Posts a detailed review comment directly to the pull request.

Each review contains three standard sections:
- **What Has Been Changed**: Summary of modified features and logic.
- **Potential Risks & Edge Cases**: Identification of bugs, security risks, or breaking changes.
- **Recommended Improvements**: Clear suggestions and refactored code snippets.

---

## 2. Key Features

- **GitHub OAuth Login**: Fast, secure connection with repository permissions.
- **Repository Dashboard**: Displays all user repositories with search, sorting, and visibility filters.
- **One-Click Toggle**: Enable or disable AI reviews per repository instantly.
- **Automated Webhooks**: Creates and removes GitHub webhooks automatically.
- **Diff & Context Analysis**: Inspects both git diffs and full file source code.
- **Structured AI Comments**: Posts formatted Markdown comments on GitHub pull requests.
- **Secure Webhook Verification**: Verifies incoming payloads using HMAC SHA-256 signatures.

---

## 3. Technology Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose ORM
- **State Management**: Redux Toolkit
- **AI Engine**: OpenAI API (`gpt-5.4-mini` / configurable)
- **API Client**: Axios

---

## 4. Prerequisites

Before you start, make sure you have:

- **Node.js**: Version 18.18.0 or newer.
- **npm**: Version 9.0.0 or newer.
- **MongoDB**: A running MongoDB instance or MongoDB Atlas connection string.
- **GitHub OAuth App**: Client ID and Client Secret from [GitHub Developer Settings](https://github.com/settings/developers).
- **OpenAI API Key**: Valid API key from [OpenAI Platform](https://platform.openai.com).
- **Ngrok** (optional for local testing): To expose your local server to GitHub webhooks.

---

## 5. Environment Variables

Create a `.env` file in the root directory. Add the following variables:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `MONGO_URI` | MongoDB connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | `6b19ac...` |
| `GITHUB_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/api/github/callback` |
| `GITHUB_WEBHOOK_URL` | Public webhook URL for GitHub events | `https://your-domain.ngrok-free.app/api/github/webhook` |
| `GITHUB_WEBHOOK_SECRET` | Secret token to sign webhook payloads | `your_random_secret_string` |
| `OPENAI_API_KEY` | OpenAI API Secret Key | `sk-proj-...` |
| `OPENAI_MODEL` | OpenAI Model Name (optional) | `gpt-5.4-mini` |
| `NEXT_PUBLIC_APP_URL` | Application root URL | `http://localhost:3000` |

---

## 6. Installation and Setup

Follow these steps to install and start the application locally:

### Step 1: Clone the repository

```bash
git clone https://github.com/iutkarsh077/ai-code-review.git
cd ai-code-review
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Create the `.env` file and populate all variables listed in section 5.

### Step 4: Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 7. Local Webhook Configuration

GitHub needs a public URL to send webhook events to your local machine.

### Step 1: Start Ngrok tunnel

In a separate terminal window, run:

```bash
ngrok http 3000
```

### Step 2: Update the webhook URL

Copy the `https://...ngrok-free.app` forwarding URL and update your `.env` file:

```env
GITHUB_WEBHOOK_URL=https://your-id.ngrok-free.app/api/github/webhook
```

Restart your Next.js server so it reads the updated URL.

---

## 8. How the Review Works

```
1. Developer opens or updates PR on GitHub
                │
                ▼
2. GitHub sends webhook event to /api/github/webhook
                │
                ▼
3. Server validates HMAC SHA-256 signature
                │
                ▼
4. Server fetches unified git diff and changed files
                │
                ▼
5. Server sends prompt and code context to OpenAI
                │
                ▼
6. Server receives 3-part structured review
                │
                ▼
7. Server posts review comment directly to the GitHub PR
```

---

## 9. Project Directory Structure

```
ai-code-review/
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router routes
│   │   ├── (auth)/login/   # Login page
│   │   ├── api/github/     # GitHub OAuth and webhook endpoints
│   │   │   ├── callback/   # OAuth callback handler
│   │   │   ├── disable-pr-review/ # Deletes webhook and subscription
│   │   │   ├── enable-pr-review/  # Creates webhook and subscription
│   │   │   ├── listgithubrepo/    # Fetches repositories from GitHub
│   │   │   ├── login/      # Redirects to GitHub OAuth
│   │   │   ├── repocount/  # Returns total repository count
│   │   │   └── webhook/    # Receives PR events and posts AI reviews
│   │   ├── layout.js       # Root layout with SEO and JSON-LD schemas
│   │   ├── page.js         # Main repositories dashboard
│   │   ├── not-found.jsx   # 404 Not Found page
│   │   ├── manifest.js     # Web app manifest
│   │   ├── robots.js       # Search engine crawler directives
│   │   └── sitemap.js      # Sitemap index
│   ├── components/         # React UI components
│   │   ├── GithubConnect.jsx # Login and connection landing card
│   │   └── ListRepos.jsx     # Repository list and review toggles
│   ├── features/           # Redux slices
│   ├── lib/                # Database connection utilities
│   ├── models/             # Mongoose schemas (AIUser, SubscribedRepo)
│   ├── providers/          # Redux provider wrapper
│   ├── proxy.js            # Route protection proxy (Next.js 16)
│   └── store/              # Redux store configuration
├── .env                    # Environment variables (private)
├── technical-blog.md       # Technical explanation of the review pipeline
└── README.md               # Project documentation
```

---

