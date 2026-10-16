# CarryOn

Traveller-powered delivery marketplace for India, covering domestic and international routes. People already on a trip carry sealed items for others and earn a fee.

This is a clickable MVP. It's a static web app with no build step, and data lives in the browser (`localStorage`) and is seeded with demo data.

## Run

Open `index.html` in a browser, or serve the folder: `python3 -m http.server`.

## What's in it

- **Sign-in (demo):** name + mobile number + OTP (always `1234`). A "Verify ID" button simulates KYC. Deals need a verified ID.
- **Browse:** requests and trips, filtered by domestic/international and route, with match counts.
- **I'm travelling:** publish a trip (route, date, spare kg, fee).
- **I need something:** post a request (item, value, route, deadline, weight, reward).
- **Safety gate:** before a deal is created, both sides confirm a prohibited-items checklist. International routes add a customs declaration.
- **My deals:** escrow-style stages: Accepted → Paid (held) → Picked up → Delivered → Paid out. Payments are simulated. After payout, each side can rate the other (1 to 5 stars).

Matching rule: same route, trip date on or before the deadline, and enough spare weight.

## Cloud mode (Supabase)

1. In Supabase, open **SQL Editor**, paste `supabase/schema.sql`, Run.
2. Authentication > Providers > Email: for testing, turn **Confirm email** off.
3. Put the project's anon (publishable) key into `src/config.js`. The URL is already set.
4. Host the folder as a static site (GitHub Pages works). Opening `index.html` from disk also works.

With the key set, login is email + password and trips, requests and deals are shared between users. With it empty, the app runs the offline demo. Never put a `service_role` key in this repo.

## Not built yet

Real ID/KYC, payments and escrow (e.g. Razorpay), chat, push notifications, and phone OTP (needs an SMS provider). Legal review of customs and airline rules is needed before any real launch.

## Files

- `index.html`: shell
- `src/data.js`: cities, prohibited list, deal stages, demo data
- `src/app.js`: views, matching, safety gate, deal flow
- `src/store.js`: demo (localStorage) and Supabase data layers
- `src/config.js`: Supabase URL and anon key
- `supabase/schema.sql`: tables, triggers and row level security
- `src/styles.css`: mobile-first styles (white theme)
