# Schmidt Construction Portal — New Features (July 2026)

## Overview

Six new features added to the portal:

1. **Dashboard Weather Widget** — Live Omaha weather with work safety indicator
2. **Jobs Board (Kanban)** — Visual job status tracking across 4 columns
3. **Photo Upload per Job** — Upload and manage job site photos
4. **Estimate → Invoice Flow** — One-click invoice generation from accepted estimates
5. **Customer Estimate Actions** — Customers can accept/decline/request changes
6. **Weekly Timesheet Summary Email** — Automated weekly report via Resend

---

## Environment Variables Required

Add these to your `.env.local`:

```env
# Feature 1: Weather Widget
OPENWEATHER_API_KEY=your_openweathermap_api_key

# Feature 6: Weekly Summary Email
RESEND_API_KEY=your_resend_api_key
CRON_SECRET=a_random_secret_for_cron_auth

# Existing (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Getting API Keys

- **OpenWeatherMap**: Sign up at https://openweathermap.org/api → Free tier (60 calls/min)
- **Resend**: Sign up at https://resend.com → Free tier (100 emails/day, 3000/month)
  - Verify your domain (schmidtwalls.com) in Resend dashboard for sending from noreply@schmidtwalls.com

---

## Database Migration

Run the SQL migration to create new tables and storage policies:

```bash
supabase db push
# or apply manually:
# supabase migration up
```

The migration file: `supabase/migrations/20260714_features.sql`

Creates:
- `photos` table (for job photos)
- `change_requests` table (for customer feedback)
- `job-photos` storage bucket with RLS policies
- `estimate_id` column on `invoices` table
- `address` column on `jobs` table
- Proper indexes

---

## Feature Details

### 1. Weather Widget

- **API**: `/api/weather` — fetches from OpenWeatherMap, cached 10 min
- **Component**: `src/components/shared/WeatherWidget.tsx` (client component)
- **Shows**: Current temp, feels like, wind, humidity, conditions
- **Safety Indicator**: Green "Good to work" or Red "Weather warning" based on:
  - Temp > 100°F or < 15°F
  - Wind > 30 mph
  - Thunderstorms / Tornadoes

### 2. Jobs Board

- **Page**: `/jobs` — Kanban board with 4 columns
- **Statuses**: `estimating` → `scheduled` → `in_progress` → `complete`
- **API**: `/api/jobs/update-status` — POST to change job status
- Cards link to job detail pages

### 3. Photo Upload

- **Page**: `/jobs/[id]` — Job detail with photo section
- **API**: `/api/jobs/upload-photo` — POST (multipart) to upload, DELETE to remove
- **Storage**: Supabase Storage bucket `job-photos`
- **Limits**: Max 10MB, JPEG/PNG/WebP/HEIC only
- Photos displayed in responsive grid

### 4. Estimate → Invoice

- **API**: `/api/estimates/create-invoice` — POST with `{ estimateId }`
- **Page**: `/estimates/[id]` — Detail page with "Generate Invoice" button
- Only works for estimates with status = `accepted`
- Auto-generates: `INV-2026-001` format, 30-day due date
- Includes tax calculation

### 5. Customer Estimate Actions

- **Page**: `/portal/estimate/[id]` — Full estimate detail for customers
- **API**: `/api/customer/estimate-action` — POST with `{ estimateId, action, message? }`
- Actions: `accept`, `decline`, `request_changes`
- Change requests stored in `change_requests` table
- Portal page (`/portal`) now has clickable estimate cards linking to detail

### 6. Weekly Summary Email

- **API**: `/api/cron/weekly-summary` — POST (or GET for testing)
- **Auth**: Bearer token via `CRON_SECRET` env var
- **Recipients**: mikiel@schmidt-construction.com, matty@purepulse.one
- **From**: noreply@schmidtwalls.com (via Resend)
- **Content**: Employee hours, pay rates, flagged entries, project breakdown

#### Cron Setup Options

**Option A: Render Cron Job**
1. Deploy Next.js app to Render
2. Go to Dashboard → Cron Jobs → New Cron Job
3. Set command:
   ```
   curl -X POST https://your-app.onrender.com/api/cron/weekly-summary \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
4. Schedule: `0 8 * * 1` (Every Monday at 8:00 AM UTC / 3:00 AM CT)

**Option B: Supabase Edge Function**
1. Create: `supabase functions new weekly-summary`
2. In the function, call your API endpoint
3. Add to `supabase/config.toml`:
   ```toml
   [functions.weekly-summary]
   schedule = "0 14 * * 1"  # 2 PM UTC = 9 AM CT on Mondays
   ```

**Option C: Vercel Cron**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/weekly-summary",
    "schedule": "0 14 * * 1"
  }]
}
```

---

## File Structure (New Files)

```
src/
├── app/
│   ├── (customer)/
│   │   └── portal/
│   │       ├── page.tsx                      (UPDATED — clickable estimates)
│   │       └── estimate/
│   │           └── [id]/
│   │               └── page.tsx              (NEW — estimate detail + actions)
│   ├── (employee)/
│   │   ├── dashboard/
│   │   │   └── page.tsx                      (UPDATED — weather widget + Jobs nav)
│   │   ├── estimates/
│   │   │   ├── page.tsx                      (UPDATED — Jobs nav link)
│   │   │   └── [id]/
│   │   │       └── page.tsx                  (NEW — estimate detail + invoice gen)
│   │   └── jobs/
│   │       ├── page.tsx                      (NEW — Kanban board)
│   │       └── [id]/
│   │           └── page.tsx                  (NEW — job detail + photos)
│   └── api/
│       ├── weather/
│       │   └── route.ts                      (NEW)
│       ├── jobs/
│       │   ├── route.ts                      (UPDATED — more fields)
│       │   └── update-status/
│       │       └── route.ts                  (NEW)
│       ├── estimates/
│       │   └── create-invoice/
│       │       └── route.ts                  (NEW)
│       ├── customer/
│       │   └── estimate-action/
│       │       └── route.ts                  (NEW)
│       └── cron/
│           └── weekly-summary/
│               └── route.ts                  (NEW)
├── components/
│   └── shared/
│       └── WeatherWidget.tsx                 (NEW)
└── ...

supabase/
└── migrations/
    └── 20260714_features.sql                 (NEW)
```

---

## Package Dependencies

No new packages needed! All features use:
- `@supabase/supabase-js` (storage, auth, queries)
- `next` (API routes, app router)
- Native `fetch` (OpenWeatherMap, Resend APIs)

---

## Testing

1. **Weather**: Visit `/dashboard` — widget should show Omaha weather
2. **Jobs Board**: Visit `/jobs` — create a job, drag between columns
3. **Photos**: Click a job → upload a photo → verify it appears in grid
4. **Invoice**: Create an estimate, mark as accepted, visit `/estimates/[id]`, click "Generate Invoice"
5. **Customer Actions**: Log in as customer, go to `/portal`, click an estimate, accept/decline
6. **Weekly Email**: `curl -X POST http://localhost:3000/api/cron/weekly-summary -H "Authorization: Bearer YOUR_CRON_SECRET"`
