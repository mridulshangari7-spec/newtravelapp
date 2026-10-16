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

## Not built yet

Real auth and ID/KYC, payments and escrow (e.g. Razorpay), chat, push notifications, and a shared backend (see `docs/schema.sql`). Legal review of customs and airline rules is needed before any real launch.

## Files

- `index.html`: shell
- `src/data.js`: cities, prohibited list, deal stages, demo data
- `src/app.js`: views, matching, safety gate, deal flow
- `src/styles.css`: mobile-first styles (white theme)
