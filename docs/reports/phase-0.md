PHASE 0 REPORT
Done:
- Audited repository layout, dependencies, scripts, and legacy Firestore backup.
- Analyzed all 11 Firestore collections (config, users, rewards, debts, logs, etc.).
- Documented legacy auth model, plaintext password risk, and approval workflow.
- Mapped target business logic locations (credits, exp, ranks, rewards, streaks, debts).
- Created docs/T2E_CONTEXT.md (<100 lines) and initialized docs/T2E_PROGRESS.md.
Files:
- docs/T2E_CONTEXT.md
- docs/T2E_PROGRESS.md
- docs/reports/phase-0.md
Tested:
- Python audit of firestire_backup collections and rate calculations (passed)
- Git status check (passed)
Assumptions:
- Legacy frontend source code is absent; legacy backup and development plan form the specification.
- Debt payment calculations use rateUsed = 0.4 as established in existing data.
Verify before next phase:
- Confirm whether root docs/ or Time2Earn/docs/ is preferred as the primary documentation path.
Known issues:
- Legacy Firestore users collection contains plaintext passwords; server-authoritative reset/auth needed in Phase 3.
