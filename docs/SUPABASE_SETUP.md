# Supabase Cloud DEV Project Setup Guide ($0)

Follow these exact steps in Windows PowerShell to set up your throwaway **DEV** Supabase project for Plawza.
*(Never run this against your production/pilot project!)*

---

## 1. Create a Free Cloud Supabase Project (if not already done)
1. Go to [supabase.com](https://supabase.com) and log in.
2. Click **New Project**.
3. Name: `plawza-dev`.
4. Database Password: Choose a strong password and save it somewhere secure.
5. Region: Choose the closest region (e.g., `af-south-1` Cape Town or `eu-central-1` Frankfurt).
6. Plan: **Free ($0)**.
7. Once created, note your **Project Reference ID** from the URL:
   `https://supabase.com/dashboard/project/<project-ref-id>`

---

## 2. Link Local Repository to Cloud Dev Project
Open PowerShell in `C:\Projects\web\plawza` and run:

```powershell
# 1. Log in to Supabase CLI (will open a browser window to generate an access token)
npx supabase login

# 2. Link your dev project (replace <project-ref> with your actual project reference ID)
npx supabase link --project-ref <project-ref>
```

When prompted for your Database Password, enter the password you chose during project creation.

---

## 3. Apply the Core Migration
Push the migration `supabase/migrations/20261030000000_mvp_core.sql` to your linked dev project:

```powershell
npx supabase db push
```

This applies:
- All 17 tables & relationships
- Triggers, guards, and auto-review triggers on image edits
- Row Level Security (RLS) policies
- Anonymous column-level restrictions
- Custom security definer RPCs (`reveal_contact`, `moderate_content`, `resolve_report`, `match_roommates`)
- Storage buckets (`listing-images`, `business-images`, `avatars`)
- Reference seed data (Zambian towns, campuses, categories)

---

## 4. Run RLS & Security Verification in Supabase SQL Editor
1. In the Supabase Dashboard, open your project -> **SQL Editor** -> **New Query**.
2. Open the file [supabase/tests/rls.sql](file:///C:/Projects/web/plawza/supabase/tests/rls.sql) in VS Code or Notepad.
3. Copy its entire content, paste it into the SQL Editor, and click **Run**.
4. The script will execute all 12 security test suites and return a result table:
   - `1. Anon cannot read draft/pending rows` -> **PASS**
   - `2. Anon cannot read private_contacts` -> **PASS**
   - `3. Anon cannot select reviewed_by/rejection_reason` -> **PASS**
   - `4. User cannot update another user's listing` -> **PASS**
   - `5. User cannot set status='active' on own listing` -> **PASS**
   - `6. Editing active listing returns it to pending` -> **PASS**
   - `7. Adding image to active listing returns it to pending` -> **PASS**
   - `8. User cannot insert into staff_roles` -> **PASS**
   - `9. User cannot attach contact to foreign listing` -> **PASS**
   - `10. reveal_contact fails signed-out & unconsented` -> **PASS**
   - `11. moderate_content guards non-staff, self & status` -> **PASS**
   - `12. Enquiries visible only to requester & owner` -> **PASS**
5. Copy the output and paste it back into Antigravity.

---

## 5. Generate TypeScript Types
Once the migration is pushed, run:

```powershell
npx supabase gen types typescript --linked > src/types/database.ts
```

*(Note: Node.js must be installed to run npx. If Node is not yet installed on your system, install it via `winget install OpenJS.NodeJS.LTS`).*

---

## 6. How to Promote the First Admin (Manual SQL Command)
By security design, no user can self-promote from the UI. After you sign up via the app:
1. Find your user ID in Supabase Dashboard -> **Authentication** -> **Users**.
2. Run this query in the SQL Editor:
   ```sql
   insert into public.staff_roles (user_id, role)
   values ('<your-auth-user-uuid>', 'admin');
   ```
