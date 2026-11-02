# ClickBites (HTML version, connected to Supabase)

Plain HTML/CSS/JavaScript site for discovering local food in Calbayog City.
All data, login, and photos now live in **Supabase** (project `ohaxggtfqrfnpocyjaep`).
There is no separate server.

## Run it
1. Open this folder in VS Code and start **Live Server** (right-click `index.html` -> Open with Live Server).
   Do not double-click `index.html`: login and photo uploads need `http://`, not `file://`.
2. `config.js` already holds the project URL and the *publishable* key (safe in the browser).
   Never put a `service_role` or secret key in this folder.

## Files
- `index.html`, `style.css`, `script.js` - the site
- `config.js` - Supabase URL and publishable key
- `vendor/supabase.js` - the Supabase library (kept local, no CDN needed)
- `supabase/functions/create-owner/index.ts` - Edge Function used by the admin to create shop-owner accounts (already deployed)
- `logo.jpg`, `3.jpg` - images

## Accounts and roles
- **Customer**: signs up on the site, confirms the email with a code, gets a random Unique Customer ID such as `CB-7K2M9QX4TP`.
- **Shop owner (partner)**: created only by an admin (Admin -> Shops & owners). The admin gives the owner the starting password.
- **Admin**: create the first one by hand: sign up normally, then in the Supabase dashboard (Table Editor -> `profiles`) change that row's `role` to `admin`. Use a strong password.
- Users cannot change their own role. Suspending a user (Admin -> Users) bans their login.
- Shop owners and admins are logged out after 15 minutes of inactivity (browser side).

## Verified reviews
A shop owner generates a code (valid 24 hours, single use). The customer enters it with their rating. Wrong codes: 3 tries per hour. The server (not the browser) checks everything.

## Supabase dashboard settings (set once)
1. **Authentication -> Sign In / Providers -> Email**: enabled, **Confirm email ON**, minimum password length 8.
2. **Authentication -> Emails (templates)**: add `{{ .Token }}` to the **Confirm signup** template and the **Reset Password** template so the email shows the code, for example: `Your ClickBites code is {{ .Token }}`.
3. **Authentication -> Sign In / Providers -> Email -> OTP expiration**: 300 seconds (5 minutes).
4. **Authentication -> URL Configuration**: set Site URL to where you run the site (for example `http://127.0.0.1:5500`) and add it to Redirect URLs. The "change email" confirmation link uses this.
5. **Authentication -> SMTP**: Supabase's built-in email sender is heavily rate-limited. For the demo, connect your own SMTP (for example Gmail with an App Password).
6. Phone/SMS sign-in stays disabled (email only).

## Known limits
- Changing an email address sends a confirmation link (not a code); the new address takes effect after the link is opened.
- The 15-minute idle logout is enforced in the browser only.
- A suspended user's current session can keep working for up to about an hour; they cannot log in again.
- Old columns `shops.rating`, `shops.is_open`, `products.rating`, `shops.category` and the orders tables are unused by this site (kept for the older React version).
- The database structure is recorded in Supabase under Database -> Migrations (`html_frontend_schema`, `html_frontend_functions`, `html_frontend_edit_review` are the ones for this site).
