# KnowHub — Setup & Deployment Guide (for beginners)

This guide explains, step by step, how to (1) get the code onto GitHub and
(2) make Cloudflare Pages auto-deploy your site. No prior experience assumed.

---

## Part 0 — What you have

- A monorepo whose website lives in `apps/web` (React + Vite + Tailwind).
- It builds to a folder called `apps/web/dist` (plain HTML/CSS/JS).
- Cloudflare Pages will rebuild and publish that folder every time you push to GitHub.

---

## Part 1 — Push the code to GitHub

### If you see a "Permission denied" error when pushing

That means the GitHub account saved on your computer is **not** the owner of
`knowhub-by-ab/knowhub`. Pick **one** fix:

#### Option A (recommended): use a Personal Access Token for `knowhub-by-ab`

1. Log in to GitHub **as `knowhub-by-ab`** in your browser.
2. Go to **https://github.com/settings/tokens** → **Generate new token** →
   **Fine-grained token**.
3. Set:
   - **Resource owner:** `knowhub-by-ab`
   - **Repository access:** Only select repositories → `knowhub`
   - **Permissions → Repository → Contents:** Read and write
4. Click **Generate token** and **copy** it (you won't see it again).
5. On your computer, open **Credential Manager** (press Start, type
   "Credential Manager") → **Windows Credentials** → find any entry like
   `git:https://github.com` → **Remove** it.
6. Next time you push, Git will ask you to log in — enter username
   `knowhub-by-ab` and paste the **token** as the password.

#### Option B: add your other account as a collaborator

If `prjsab02` is also your account and you'd rather use it:
1. Log in as `knowhub-by-ab`, go to the repo → **Settings** → **Collaborators**
   → **Add people** → add `prjsab02` → accept the invite from the `prjsab02` account.
2. Push again.

### The push command

From the project folder (`knowhub`):
```bash
git push -u origin main
```
That's it — the code is now on GitHub.

---

## Part 2 — Connect Cloudflare Pages (one-time)

1. Log in to **https://dash.cloudflare.com**.
2. In the left menu choose **Workers & Pages** → **Create** → **Pages** tab →
   **Connect to Git**.
3. Authorize Cloudflare to access your GitHub, then pick the
   **`knowhub-by-ab/knowhub`** repository → **Begin setup**.
4. On the build configuration screen enter **exactly**:

   | Field | Value |
   | --- | --- |
   | Project name | `knowhub` (or anything you like) |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `apps/web/dist` |
   | Root directory | *(leave blank)* |

5. Expand **Environment variables (advanced)** and add one:
   - **Variable name:** `NODE_VERSION`  **Value:** `20`
6. Click **Save and Deploy**.

Cloudflare will install dependencies, run the build, and publish your site.
After ~1–2 minutes you'll get a live URL like `https://knowhub.pages.dev`.

---

## Part 3 — How auto-deploy works from now on

Every time new code is pushed to the `main` branch on GitHub, Cloudflare Pages
automatically rebuilds and redeploys. You don't have to do anything manually.

```
You/agent push to GitHub (main)  →  Cloudflare builds apps/web  →  live site updates
```

---

## Troubleshooting

- **Build fails on Cloudflare with a Node error:** make sure `NODE_VERSION = 20`
  is set (Part 2, step 5).
- **Page works on home but a refresh on /app gives 404:** the
  `apps/web/public/_redirects` file fixes this; make sure it was pushed.
- **Wrong GitHub account / permission denied:** see Part 1.
- **Nothing deploys after a push:** in Cloudflare Pages → your project →
  **Settings → Builds & deployments**, confirm the production branch is `main`.
