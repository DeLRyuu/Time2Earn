PHASE 1 REPORT
Done:
- Audited all 11 Firestore collections and documented fields, types, and optionality.
- Analyzed status enums for session, redemption, debt, and payment requests.
- Decoded exact session credit & EXP calculations (Math.floor formula and 1:1 ratio).
- Documented 12 rank thresholds, reward eligibility, cooldowns, and streak rules.
- Defined atomic Firestore state transitions on approve/reject for all flows.
- Created docs/T2E_SCHEMA.md and logged 4 UNKNOWN items for owner review.
Files:
- docs/T2E_SCHEMA.md
- docs/T2E_PROGRESS.md
- docs/reports/phase-1.md
Tested:
- Python schema analysis across all 215 sessions, 37 redemptions, and 24 users (passed)
- Git status check (passed)
Assumptions:
- Session EXP awards match awarded integer credits 1:1 based on historical approval logs.
- Debt payment conversion rate is 0.4 (rateUsed) per backup records.
Verify before next phase:
- Review 4 UNKNOWN items (redemption credit deduction timing, session EXP calculation, password hash upgrade, and config parameter for debt payment rate).
Known issues:
- Legacy users collection stores plaintext passwords; upgrade path needed in Phase 3.
