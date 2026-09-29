# Getting your Todo App running — a beginner's walkthrough (Mac)

This assumes you've never done anything like this before. It starts from
"nothing is installed on your computer" and ends with the app live on the
internet. Go in order — later steps depend on earlier ones.

Budget a few hours, possibly across more than one sitting. That's normal
for a first deploy, not a sign something's wrong. Every account you'll
create is free.

**If you get stuck at any point**, copy the exact error message you're
seeing and bring it back to this conversation — that's usually enough for
help to figure out what went wrong.

---

## Part 0 — A few words you'll see a lot

- **Terminal**: a text-based way to talk to your computer, instead of
  clicking icons. You'll type commands into it. It's already on your Mac.
- **Repo (repository)**: a folder of code tracked by a tool called git, so
  changes are recorded and it can be pushed online.
- **Deploy**: putting your app on a real server on the internet, so it has
  a real address (URL) anyone (with the passcode) can visit.
- **Environment variable**: a secret setting (like a password or API key)
  that the app reads at startup, kept out of the code itself.
- **API key / credentials**: an ID + secret pair that lets your app prove
  to another service (Google, Supabase) that it's allowed to talk to it.

---

## Part 1 — Install the tools

### 1.1 Open Terminal
Press `Cmd + Space`, type `Terminal`, hit Enter. A window with a blinking
cursor opens. This is where you'll type commands for the rest of this
guide. Leave it open.

### 1.2 Install git
Git comes from Apple, but usually isn't installed until you ask for it.
In Terminal, type:
```
git --version
```
and press Enter. If nothing's installed, a popup appears asking to
"install the command line developer tools." Click **Install**, wait a
few minutes, then run the same command again — it should now print a
version number.

### 1.3 Install Node.js
This app runs on Node.js. Go to **nodejs.org** in your browser, click the
big button that says **LTS** (not "Current"), and open the downloaded
`.pkg` file. Click through the installer with the default options
(Continue → Continue → Install), entering your Mac password if asked.

Back in Terminal, check it worked:
```
node -v
npm -v
```
Both should print version numbers (e.g. `v20.11.0`). If you get
"command not found," quit and reopen Terminal, then try again.

### 1.4 Install a code editor
You'll need somewhere to view/edit a couple of text files. Go to
**code.visualstudio.com**, download it, open the `.dmg` file, and drag
the VS Code icon into your Applications folder. Open it once from
Applications/Spotlight so it's ready.

### 1.5 Create a GitHub account + install GitHub Desktop
GitHub is where your code will live so Vercel (Part 5) can deploy it.

1. Go to **github.com/join** and create a free account.
2. Go to **desktop.github.com**, download GitHub Desktop, open the
   `.dmg`, drag it to Applications, open it, and sign in with the GitHub
   account you just made.

---

## Part 2 — Open the project

1. Unzip `unified-todo-app.zip` (double-click it in Finder — usually in
   your Downloads folder). You'll get a folder called `unified-todo-app`.
2. Drag that whole folder onto the VS Code icon in your Dock (or:
   open VS Code → File → Open Folder → select it).
3. In VS Code, open its built-in terminal: menu bar → **Terminal → New
   Terminal**. A terminal panel opens at the bottom, already inside the
   project folder — you can use this instead of the separate Terminal app
   for every command below.
4. Install the app's dependencies (this downloads everything the code
   needs to run — it's normal for this to take a minute and print a lot
   of text):
   ```
   npm install
   ```

---

## Part 3 — Create your free cloud accounts

You're setting up three free accounts: **Google Cloud** (so the app can
read Gmail), **Supabase** (the database), and later **Vercel** (Part 5,
where the app actually lives online). Use *your own* Google account for
Google Cloud — it's the developer account that owns the project, separate
from the Gmail address(es) the app will eventually read.

### 3.1 Google Cloud (Gmail access)
1. Go to **console.cloud.google.com**, sign in with your Google account,
   accept the terms if asked.
2. Click the project dropdown near the top → **New Project**. Give it any
   name (e.g. "Todo App") → **Create**. Wait a few seconds, then make sure
   it's selected in that same dropdown.
3. In the search bar at the top, type **Gmail API**, click it, click
   **Enable**.
