

## Security Hardening Plan: Rotate Credentials & Audit Exposure

This is a **security operations** task — most of it happens **outside the codebase** (Supabase dashboard, third-party providers, Lovable workspace settings). I'll handle the in-codebase pieces and give you a clear checklist for the rest.

---

### What I will do in the codebase

**1. Audit the repo for any hardcoded secrets that need rotating**
- Scan `src/`, `supabase/functions/`, and config files for any leaked tokens (Stripe, OpenAI, Resend, service-role keys, etc.).
- Confirm only the **publishable anon key** lives in client code (`src/integrations/supabase/client.ts` + `.env`) — that one is safe to expose by design.
- Flag anything else for rotation.

**2. After you rotate the Supabase anon/publishable key**
- Update `src/integrations/supabase/client.ts` with the new publishable key.
- Update `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- No edge function changes needed — they read from Supabase secrets at runtime.

**3. Tighten RLS where the audit reveals gaps**
- Re-review the `anonymous_roasts`, `purchases`, `shared_roasts`, and `roast_results` policies for any over-permissive rules (e.g. `true` expressions on INSERT/UPDATE).
- If anything is too loose, propose a migration to lock it down.

**4. Run the Supabase security linter**
- Catch missing RLS, exposed views, function search-path issues, etc.
- Fix any critical findings via migration.

---

### What you must do manually (I cannot do these for you)

**A. Set the Lovable project to Private** (requires paid plan)
- Workspace Settings → Publish Settings → Visibility → Private.
- I can flip this via tool once you confirm — say "make it private."

**B. Rotate Supabase keys** (Supabase Dashboard → Project Settings → API)
1. **Service role key** — FIRST. Bypasses RLS. Used by all edge functions.
2. **Anon / publishable key** — used by the frontend.
3. **Database password / connection string** — Settings → Database.
- After rotating service role, re-add it as the `SUPABASE_SERVICE_ROLE_KEY` secret in Lovable Cloud.
- After rotating anon key, paste the new one and I'll update the client file.

**C. Rotate third-party API keys** (each provider's dashboard)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SCREENSHOT_API_KEY` (APIFlash)
- Update each via Lovable Cloud secrets manager.

**D. Audit logs** (Supabase Dashboard)
- **Auth logs**: anomalous sign-ins.
- **Postgres logs**: unusual SELECTs on `roasts`, `purchases`, `anonymous_roasts` over the last ~48 days.
- **Edge function logs**: traffic from unfamiliar IPs to `analyze-web3`, `create-checkout`, `stripe-webhook`.
- I can pull recent samples for you with the analytics query tool — just say "pull the audit logs."

**E. Verify exposure**
- Open the Lovable project URL in incognito — confirm no code/chat history is visible.
- Check Stripe dashboard for unauthorized charges/refunds.
- Check Supabase Auth → Users for unfamiliar accounts.

---

### Suggested execution order

```text
1. Rotate SERVICE_ROLE_KEY in Supabase  →  update Lovable secret
2. Rotate third-party keys              →  update Lovable secrets
3. Rotate ANON key                      →  I update client.ts + .env
4. Set project visibility to Private    →  I flip via tool
5. I run Supabase linter + RLS review   →  patch via migration if needed
6. I pull audit logs for review
7. You verify Stripe + Auth users dashboards
```

---

### Notes

- **No customer-facing UI or app logic changes.** This is purely security hygiene.
- **Anon key in client code is normal** — RLS protects the data, not the key. Rotating it only matters if you want to invalidate sessions.
- **Edge functions auto-redeploy** when you update secrets — no code change required.

Approve this plan and tell me which step to start with (recommended: rotate service-role key first, then say "audit the repo and run the linter").

