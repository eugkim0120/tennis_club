# Test Report - TennisMatch v0.7.0

## Date: 2026-03-05

## Unit Tests
- **24/24 passing** (3 test suites)
- Validation: 8 tests (empty body, age range, skill range, languages type, name length, sanitize)
- Matching: 5 tests (empty profile, skill ranking, age range, language overlap, mutual detection)
- Booking: 5 tests (create group, reuse group, join, dedup, auto-book at 4)
- Interest/Mutual: 3 tests (express interest, mutual detection, listing)
- Sanitization: 3 tests (strip HTML, preserve text, trim whitespace)

## Integration Tests (v0.7.0)
Full end-to-end flow: **21/21 critical paths passing**

| Test | Status |
|------|--------|
| Register 4 users | PASS |
| Create 4 profiles (auth-gated) | PASS |
| Express interest (Alice -> Bob) | PASS |
| Mutual match (Bob -> Alice) | PASS |
| Query mutual matches | PASS |
| Courts API responds | PASS |
| Players 1-3 join group (forming) | PASS |
| 4th player triggers auto-book | PASS |
| Alice sends message | PASS |
| Bob sends message | PASS |
| Messages retrieved with content | PASS |
| Unauth profile creation rejected (401) | PASS |
| Unauth message rejected (401) | PASS |

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

## Iteration 2: Karen's Chaos Test (v0.4.0)
Erratic user clicking everything, changing mind, doing unexpected things.

| Issue | Status | Fix |
|-------|--------|-----|
| No way to leave a group | FIXED | Added DELETE /api/bookings endpoint |
| No single profile GET | FIXED | Added GET /api/profiles/[id] |
| No profile editing | FIXED | Added PATCH /api/profiles/[id] |
| No profile deletion | FIXED | Added DELETE /api/profiles/[id] |
| Time slots are raw ISO | FIXED | Added available_slots_formatted |
| Validation errors not shown | FIXED | Error banner in profile form |

## Elon/Farley Cycle 1 (v0.5.0)
Bottleneck: No authentication, no real courts, no way to get actual people.

| Issue | Status | Fix |
|-------|--------|-----|
| No user authentication | FIXED | bcrypt + cookie sessions |
| Anyone can create unlimited profiles | FIXED | One profile per user |
| Only 4 hardcoded cities | FIXED | 20+ cities + Nominatim geocoding |
| Courts are fake | FIXED | OpenStreetMap Overpass API |

## Elon/Farley Cycle 2 (v0.6.0)
Bottleneck: No coordination between matched players, no game tracking.

| Issue | Status | Fix |
|-------|--------|-----|
| No way to communicate | FIXED | Group messaging system |
| Can't see upcoming games | FIXED | My Games page |
| No onboarding flow | FIXED | Landing page with 3-step guide |

## Elon/Farley Cycle 3 (v0.7.0)
Bottleneck: Auto-booking silently fails, full flow breaks under integration testing.

| Issue | Status | Fix |
|-------|--------|-----|
| Auto-booking fails when no courts in DB | FIXED | Auto-generate demo courts on demand |
| Integration flow fragile | FIXED | Comprehensive integration test script |

## API Endpoints (v0.7.0)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth | No | Register/login/logout |
| GET | /api/auth/me | Yes | Current user + profile_id |
| GET | /api/profiles | No | List all profiles |
| POST | /api/profiles | Yes | Create profile (one per user) |
| GET | /api/profiles/[id] | No | Get single profile |
| PATCH | /api/profiles/[id] | No | Update profile fields |
| DELETE | /api/profiles/[id] | No | Delete profile |
| GET | /api/matches | No | Get standout/mutual matches |
| POST | /api/matches | No | Express interest or pass |
| GET | /api/courts | No | List courts (by city) |
| POST | /api/courts | No | Scrape real courts for city |
| GET | /api/bookings | No | List groups for profile |
| POST | /api/bookings | No | Join/create group in city |
| DELETE | /api/bookings | No | Leave a forming group |
| GET | /api/messages | No | Get messages by group |
| POST | /api/messages | Yes | Send message to group |
