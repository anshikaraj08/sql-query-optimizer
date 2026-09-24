# Queryline SQL Optimizer

Queryline is a focused SQL review desk for PostgreSQL queries. It identifies costly data paths, explains likely issues, and suggests indexes or query improvements.

## Features

- Analyze `SELECT` queries against a schema supplied as PostgreSQL DDL.
- Estimate query cost and highlight full-table scans, filters, joins, and index opportunities.
- Inspect the query plan, estimated impact, and parsed query structure.
- Optionally connect to PostgreSQL for live schema loading and `EXPLAIN (FORMAT JSON)` plans.

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL is optional and only required for live connection mode

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Start the frontend and backend together in development mode:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a browser.

The frontend runs on port `5173` and proxies `/api` requests to the backend on port `4000`.

## Live PostgreSQL mode

Create `backend/.env` and add a PostgreSQL connection string:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
PORT=4000
```

Restart the backend after changing `.env`, then select **Live connection** in the app. Live mode reads the public schema and runs read-only `EXPLAIN` queries with a five-second statement timeout.

Do not commit `backend/.env` or real database credentials.

## Commands

From the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the frontend and backend in watch mode |
| `npm run build` | Build the frontend for production |
| `npm run start` | Start the backend |

Backend commands can also be run from `backend/`:

```bash
npm test
npm run dev
npm start
```

## API overview

- `GET /api/health` - Backend health and live database configuration status.
- `POST /api/schema/load` - Parse supplied DDL or load the PostgreSQL catalog in live mode.
- `POST /api/analyze` - Analyze a SQL query and return findings, suggestions, and an estimated plan.
- `POST /api/explain` - Return the estimated or live PostgreSQL query plan.

The analyzer currently accepts `SELECT` statements. Queries are limited to 20 KB and DDL input is limited to 50 KB.

## Project structure

```text
backend/
  src/       Fastify API, SQL analyzer, planner, rewrite rules, and PostgreSQL integration
  test/      Node.js tests for analysis behavior
frontend/
  src/       React interface and API client
```

## License

No license has been specified yet.