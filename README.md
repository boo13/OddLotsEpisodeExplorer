# Undisclosed Case Dashboard

An interactive dashboard for exploring Undisclosed case entries with search, season filters, format filters, and a dense grid view.

## POC scope

- Uses a curated Undisclosed data set derived from the official cases index
- Keeps the existing grid-and-drawer interaction model
- Focuses on seasons and case types rather than the old dashboard topics and guest/company stats

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Radix UI

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - Start the dev server
- `npm run build` - Build for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## Data

The app reads from `src/lib/undisclosedData.ts`, which seeds the dashboard from the official Undisclosed cases index at `https://www.undisclosedpod.com/seasons-cases`.

## Notes

- The dashboard is intentionally minimal for the first Undisclosed proof of concept.
- The next pass can add richer case metadata, topics, and stats once the Undisclosed-specific data model is settled.
