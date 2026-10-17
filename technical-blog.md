# How the AI Code Review System Works

This document explains how the AI Code Review application reviews GitHub pull requests automatically.

---

## 1. Overview

The AI Code Review application connects to GitHub. It monitors pull requests in your repositories. When a developer opens or updates a pull request, the system executes these tasks:

1. Receives a webhook notification from GitHub.
2. Validates the security signature of the webhook.
3. Downloads the pull request code changes (diffs and file contents).
4. Sends the code changes to the OpenAI model for analysis.
5. Posts a structured review comment directly to the pull request on GitHub.

```
+---------------+        +----------------------+        +-------------------+
|               |        |                      |        |                   |
|  GitHub PR    | -----> |   Next.js Server     | -----> |    OpenAI API     |
|  (Webhook)    |        |   (Webhook Handler)  |        |    (Analysis)     |
|               |        |                      |        |                   |
+---------------+        +----------------------+        +-------------------+
        ^                           |                              |
        |                           |                              |
        +---------------------------+------------------------------+
                    Posts Review Comment to PR
```

---

## 2. System Architecture

The application contains five primary components:

- **Next.js Web Application**: Provides the user interface to browse repositories and toggle review settings.
- **GitHub OAuth Service**: Authenticates users and stores access tokens.
- **MongoDB Database**: Stores user accounts and subscribed repositories.
- **GitHub Webhook Handler**: Receives event payloads from GitHub.
- **OpenAI Engine**: Analyzes code diffs and writes structured review recommendations.

---

## 3. Step-by-Step Technical Workflow

### Step 1: User Connection and Repository Setup

1. The user opens the login page and clicks **Continue with GitHub**.
2. GitHub authenticates the user with OAuth 2.0.
3. The callback endpoint (`/api/github/callback`) receives the authorization code.
4. The system exchanges the code for a GitHub access token.
5. The system stores the user data and access token in MongoDB (`AIUser` collection).
6. When the user toggles a repository switch on the dashboard, the system calls `/api/github/enable-pr-review`.
7. This endpoint creates a webhook in the GitHub repository. The webhook listens for `pull_request` events.

---

### Step 2: Webhook Delivery and Security Validation

When a pull request event occurs, GitHub sends an HTTP `POST` request to `/api/github/webhook`.

1. **Read Secret Signature**: GitHub sends an `x-hub-signature-256` header.
2. **Compute HMAC Digest**: The server calculates an HMAC SHA-256 hash of the raw request body using `GITHUB_WEBHOOK_SECRET`.
3. **Compare Signatures**:
   - If the signatures match, the request continues.
   - If the signatures do not match, the server returns an HTTP `401 Unauthorized` status.
4. **Filter Actions**: The server only processes these pull request actions:
   - `opened`
   - `reopened`
   - `synchronize` (new commit pushed to the pull request)

All other actions are ignored to prevent unnecessary operations.

---

### Step 3: Fetching Code Changes and Context

To give accurate reviews, the AI needs both the patch diff and the full file context.

1. **Find User Access Token**:
   - The server finds the repository owner in MongoDB.
   - It retrieves the stored GitHub access token.
2. **Download Unified Diff**:
   - The server requests the pull request diff with header `Accept: application/vnd.github.diff`.
3. **List Changed Files**:
   - The server requests the file list from `/repos/{owner}/{repo}/pulls/{number}/files`.
4. **Fetch Full File Source Code**:
   - For modified and added files, the server downloads raw file contents at the pull request commit SHA (`headSha`).
   - Large files are limited to 3,500 characters to stay within model token limits.

---

### Step 4: AI Code Analysis with OpenAI

The system formats all file diffs and source code snippets into a structured prompt.

The AI assistant reviews the code and divides the report into three strict sections:

1. **`1. 🔍 What Has Been Changed`**:
   - Lists all functional and architectural changes clearly.
2. **`2. ⚠️ Potential Risks & Edge Cases`**:
   - Identifies security vulnerabilities, breaking changes, memory leaks, or unhandled errors.
3. **`3. 💡 Recommended Improvements`**:
   - Provides concrete code refactoring suggestions and best practices.

The model runs with a low temperature setting (`temperature: 0.2`) to produce consistent and factual reviews.

---

### Step 5: Publishing the Review to GitHub

1. The server receives the completed review text from OpenAI.
2. It sends an HTTP `POST` request to:
   ```
   https://api.github.com/repos/{owner}/{repo}/issues/{pullNumber}/comments
   ```
3. The review appears immediately as a comment in the pull request conversation.
4. Developers can read the review, discuss points, and make updates.

---

## 4. Error Handling and Resilience

- **Existing Webhooks**: If a webhook already exists, GitHub returns HTTP `422`. The system finds the existing webhook ID and completes registration without failure.
- **Database Caching**: Database connections use a global connection cache in Next.js. This prevents connection exhaustion during frequent webhook calls.
- **Signature Verification**: Prevents unauthorized third parties from sending fake webhook payloads to your server.
- **Private Repositories**: The system retrieves the repository owner access token from MongoDB to read private diffs and post comments securely.

---

## 5. Summary

This automated workflow removes manual review delays. It gives developers fast, consistent feedback on code changes before merging into production.
