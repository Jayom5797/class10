# Class 10 Progress Tracker

A lightweight React + Vite + TypeScript application hosted on Vercel, with Turso (libSQL/SQLite) as the persistent database.

## Features

- Teacher-only workflow with no login screen.
- Two main views: Track by Student and Track by Subject.
- Nine fixed Maharashtra SSC subjects.
- Unlimited papers per subject.
- Per-student, per-paper status and optional teacher remark.
- Blank cells mean Not Started.
- Add/delete students and papers.
- CSV export.
- Responsive tables for mobile and desktop.

## 1. Create the Turso database

Install the Turso CLI and authenticate, then run:

```bash
turso db create class10-progress
turso db show class10-progress --url
turso db tokens create class10-progress
```

Copy the database URL and token. The app initializes the tables and subjects when `/api/bootstrap` is called.

## 2. Configure environment variables

In your Vercel project settings, add:

- `TURSO_DATABASE_URL` = the URL from `turso db show`
- `TURSO_AUTH_TOKEN` = the token from `turso db tokens create`

For local development, copy `.env.example` to `.env.local` and fill in the values.

## 3. Deploy to Vercel

Push this folder to a GitHub repository, import the repository in Vercel, and deploy. Vercel should detect Vite automatically.

After the first deployment, open:

```text
https://YOUR-DEPLOYMENT.vercel.app/api/bootstrap
```

You should receive:

```json
{"ok":true,"message":"Database is ready. Subjects initialized."}
```

Then open the main site. You only need to bootstrap once per database.

## 4. Run locally

```bash
npm install
cp .env.example .env.local
# Fill in the Turso URL and token in .env.local
npm run dev
```

Vite's dev server does not run Vercel API functions by itself. For a full local preview of API routes, use the Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

## Important privacy note

There is deliberately no login screen, as requested. That means the deployed site and its API are public to anyone who obtains the URL. An unlisted URL is not an access-control mechanism. Do not store sensitive student information in this version. To keep the UI login-free while protecting records, add a server-side secret/access gate before using real student data.

## Data model

- `students`
- `subjects` (seeded with the nine fixed subjects)
- `papers` (unlimited rows, each attached to one subject)
- `student_progress` (unique student + paper pair; status and remark only)

Deleting a student or paper cascades to the related progress records. Export CSV periodically as a backup.
