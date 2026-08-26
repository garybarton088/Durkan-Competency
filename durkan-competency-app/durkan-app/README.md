# Durkan Competency Register

A staff competency, experience and Building Safety Act evidence tracker with
real login and role-based access:

- **staff** — log in, fill in their own profile, tick project/value/build/
  contract experience, add qualifications, self-assess competency
- **senior** — everything staff can do, plus a queue to verify or send back
  staff self-assessments
- **bid_team** — read-only search across all staff to build tender shortlists

Roles are enforced in the database itself (Postgres row-level security), not
just hidden in the interface — this is the difference between a real system
and a prototype.

## 1. Create a Supabase project (free tier is enough to start)

1. Go to [supabase.com](https://supabase.com), create an account and a new project.
2. In the dashboard, open **SQL Editor -> New query**, paste in the entire
   contents of `supabase/schema.sql`, and run it. This creates every table,
   the lookup lists (project types, value bands, build types, contract
   types, BSA competency categories), and the permission rules.
3. Go to **Project Settings -> API** and copy the **Project URL** and the
   **anon public key**.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Paste your Project URL and anon key into `.env.local`.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on the login page. Use "Create an
account" to sign up. New accounts start as `staff`.

## 4. Promote your first senior and bid team users

New signups default to `staff`. To give someone senior or bid_team access:

1. In Supabase, go to **Table editor -> profiles**.
2. Find their row and change the `role` column to `senior` or `bid_team`.

There's no UI for this yet on purpose — role changes are rare and sensitive,
so keeping it a deliberate manual step in Supabase avoids building a whole
admin-permissions screen before you actually need one.

## 5. Deploy it

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), import the repo.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Vercel gives you a live URL staff can log into from anywhere.

## Editing the checklists

The project type / value band / build type / contract type lists live in
the `project_types`, `value_bands`, `build_types` and `contract_types`
tables. Edit rows directly in the Supabase table editor — no code change or
redeploy needed.

## What to build next

This covers the core workflow end to end but is intentionally not
feature-complete. Natural next steps, roughly in order of value:

- Email notifications when a submission needs verification, or gets verified
- CSV/PDF export of a tender shortlist for pasting into bid documents
- An audit log table recording every verification decision (who, when, why)
- Expiry reminders for qualifications and time-bound competency evidence
- Proper admin screen for role management once you have more than a
  handful of senior/bid_team users

If you get stuck extending this, open the project in Claude Code and ask it
to work from this README and `supabase/schema.sql` — both are written to be
a clear brief for what the system does and why it's structured this way.
