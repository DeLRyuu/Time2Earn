# Time2Earn — Progress Log

## Phase 0: Project Discovery & Existing Code Audit
- **Status:** Completed
- **Stack:** React 19.3 + Vite 8.3 + TypeScript 6.0 + Firebase 13.4 + React Router DOM 7.18
- **What Exists:** Fresh Vite + React starter in `Time2Earn/src`, complete legacy Firestore backup in `Time2Earn/legacy/firestire_backup` (11 collections).
- **Key Files:**
  - `docs/T2E_RULES.md`: Global operating rules & safety constraints.
  - `docs/T2E_CONTEXT.md`: Technical context map, stack, auth model, and business logic mapping.
  - `docs/reports/phase-0.md`: Audit summary report.
- **Open Issues / Notes:** Legacy `users` collection contains plaintext passwords; debt payment calculation uses `rateUsed = 0.4` rather than global config rate.

## Phase 1: Firestore Schema & Business Logic Contract
- **Status:** Completed
- **What Exists:** Complete database schema and business logic contract in `docs/T2E_SCHEMA.md`.
- **Key Files:**
  - `docs/T2E_SCHEMA.md`: 11 Firestore collections, types, optionality, status enums, calculation formulas, and state transitions.
  - `docs/reports/phase-1.md`: Phase 1 audit report and list of UNKNOWN items.
- **Open Issues / Notes:** 4 UNKNOWN items logged for owner review before Phase 5 (credit deduction timing on redemption, session EXP formula parity, password hash migration strategy, and debt credit rate parameter in config).

