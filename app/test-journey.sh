#!/bin/bash
# Customer Journey E2E Test
BASE="http://localhost:3456"

echo "=== CUSTOMER JOURNEY TEST ==="

echo ""
echo "1. Create profiles"
P1=$(curl -s -X POST $BASE/api/profiles -H "Content-Type: application/json" -d '{"name":"Sarah Kim","age":26,"languages":["English","Korean"],"skill_level":3.0,"city":"New York","bio":"Love playing after work!","preferred_age_min":22,"preferred_age_max":40,"preferred_skill_min":2.0,"preferred_skill_max":4.5}')
echo "Profile 1: $P1" | head -c 200
echo ""

P2=$(curl -s -X POST $BASE/api/profiles -H "Content-Type: application/json" -d '{"name":"Mike Lee","age":28,"languages":["English","Korean"],"skill_level":3.2,"city":"New York","bio":"Weekend player!","preferred_age_min":22,"preferred_age_max":38,"preferred_skill_min":2.0,"preferred_skill_max":4.0}')
echo "Profile 2: $P2" | head -c 200
echo ""

P3=$(curl -s -X POST $BASE/api/profiles -H "Content-Type: application/json" -d '{"name":"John Doe","age":30,"languages":["English"],"skill_level":4.5,"city":"New York","bio":"Competitive!","preferred_age_min":25,"preferred_age_max":45,"preferred_skill_min":3.5,"preferred_skill_max":5.0}')
P4=$(curl -s -X POST $BASE/api/profiles -H "Content-Type: application/json" -d '{"name":"Anna Bell","age":25,"languages":["English","French"],"skill_level":2.8,"city":"New York","bio":"Casual fun!","preferred_age_min":20,"preferred_age_max":35,"preferred_skill_min":1.5,"preferred_skill_max":3.5}')
P5=$(curl -s -X POST $BASE/api/profiles -H "Content-Type: application/json" -d '{"name":"Tom Scott","age":35,"languages":["English"],"skill_level":3.5,"city":"New York","bio":"Tennis addict","preferred_age_min":25,"preferred_age_max":45,"preferred_skill_min":2.5,"preferred_skill_max":4.5}')
echo "Created 5 profiles total"

echo ""
echo "2. Scrape courts"
COURTS=$(curl -s -X POST $BASE/api/courts -H "Content-Type: application/json" -d '{"city":"New York"}')
echo "Courts result: $COURTS" | head -c 300
echo ""

echo ""
echo "3. List all profiles"
ALL=$(curl -s $BASE/api/profiles)
echo "All profiles: $ALL" | head -c 500
echo ""

echo ""
echo "4. Get standout matches for first profile"
# Extract first profile ID
P1_ID=$(echo "$P1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Profile ID: $P1_ID"
MATCHES=$(curl -s "$BASE/api/matches?profile_id=$P1_ID")
echo "Matches: $MATCHES" | head -c 800
echo ""

echo ""
echo "5. Express interest"
T_ID=$(echo "$P2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
INTEREST=$(curl -s -X POST $BASE/api/matches -H "Content-Type: application/json" -d "{\"profile_id\":\"$P1_ID\",\"target_id\":\"$T_ID\",\"action\":\"interested\"}")
echo "Interest: $INTEREST"

echo ""
echo "6. Mutual interest (other person interested back)"
MUTUAL=$(curl -s -X POST $BASE/api/matches -H "Content-Type: application/json" -d "{\"profile_id\":\"$T_ID\",\"target_id\":\"$P1_ID\",\"action\":\"interested\"}")
echo "Mutual: $MUTUAL"

echo ""
echo "7. Join group for auto-booking"
P3_ID=$(echo "$P3" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
P4_ID=$(echo "$P4" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
P5_ID=$(echo "$P5" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

G1=$(curl -s -X POST $BASE/api/bookings -H "Content-Type: application/json" -d "{\"profile_id\":\"$P1_ID\",\"city\":\"New York\"}")
echo "Join 1: $G1" | head -c 200
echo ""
G2=$(curl -s -X POST $BASE/api/bookings -H "Content-Type: application/json" -d "{\"profile_id\":\"$T_ID\",\"city\":\"New York\"}")
echo "Join 2: $G2" | head -c 200
echo ""
G3=$(curl -s -X POST $BASE/api/bookings -H "Content-Type: application/json" -d "{\"profile_id\":\"$P3_ID\",\"city\":\"New York\"}")
echo "Join 3: $G3" | head -c 200
echo ""
G4=$(curl -s -X POST $BASE/api/bookings -H "Content-Type: application/json" -d "{\"profile_id\":\"$P4_ID\",\"city\":\"New York\"}")
echo "Join 4 (should auto-book!): $G4" | head -c 300
echo ""

echo ""
echo "8. Check bookings"
BOOKINGS=$(curl -s "$BASE/api/bookings?profile_id=$P1_ID")
echo "Bookings: $BOOKINGS" | head -c 500
echo ""

echo ""
echo "9. Browse courts after booking"
COURTS_AFTER=$(curl -s "$BASE/api/courts?city=New%20York")
echo "Courts: $COURTS_AFTER" | head -c 500
echo ""

echo ""
echo "=== JOURNEY COMPLETE ==="
