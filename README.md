# نظام المحاسبة والإدارة — الصغير والدهشان

Frontend-first accounting and management system for El-Saghir & El-Dahshan.

## Current stack

- Next.js 16.3.5
- React 19.2.8
- TypeScript
- Tailwind CSS 4
- Lucide React
- RTL Arabic interface
- LocalStorage / SessionStorage for the current frontend phase

## Main modules

- Dashboard
- Custodies and custody financial accounts
- Custody transfers
- Expenses
- Workers and worker financial movements
- Projects and project sites
- Contractors, site assignments, advances, notes and documents
- Reports and CSV/Excel-compatible export
- Users, roles and permissions
- Profile / login / remember-me / logout
- Audit Log
- Notifications
- System backup and restore
- Data integrity diagnostics

## Financial architecture

Financial mutations are exposed through `lib/data/financial-transactions.ts` as the canonical frontend service layer. Domain-specific data modules remain responsible for their own storage and validation, while screens should use the service layer for linked financial operations whenever a combined transaction is required.

Important linked flows include:

```text
Custody
  -> Custody Transaction
  -> Expense / Worker Movement / Contractor Advance
  -> Project / Site / Person
  -> Audit Log / Notification
```

## Data integrity

`lib/data/system-integrity.ts` validates references between:

- projects and sites
- workers and worker site assignments
- contractors and contractor site assignments
- expenses and custody transactions
- contractor advances and their active site assignments
- custody financial accounts and custodities
- transfer counterpart transactions
- worker financial movements

The Settings page includes a manual integrity check for the current local dataset.

## Dates

User-facing dates use `YYYY/MM/DD`. The shared `DateInput` component provides calendar selection.

## Authentication note

Authentication is intentionally frontend-only at this stage. Credentials are stored locally for prototype purposes. A production deployment must replace this with server-side authentication, password hashing, secure sessions/cookies, server authorization and a database.

## Running locally

```bash
npm install
npm run dev
```

For Webpack mode when needed:

```bash
npm run dev -- --webpack
```

Validation commands:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The current development environment used for the last validation did not have network access to download the Next.js SWC binary, so the TypeScript and ESLint checks are the reliable local checks from that environment. Run `npm install` and `npm run build` on the development machine with normal npm registry access before deployment.

## Project workflow

- Frontend only until the frontend phase is formally closed.
- Do not add backend/database/auth services without an explicit project decision.
- Financial operations should use the canonical financial transaction service for linked movements.
- Preserve existing local data when changing storage models; migrations should be backward-compatible.
