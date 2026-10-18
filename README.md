# undralmarket.mn

Mobile-first ordering site for the ground-floor shop that delivers **only to residents of one building**.
Residents order on their phone; staff bring it to the door in 15–30 min, or it's picked up at the counter.

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 + shadcn/ui · lucide-react · Supabase (Postgres, Auth, Storage, Realtime) · Web Push · PWA.

## Setup

1. **Create a Supabase project.** In the SQL editor run, in order:
   - `supabase/schema.sql` (tables, row-level security, order/sign-up functions, realtime, storage bucket)
   - `supabase/seed.sql` (10 categories, 20 sample products, default settings)
   - `supabase/recipes.sql` (16 recipe bundles; each ingredient links to a product by name)
2. **Auth settings** → *Authentication → Providers → Email*: turn **off** “Confirm email”.
   Residents sign in with phone number + password; the app maps the phone to an internal address
   (`99112233@resident.undralmarket.mn`), so no SMS provider is needed.
3. **Env vars:** `cp .env.example .env.local` and fill in the Supabase URL, anon key and service-role key.
   For push notifications run `npx web-push generate-vapid-keys` and paste both keys.
4. `npm install && npm run dev` → http://localhost:3000
5. **Make yourself the owner:** sign up at `/signup` with the invite code (find it with
   `select invite_code from settings;`), then in the SQL editor:
   ```sql
   update residents set role = 'owner', status = 'approved' where phone = '99112233';
   ```
   The shop panel is at `/admin`. Staff accounts: approve them, then set the role to «Ажилтан» in *Оршин суугчид*.

## How it works

| Area | Where |
| --- | --- |
| Resident pages | `src/app/(shop)/` — home, `categories`, `product/[id]`, `recipes/[slug]`, `cart`, `checkout`, `orders`, `orders/[id]` (live), `water`, `me`, `login`, `signup` |
| Shop panel | `src/app/admin/` — live queue, products, recipes, residents & Дэвтэр, daily summary, settings |
| Server actions | `src/app/actions/` |
| Database | `supabase/schema.sql`, `supabase/seed.sql` |

**Security model**

- Every table has row-level security. A resident only sees their own apartment's orders, Дэвтэр and family members.
- Orders are created only through the `place_order()` Postgres function, which re-reads prices and stock from the
  database, and checks opening hours, the minimum order, delivery on/off and the Дэвтэр limit. Prices sent by the browser are ignored.
- Sign-up requires the invite code from the lift notice. New accounts stay «Хүлээгдэж буй» until the owner approves them.
- Only the owner can change roles, settings, the invite code or Дэвтэр access (enforced in the database, not just the UI).
- The catalog has no alcohol/tobacco category. Keep it that way.

**Payments**

- **QPay (via [Wire](https://docs.wire.mn)):** set `WIRE_API_KEY` (live `sk_live_` key from app.wire.mn) and the
  order page shows a «Төлөх» button that opens Wire's hosted checkout (QR + bank-app links). Payment is confirmed by
  polling the PaymentIntent and, in production, the signed webhook at `/api/wire/webhook` (`WIRE_WEBHOOK_SECRET`).
  Without the key the order page shows the bank account instead.
- **SocialPay / Дансаар:** account number with a copy button; staff tick «төлсөн» in the queue.
- **Бэлнээр / карт:** staff see “💳 bring the terminal” on the delivery checklist.
- **Дэвтэр:** only for apartments the owner enabled; the charge is recorded automatically and the owner records payments.

**Realtime & notifications**

- The admin queue and the resident's order page update live (Supabase Realtime on `orders`).
- New orders play a chime on the counter tablet (tap «Дуу асаах» once — browsers require a tap before sound).
- Web push: resident → accepted / out for delivery / delivered; shop → new order / cancelled.
  On iPhone, push works only after “Add to Home Screen” (iOS 16.4+).

## Daily routine for the owner

1. Morning: *Бараа* → «Шинэ өдөр эхлүүлэх» clears yesterday's “fresh today”, then toggle today's bread/milk/meat.
2. Mark daily deals with «Хямдрал» (they show a countdown to closing time).
3. Busy? Switch off «Хүргэлт» on the queue screen — residents can still order for pickup.

## Scripts

```bash
npm run dev     # development
npm run build   # production build
npm run lint
```
