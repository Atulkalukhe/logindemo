# Northstar Learning — Login & User Management Demo

A responsive, dark-mode account and learning portal built with plain HTML, CSS, and browser JavaScript. Learners register for an account, an administrator reviews it, and approved learners can open a sample C Programming dashboard.

> **Security notice:** This is a frontend demonstration system, not secure production authentication. Account records live in the browser's `localStorage` and per-tab sessions in `sessionStorage`; users can inspect, change, or clear both. The demo admin credential is public, and client-side checks can be bypassed. Passwords are stored as salted PBKDF2-HMAC-SHA-256 hashes using the Web Crypto API, but hashing does not make browser-only authentication secure. A real application needs server-side authentication, authorization enforced by the server, secure session handling, and a protected database.

## Features

- Separate learner and administrator sign-in pages.
- Account registration with name, email, username, password, and confirmation validation.
- Case-insensitive duplicate email and username checks.
- Random per-account salts and Web Crypto PBKDF2-HMAC-SHA-256 password hashes (210,000 iterations); no plaintext passwords are written to storage.
- Pending, approved, and rejected account statuses, plus a separate disabled flag.
- Admin dashboard with total, pending, approved, and restricted account statistics; search and status filters; approve, reject, disable, re-enable, and remove actions.
- Protected learner dashboard for approved accounts, with a 12-hour per-tab session and access checks on load, on account changes in other tabs, and every 10 seconds.
- Ten sample C Programming topics. The educational content is demonstration material only.
- Responsive layout, password visibility controls, accessible form feedback, status badges, and confirmation dialogs for destructive admin actions.

## Project structure

```text
.
├── index.html          # Learner sign-in and registration
├── admin.html          # Separate admin sign-in and member management
├── dashboard.html      # Protected sample learner dashboard
├── css/
│   └── styles.css      # Responsive dark-mode styles
├── js/
│   └── app.js          # Browser storage, hashing, sessions, and page behavior
└── README.md
```

## Run locally

Use a current browser with Web Crypto and `localStorage` enabled. From the project directory, start Python's built-in static file server:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser. The app has no package installation or build step. HTTPS or localhost is required for Web Crypto in browsers that do not expose it to local files.

## Demo administrator

- **Username:** `admin`
- **Password:** `Admin@123`
- Open <http://localhost:8000/admin.html> (or `admin.html` on your deployed site).

The administrator record is created in this browser on first load. Clearing the site's storage resets the demo data and creates the demo administrator again. Do not reuse these credentials anywhere else.

## Demo workflow

1. Open the learner page and choose **Create account**.
2. Register with a unique email and username and a password of at least 8 characters. The page confirms that the account is waiting for approval.
3. Open `admin.html` and sign in with the demo administrator account.
4. Approve the pending learner in **Members**.
5. Return to the learner page and sign in with the approved account. The protected C Programming dashboard opens.
6. Sign out to return to the learner sign-in page.
7. To exercise blocked states, register another account and reject it, or disable an approved account from the admin list. Those accounts cannot open the learner dashboard.

## Test checklist

There is no build tool or third-party test framework. Use the demo workflow above to verify the browser flow. Check these cases as well:

- Wrong username/password is rejected; pending, rejected, and disabled accounts cannot sign in.
- Reusing an email or username is blocked, without regard to letter case.
- A password mismatch and malformed fields are rejected with field-level feedback.
- Opening `dashboard.html` without an approved learner session redirects to sign-in.
- Removing or disabling a learner in another tab removes access from the learner dashboard.
- Resize the browser to phone width and desktop width; the admin table scrolls horizontally, the learner navigation becomes a drawer, and the forms/cards reflow.
- Sign out and sign back in, then reload a protected page to confirm the local session behavior.

## Deploy with GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch containing the project and `/ (root)`, then save.
4. Open the Pages URL shown in that settings panel. The sign-in page is `index.html`; admin access is at `/admin.html`.

The pages use relative asset paths, so they work from a GitHub Pages project subpath. Each browser keeps its own separate demo accounts and approvals; storage does not sync between users or devices.

## Limitations

- This is a browser-only simulation. A user can edit `localStorage`, alter JavaScript, impersonate a role, or bypass the page checks.
- The administrator credential and implementation are visible to anyone who can access the source.
- Password hashing is performed in the browser and is not a replacement for server-side password storage and verification.
- Accounts are shared across tabs in one browser profile; each tab has its own 12-hour session. Both can be erased by clearing site data.
- There is no email verification, password reset, shared database, audit log, or real course progress tracking.
- C Programming cards are illustrative sample content, not complete lessons.
