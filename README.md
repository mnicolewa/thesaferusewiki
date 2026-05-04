## Know Your Substance

Community-first harm reduction platform focused on:
- drug interaction checks with citation-backed source data
- barcode lookup for medication/product information
- overdose prevention and first-aid education
- local community alerts for dangerous supply trends

Built with Next.js App Router and free-tier public APIs.

## APIs Used

- RxNav API: interaction checks and medication concept matching
- openFDA Drug API: medication NDC/barcode lookup
- Open Food Facts API: fallback barcode product lookup

## Local Development

Install and run:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Core Routes

- GET /api/interactions?medA=&medB=
- GET /api/barcode/[code]
- GET /api/alerts
- POST /api/alerts
- POST /api/alerts/[id]/upvote

## Notes

- Community alerts are in-memory in this MVP and reset on server restart.
- Add authentication, persistent storage, and a formal verification workflow before production rollout.

## Build Check

```bash
npm run build
```

## Disclaimer

This project is educational and informational. It is not a substitute for medical advice, diagnosis, or treatment.
