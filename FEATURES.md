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

## v0.5.0 - Authentication & Real Courts (Elon/Farley Cycle 1)
- [x] User authentication (register/login/logout with bcrypt + sessions)
- [x] Cookie-based session management (httpOnly, 30-day expiry)
- [x] One profile per user enforcement (409 on duplicate)
- [x] Auth-gated profile creation and messaging
- [x] OpenStreetMap Overpass API for real tennis court data worldwide
- [x] Nominatim geocoding for unknown cities
- [x] 20+ cities in coordinate lookup table
- [x] Graceful fallback to demo data when APIs unavailable
- [x] Free-text city input (replaced dropdown)
- [x] Data source indicator (OpenStreetMap vs demo)

## v0.6.0 - Group Messaging & Games (Elon/Farley Cycle 2)
- [x] Group messaging system (auth-gated, member-verified)
- [x] Messages API (GET/POST with 1000 char limit)
- [x] My Games page with upcoming booked games
- [x] Inline chat panel in matches and games pages
- [x] Auth-aware navigation (email display, logout button)
- [x] Landing page for logged-out users with onboarding steps
- [x] Login/register toggle form

## v0.7.0 - Integration Reliability (Elon/Farley Cycle 3)
- [x] Fix auto-booking: auto-generate courts when none exist in DB for city
- [x] Full end-to-end integration test (auth -> profile -> match -> book -> chat)
- [x] Comprehensive integration test script (21/21 critical paths passing)

## Planned (Post-MVP)
- [ ] iOS app
- [ ] Rating system after matches
- [ ] Payment integration for court bookings
- [ ] Push notifications for match/booking events
- [ ] Real court booking API integrations
