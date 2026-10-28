# ClickBites

React + Vite website for discovering local food in Calbayog City. All data and
login runs on **Supabase** (Postgres database, Auth, Storage). There is no
separate backend server.

## Requirements
- Node.js 18+ (20+ recommended)

## Setup
1. Install packages:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the two values from the Supabase
   dashboard (Project Settings -> API):
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```
3. Start the site:
   ```bash
   npm run dev
   ```
   Open the URL Vite prints (normally http://localhost:5173).

## Accounts and roles
- Everyone who registers starts as a **customer**. Each profile gets an
  automatic unique customer ID (for example `CB-000001`), shown on the Profile page.
- Users cannot change their own role. To make someone a **partner** or **admin**,
  update `role` on their row in the `profiles` table (Supabase dashboard -> Table
  Editor). Partners are linked to a shop through `shops.owner_id`.
- Login options: email + password, or a one-time code sent by email.
  Password reset also works by email.

## Supabase dashboard settings (set once by the team)
- **Authentication -> Sign In / Providers -> Email**: keep Email enabled. Decide
  whether "Confirm email" is on. Turn it off for quick testing, on for the demo.
- **Authentication -> URL Configuration**: set *Site URL* to where the site runs
  (for example `http://localhost:5173`) and add the same address to *Redirect URLs*.
  Password-reset links need this.
- **Authentication -> Emails (templates)**: the "Magic Link" template is used for
  email codes. Add `{{ .Token }}` to it so the email contains the 6-digit code.
- Supabase's built-in email sender is heavily rate-limited. For testing many
  sign-ups, connect a custom SMTP service.

## Scripts
- `npm run dev` start the development server
- `npm run build` production build
- `npm run lint` lint the code

## Database
The database structure, access rules (Row Level Security) and storage buckets
live in the Supabase project. Orders are placed through the `place_order`
database function, which checks prices and availability on the server.
