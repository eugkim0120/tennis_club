# Test Report - TennisMatch MVP v0.1.0

## Date: 2026-03-04

## Unit Tests
- **13/13 passing**
- Matching algorithm: 5 tests (empty profile, skill ranking, age range, language overlap)
- Booking system: 5 tests (create group, reuse group, join, dedup, auto-book at 4)
- Interest/Mutual: 3 tests (express interest, mutual detection, listing)

## Customer Journey E2E Test
All flows tested and working:

| Feature | Status | Notes |
|---------|--------|-------|
| Profile creation | PASS | All fields persist correctly |
| Profile listing | PASS | Returns all profiles ordered by creation |
| Court scraping | PASS | Seeds 4 courts for New York with time slots |
| Standout matching | PASS | Correctly ranks by composite score |
| Express interest | PASS | Creates interested status |
| Mutual matching | PASS | Detects when both sides interested |
| Group forming | PASS | Creates and reuses forming groups by city |
| Auto-booking at 4 | PASS | Books court and assigns time when 4th joins |
| Court slot removal | PASS | Booked slot removed from availability |

## Issues Found During Testing

### Critical
- None

### Medium
1. **joinGroup returns stale status**: The response after 4th player shows `status: "forming"` even though the DB is updated to "booked". The group data is fetched before auto-book mutates it. Need to re-read after autoBook.
2. **No input validation on skill_level**: Accepts values outside 1-5 range.

### Low / UX
3. **Profile selector UX**: Must manually select profile from dropdown on every page. Should use session/cookie.
4. **No loading states on initial page load**: Courts page shows "No courts found" briefly before loading.
5. **No confirmation after booking**: User should see a clear "Court booked!" banner.
6. **Time slots show as ISO strings**: Should format as "Mon Mar 4, 8:00 AM".

## Next Iteration Priorities
1. Fix stale group status after auto-book (Medium #1)
2. Add session-based profile selection
3. Improve time slot display formatting
4. Add validation for all inputs
