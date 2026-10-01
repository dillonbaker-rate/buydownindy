# BuyDown Indy

A public, mobile-first map of greater-Indianapolis listings where the seller pays concessions. For each
listing, buyers see what that money does as a temporary buydown (1-0, 2-1, 3-2-1), a permanent buydown,
or a closing cost credit, compared with a price cut of the same amount.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Leaflet · Supabase (Postgres, Auth, Storage) · Zod · Vercel.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # payment-engine + PMMS parser tests
```

With no Supabase env vars the app runs in **demo mode**: the map and listing pages use the 12 sample
listings and the 6.25% sample rate, the lender form validates but doesn't store, and agent screens
explain that setup is needed.

## Set up Supabase

1. Create a project at supabase.com.
2. SQL editor → run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql` (sample listings + rate).
3. Authentication → URL Configuration: set **Site URL** to the production URL and add
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to **Redirect URLs**.
4. Copy the URL, anon key and service-role key into `.env.local` (see `.env.example`) and into Vercel.

Remove the demo data later with `delete from listings where is_sample;`.

## Deploy (Vercel)

Import the GitHub repo in Vercel, add the env vars from `.env.example`, deploy. `vercel.json` schedules
`/api/cron/rate` every Thursday at 18:00 UTC to pull the latest Freddie Mac PMMS 30-year rate.

## Where things live

| Path | What |
|---|---|
| `src/lib/buydown.ts` | Payment engine (port of the prototype's `calc()`), tested in `buydown.test.ts` |
| `src/content/disclosures.ts` | **All compliance copy** (disclosures, TCPA consent, footer). Edit here only. |
| `src/content/program-rules.ts` | **Loan program rules** from Rate's official Buydown & IPC Calculator: concession limits, MI/MIP, FHA UFMIP, VA funding fee, 4%-of-loan closing-cost estimate |
| `src/lib/rate-calc-parity.test.ts` | Checks the engine against Rate's calculator formulas across 96 scenarios |
| `src/components/map/` | Map screen: Leaflet wrapper, bottom sheet, filters, hero |
| `src/components/listing/` | Listing page, option cards, gallery, lender modal |
| `src/components/agent/` | Posting wizard, photo grid (dnd-kit), dashboard, login |
| `src/app/api/` | `leads`, `listings`, `agent`, `geocode`, `cron/rate` |
| `supabase/` | Schema, RLS policies, storage bucket, seed |

## Before public launch

Search the code for `COMPLIANCE:`. Open items:

- Rate compliance review of all copy in `src/content/disclosures.ts`.
- **Representative example** likely needs a real APR (Reg Z trigger terms).
- **TCPA consent** wording in the lender form.
- **Advertised-rate rules**: the PMMS average is labeled a sample rate.
- **EHO logo**: `src/components/ui/EhoLogo.tsx` is drawn to match HUD's mark; confirm or swap in the official file.
- A production **tile provider** key (`NEXT_PUBLIC_MAPTILER_KEY` or `NEXT_PUBLIC_TILE_URL`).
- Lead notifications: leads are stored in the `leads` table; nothing emails them yet.
