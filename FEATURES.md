# Features Tracker

## MVP (v0.1.0) - COMPLETED
- [x] Project scaffold and setup (Next.js, TypeScript, Tailwind, SQLite)
- [x] User profiles with preferences (age range, languages, skill level)
- [x] Hinge-style matching algorithm (criteria 30%, skill 40%, behavioral 30%)
- [x] Tennis court scraping system (4 cities: NY, LA, SF, London)
- [x] Auto-booking when 4 players matched in an area
- [x] Web UI (profiles, matches, courts, bookings)

## v0.2.0 - Bug Fixes & Testing
- [x] Fix stale group status after auto-booking
- [x] Customer journey E2E test script
- [x] Test report with findings

## v0.3.0 - Input Validation (Dave's Rage Test)
- [x] Full input validation (age, skill, name, languages, bio)
- [x] HTML sanitization for text fields
- [x] Invalid JSON error handling (was silently 500ing)
- [x] Self-matching prevention
- [x] Profile existence check before group join
- [x] 24 unit tests (11 new validation tests)

## v0.4.0 - UX Fixes (Karen's Chaos Test)
- [x] Single profile GET endpoint (GET /api/profiles/[id])
- [x] Profile editing (PATCH /api/profiles/[id])
- [x] Profile deletion (DELETE /api/profiles/[id])
- [x] Leave group (DELETE /api/bookings)
- [x] Human-readable time slot formatting
- [x] Validation error display in UI
- [x] Profile form resets after creation

## Planned (Post-MVP)
- [ ] iOS app
- [ ] User authentication (one profile per user)
- [ ] Real-time chat between matched players
- [ ] Rating system after matches
- [ ] Payment integration for court bookings
- [ ] Session-based profile selection
