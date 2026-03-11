

## Fix: Redirect unauthenticated users to sign in instead of attempting anonymous_roasts insert

**Problem:** The `anonymous_roasts` table has RESTRICTIVE RLS policies (Permissive: No) with no permissive policies, so unauthenticated users can't insert. This causes an RLS violation error.

**Solution:** In `UrlForm.tsx`, instead of trying to insert into `anonymous_roasts` when the user isn't logged in, redirect them to the `/auth` page. Store the URL they entered so it can be used after login.

**Changes:**

1. **`src/components/UrlForm.tsx`** (lines 78-97): Replace the anonymous insert block with:
   - Save the entered URL to `localStorage` (e.g., `pending_roast_url`)
   - Show a toast: "Please sign in to start your roast"
   - Navigate to `/auth`

2. **`src/pages/Auth.tsx`**: After successful authentication, check `localStorage` for `pending_roast_url`. If found, auto-create the roast and redirect to results. This provides a seamless experience.

No database or RLS changes needed.