4. In the left sidebar: **APIs & Services → OAuth consent screen**.
   - User Type: **External** → Create.
   - Fill in the required fields (app name, your email in the two email
     fields) → Save and Continue through the next couple of screens
     (Scopes, Test users — you'll add test users next) → Back to Dashboard.
   - Keep **Publishing status** as **Testing**.
5. Still on that OAuth consent screen page, find **Test users** → **Add
   users** → enter the Gmail address(es) that will actually be connected
   to the app (all 2-3 of them, if the end user has multiple) → Save.
6. Left sidebar: **APIs & Services → Credentials → + Create Credentials
   → OAuth client ID**.
   - Application type: **Web application**.
   - Under **Authorized redirect URIs**, click **+ Add URI** and enter
     exactly: `http://localhost:3000/api/google/callback`
     (you'll add a second one for the real deployed site in Part 5).
   - Click **Create**. A popup shows a **Client ID** and **Client
     secret** — click to copy each one somewhere safe (a Notes app is
     fine for now); you'll paste them into `.env` in Part 3.3.

*(Google's exact button labels shift occasionally — if something looks a
little different, look for the closest-named option; the overall flow
stays the same.)*

### 3.2 Supabase (the database)
1. Go to **supabase.com**, click **Start your project**, sign in (GitHub
   sign-in is the fastest option since you already made that account).
2. Create a **New project**. Pick any name and a database password (save
   this password somewhere — you likely won't need it again, but keep it
   just in case). Choose the region closest to you. Wait a minute or two
   while it provisions.
3. Left sidebar → **SQL Editor** → **New query**. Open the file
   `supabase/schema.sql` from the project folder in VS Code, copy its
   entire contents, paste into the Supabase SQL editor, and click **Run**.
   You should see a success message.
4. Left sidebar → **Project Settings → API**. You'll need three values
   from this page in a minute: **Project URL**, the **anon public** key,
   and the **service_role** key (click "Reveal" to see it — keep this one
   especially private, it has full access to your database).

### 3.3 Fill in your `.env` file
1. In VS Code's file list (left side), find `.env.example`. Right-click
   it → **Copy**, then right-click the project folder → **Paste**, and
   rename the copy to exactly `.env` (no `.example`).
2. Open `.env` and fill in each line with what you collected:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — from Supabase step 3.2.4.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from Google step 3.1.6.
   - `GOOGLE_REDIRECT_URI` → `http://localhost:3000/api/google/callback`
   - `APP_URL` → `http://localhost:3000`
3. For `ENCRYPTION_KEY`, `SESSION_SECRET`, and `CRON_SECRET`, go back to
   your VS Code terminal and run this three times, pasting a different
   result into each of those three lines:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Save the file (`Cmd + S`).

### 3.4 Set your passcode
This is the passcode you (and eventually the end user) will type to open
the app. In the VS Code terminal:
```
npm run hash-passcode -- "pick-any-passcode-here"
```
This prints a long value like `a1b2c3...:d4e5f6...`. Copy the *entire*
printed line. Go back to Supabase → **SQL Editor → New query**, paste in:
```sql
update app_settings set passcode_hash = 'paste-the-value-here' where id = 1;
```
(with the copied value replacing that placeholder, single quotes kept)
and click **Run**.

---

## Part 4 — Run it on your own computer first

Still in the VS Code terminal:
```
npm run dev
```
Wait for it to say something like "Ready in..." Then open
**http://localhost:3000** in your browser. You should see a passcode
screen — enter the passcode you picked in 3.4.

Once you're in, go to the **Settings** tab and try **Connect a Gmail
account** — it should send you through a real Google sign-in popup. If
that works end to end, the hardest part is done. Leave the terminal
running while you test; press `Control + C` in the terminal whenever you
want to stop it.

*(iCloud Calendar connecting works the same locally as it will once
deployed — you can test that here too, using the app-specific password
steps in the in-app Settings page.)*

---

## Part 5 — Put it online (Vercel)

### 5.1 Push the code to GitHub
1. Open **GitHub Desktop**. File → **Add local repository** → choose
   the `unified-todo-app` folder.
2. It'll offer to create a repository for this folder — click through
   that (**create a repository**).
3. Bottom-left: write anything in the summary box (e.g. "Initial
   commit") → **Commit to main**.
4. Top bar → **Publish repository**. Untick "Keep this code private" only
   if you're fine with that (private is safer and still free — leave it
   ticked) → **Publish**.

### 5.2 Deploy on Vercel
1. Go to **vercel.com**, sign up/sign in with your GitHub account.
2. **Add New → Project**, find the `unified-todo-app` repo you just
   published, click **Import**.
3. Before clicking Deploy, expand **Environment Variables** and add every
   line from your `.env` file (same names, same values) — except you'll
   fix two of them in the next step after deploying once.
4. Click **Deploy**. Wait for it to finish; you'll get a URL like
   `https://unified-todo-app-yourname.vercel.app`.
5. Go back to your Google Cloud OAuth client (Part 3.1.6) and click **+
   Add URI** again, this time with your real Vercel URL:
   `https://your-real-url.vercel.app/api/google/callback`
6. Back in Vercel → your project → **Settings → Environment Variables**,
   update `GOOGLE_REDIRECT_URI` and `APP_URL` to that same real URL, then
   **Deployments** tab → the "..." menu on the latest deployment →
   **Redeploy**.

Vercel automatically runs the sync job once a day (1pm UTC) from here on
(defined in `vercel.json`) — nothing else to set up for that. This is
once-daily rather than every 15 minutes because Vercel's free Hobby plan
only allows daily cron jobs; more frequent schedules need a paid Pro plan.
You can still get an on-demand refresh anytime by visiting
`/api/cron/sync` yourself with the `Authorization: Bearer <CRON_SECRET>`
header (same as the local-testing curl command below), or change the
schedule in `vercel.json` (standard cron syntax) if you upgrade to Pro
later.

---

## Part 6 — Add Home Screen icons (optional but nice)
Drop three image files into `public/icons/` — `icon-192.png`,
`icon-512.png`, `apple-touch-icon.png` (any square logo/image resized to
those dimensions works; plenty of free online tools can resize an image).
Commit and push the change the same way as Part 5.1 to update the live
site.

---

## Part 7 — Hand it off to the end user
Following the earlier setup logistics: connect their Gmail/iCloud
accounts live with them (screen-share or in person), then give them your
deployed URL and the passcode. On their iPhone: open that URL in Safari →
Share button → **Add to Home Screen**.

---

## If something breaks
- **Vercel deploy fails**: click into the failed deployment → **Build
  Logs** — the actual error is usually near the bottom in red.
- **"Not authenticated" / redirected to login unexpectedly**: double
  check `SESSION_SECRET` is set in both `.env` and Vercel's environment
  variables, and matches between local and deployed if you're comparing
  behavior.
- **Google sign-in shows an error about the app not being verified**:
  normal in Testing mode — click **Advanced → Go to (app name) (unsafe)**
  to proceed; this only shows for accounts on the Test users list.
- **Nothing shows up in Triage**: on the deployed site, the sync job now
  only runs automatically once a day (Hobby plan cron limit — see above);
  it doesn't run automatically at all while using `npm run dev` locally. To trigger it manually while testing locally, run (with
  your own `CRON_SECRET` from `.env`):
  ```
  curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync
  ```

For anything not covered here, bring the exact error message back to this
conversation.

---

## Appendix: what's actually in this app, for reference

Everything from the PRD is implemented: multi-account Gmail (2-3
accounts) + a single iCloud Calendar feeding into shared triage,
Accept/Reject/Snooze/Ignore (with sender-level ignore + cross-account
de-duplication by `Message-ID`), user-managed lists with drag-and-drop
and a "Move to..." menu, tags, search, a global "Undo last action,"
overdue styling, the PWA Home Screen icon, and in-app passcode changes.

**Not implemented** (out of scope per the PRD): recurring tasks,
AI-based triage scoring, additional email providers, push notifications,
data export, and the native iOS widget (explicitly declined in favor of
the PWA icon).

**Known simplification**: recurring calendar events surface as a single
triage item for their next occurrence in the sync window, not one item
per occurrence — see the comment in `src/lib/caldav.ts`.

**Why polling instead of Supabase Realtime**: the original plan was
Supabase Realtime for cross-device live updates. That turned out to
conflict with the single-passcode auth model — a browser Realtime
subscription needs the public Supabase anon key, and with no Supabase
Auth/Row-Level-Security in this app, exposing that key would let anyone
who pulled it from the client bundle read tasks directly, bypassing the
passcode. Built instead: the frontend polls the passcode-protected API
every 8–15 seconds — not true push, but the same practical result.

**A version note**: this project targets Next.js 16 (not 14, which is
long past end-of-life and has a known middleware-bypass vulnerability —
a real problem for an app whose entire passcode gate lives in
middleware). Next 16 also renamed that file from `middleware.ts` to
`proxy.ts`, which this project already uses. If `npm install` ever warns
about a Next.js security update again in the future, treat it seriously
and come back here for help upgrading — don't ignore it.

**On `npm audit`**: if it flags `axios` vulnerabilities via `node-ical`,
those are all in `node-ical`'s URL-fetching functions, which this app
never calls (it only uses `node-ical`'s `parseICS` on text already
fetched via `tsdav`) — the version pinned here already has the fix
regardless. A remaining moderate `uuid` finding nested under
`googleapis`/`gaxios` is inside Google's own dependency chain, not
something pinned directly here, and needs an upstream `googleapis`
release to fully clear — low practical risk in the meantime, since the
underlying bug only triggers when code explicitly passes a buffer into
UUID generation, which these libraries don't do. Don't run `npm audit fix
--force` without checking with me first — it can jump a package to an
incompatible major version.
