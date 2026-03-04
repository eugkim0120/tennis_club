# Test Report - TennisMatch v0.4.0

## Date: 2026-03-04

## Unit Tests
- **24/24 passing** (3 test suites)
- Validation: 8 tests (empty body, age range, skill range, languages type, name length, sanitize)
- Matching: 5 tests (empty profile, skill ranking, age range, language overlap, mutual detection)
- Booking: 5 tests (create group, reuse group, join, dedup, auto-book at 4)
- Interest/Mutual: 3 tests (express interest, mutual detection, listing)
- Sanitization: 3 tests (strip HTML, preserve text, trim whitespace)

## Iteration 1: Dave's Rage Test (v0.3.0)
Angry user hammering the app with bad inputs.

| Issue | Status | Fix |
|-------|--------|-----|
| Empty profile accepted | FIXED | Full validation layer added |
| Age 900, skill 9000 accepted | FIXED | Range validation (age 13-120, skill 1-5) |
| Negative age/skill accepted | FIXED | Min value checks |
| Languages as string accepted | FIXED | Array type validation |
| XSS in bio stored raw | FIXED | HTML tag sanitization + React auto-escapes |
| Invalid JSON silently 500s | FIXED | try/catch with error response |
| Booking with fake profile | FIXED | Profile existence check before join |
| Self-matching allowed | FIXED | Prevent profile_id === target_id |
| SQL injection | ALREADY SAFE | Parameterized queries in better-sqlite3 |
| 404 handling | ALREADY WORKS | Next.js returns 404 |

## Iteration 2: Karen's Chaos Test (v0.4.0)
Erratic user clicking everything, changing mind, doing unexpected things.

| Issue | Status | Fix |
|-------|--------|-----|
| Duplicate profiles allowed | NOTED | Valid use case - users may want multiple profiles. Added delete button. |
| Self-duplicates in matches | NOTED | Will be less relevant when auth is added (one profile per user) |
| No way to leave a group | FIXED | Added DELETE /api/bookings endpoint |
| No single profile GET | FIXED | Added GET /api/profiles/[id] |
| No profile editing | FIXED | Added PATCH /api/profiles/[id] |
| No profile deletion | FIXED | Added DELETE /api/profiles/[id] |
| Time slots are raw ISO | FIXED | Added available_slots_formatted with human-readable display |
| Validation errors not shown | FIXED | Error banner in profile form |
| Can't leave booked group | BY DESIGN | Prevents abandoning committed bookings |

## API Endpoints (v0.4.0)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/profiles | List all profiles |
| POST | /api/profiles | Create profile (with validation) |
| GET | /api/profiles/[id] | Get single profile |
| PATCH | /api/profiles/[id] | Update profile fields |
| DELETE | /api/profiles/[id] | Delete profile |
| GET | /api/matches | Get standout matches for profile |
| POST | /api/matches | Express interest or pass |
| GET | /api/courts | List courts (optionally by city) |
| POST | /api/courts | Scrape courts for city |
| GET | /api/bookings | List groups for profile |
| POST | /api/bookings | Join/create group in city |
| DELETE | /api/bookings | Leave a forming group |
