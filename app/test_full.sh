#!/bin/bash
# Comprehensive integration test for TennisMatch platform
# Uses cookie jars for proper session handling
BASE="http://localhost:3000"
TMPDIR=$(mktemp -d)
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc"
    echo "    expected: '$expected'"
    echo "    got: $(echo "$actual" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== 1. REGISTRATION ==="
for i in 1 2 3 4; do
  RESP=$(curl -s -c "$TMPDIR/cookie_$i.txt" "$BASE/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"register\",\"email\":\"player${i}@test.com\",\"password\":\"password123\"}")
  check "Register player $i" "player${i}@test.com" "$RESP"
done

# Duplicate registration should fail
RESP=$(curl -s "$BASE/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"register","email":"player1@test.com","password":"password123"}')
check "Duplicate registration rejected" "already registered" "$RESP"

echo ""
echo "=== 2. AUTH/ME CHECK ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/auth/me")
check "Auth/me returns user" "player1@test.com" "$RESP"

RESP=$(curl -s "$BASE/api/auth/me")
check "Auth/me without cookie returns 401" "Not authenticated" "$RESP"

echo ""
echo "=== 3. PROFILE CREATION ==="
NAMES=("Alice" "Bob" "Charlie" "Dave")
AGES=(28 32 25 35)
SKILLS=(3.5 4.0 2.5 3.0)
LANGS=('["English","Spanish"]' '["English","French"]' '["English"]' '["English","Spanish"]')

for i in 0 1 2 3; do
  idx=$((i+1))
  RESP=$(curl -s -w "\n%{http_code}" -b "$TMPDIR/cookie_$idx.txt" "$BASE/api/profiles" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${NAMES[$i]}\",\"age\":${AGES[$i]},\"skill_level\":${SKILLS[$i]},\"languages\":${LANGS[$i]},\"city\":\"Austin\",\"bio\":\"I love tennis\",\"preferred_age_min\":20,\"preferred_age_max\":40,\"preferred_skill_min\":2.0,\"preferred_skill_max\":5.0}")
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  PID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  eval "PROFILE_$idx='$PID'"
  check "Create profile ${NAMES[$i]} (201)" "201" "$CODE"
done

# One profile per user enforcement
RESP=$(curl -s -w "\n%{http_code}" -b "$TMPDIR/cookie_1.txt" "$BASE/api/profiles" \
  -H "Content-Type: application/json" \
  -d '{"name":"Duplicate","age":30,"skill_level":3.0,"languages":["English"],"city":"Austin"}')
CODE=$(echo "$RESP" | tail -1)
check "Duplicate profile rejected (409)" "409" "$CODE"

echo ""
echo "=== 4. PROFILE CRUD ==="
# GET all profiles
RESP=$(curl -s "$BASE/api/profiles")
check "List all profiles - Alice" "Alice" "$RESP"
check "List all profiles - Dave" "Dave" "$RESP"

# GET single profile
RESP=$(curl -s "$BASE/api/profiles/$PROFILE_1")
check "Get Alice profile" "Alice" "$RESP"

# PATCH profile
RESP=$(curl -s -X PATCH "$BASE/api/profiles/$PROFILE_1" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Updated bio for Alice"}')
check "Update Alice bio" "Updated bio" "$RESP"

echo ""
echo "=== 5. VALIDATION ==="
# Unauth profile should be 401 (not validation error)
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/profiles" \
  -H "Content-Type: application/json" \
  -d '{"name":"","age":5,"skill_level":99}')
CODE=$(echo "$RESP" | tail -1)
check "Unauth profile creation -> 401" "401" "$CODE"

echo ""
echo "=== 6. MATCHING ==="
# Get standouts for Alice
RESP=$(curl -s "$BASE/api/matches?profile_id=$PROFILE_1&type=standouts")
check "Alice gets standout matches" "score" "$RESP"

# Alice interested in Bob
RESP=$(curl -s "$BASE/api/matches" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_1\",\"target_id\":\"$PROFILE_2\",\"action\":\"interested\"}")
check "Alice interested in Bob" "interest" "$RESP"

# Bob interested in Alice -> mutual
RESP=$(curl -s "$BASE/api/matches" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_2\",\"target_id\":\"$PROFILE_1\",\"action\":\"interested\"}")
check "Bob -> Alice creates mutual match" "mutual" "$RESP"

# Check mutual matches
RESP=$(curl -s "$BASE/api/matches?profile_id=$PROFILE_1&type=mutual")
check "Alice has mutual with Bob" "$PROFILE_2" "$RESP"

RESP=$(curl -s "$BASE/api/matches?profile_id=$PROFILE_2&type=mutual")
check "Bob has mutual with Alice" "$PROFILE_1" "$RESP"

# Alice passes on Charlie
RESP=$(curl -s "$BASE/api/matches" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_1\",\"target_id\":\"$PROFILE_3\",\"action\":\"pass\"}")
check "Alice passes on Charlie" "passed" "$RESP"

echo ""
echo "=== 7. COURTS ==="
RESP=$(curl -s "$BASE/api/courts?city=Austin")
check "Courts for Austin returns array" "\[" "$RESP"

echo ""
echo "=== 8. BOOKING & AUTO-BOOK ==="
# Players 1-3 join group
for i in 1 2 3; do
  eval PID=\$PROFILE_$i
  RESP=$(curl -s "$BASE/api/bookings" -H "Content-Type: application/json" \
    -d "{\"profile_id\":\"$PID\",\"city\":\"Austin\"}")
  check "Player $i joins group" "forming" "$RESP"
done

# Player 4 triggers auto-book
RESP=$(curl -s "$BASE/api/bookings" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_4\",\"city\":\"Austin\"}")
check "4th player triggers auto-book" "booked" "$RESP"

GROUP_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  (Group ID: $GROUP_ID)"

# Verify booking visible
RESP=$(curl -s "$BASE/api/bookings?profile_id=$PROFILE_1")
check "Alice sees booked group" "booked" "$RESP"

echo ""
echo "=== 9. MESSAGING ==="
# Alice sends message
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/messages" \
  -H "Content-Type: application/json" \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"Hello team, excited to play!\"}")
check "Alice sends message" "Hello team" "$RESP"

# Bob sends message
RESP=$(curl -s -b "$TMPDIR/cookie_2.txt" "$BASE/api/messages" \
  -H "Content-Type: application/json" \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"See you on the court!\"}")
check "Bob sends message" "See you on the court" "$RESP"

# Get messages
RESP=$(curl -s "$BASE/api/messages?group_id=$GROUP_ID")
check "Messages retrieved - Alice" "Hello team" "$RESP"
check "Messages retrieved - Bob" "See you on the court" "$RESP"

echo ""
echo "=== 10. AUTH-GATING ==="
# Unauthenticated profile creation
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/profiles" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker","age":25,"skill_level":3.0,"languages":["English"],"city":"NYC"}')
CODE=$(echo "$RESP" | tail -1)
check "Unauth profile creation -> 401" "401" "$CODE"

# Unauthenticated messaging
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/messages" \
  -H "Content-Type: application/json" \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"sneaky\"}")
CODE=$(echo "$RESP" | tail -1)
check "Unauth messaging -> 401" "401" "$CODE"

echo ""
echo "=== 11. LOGOUT ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" -c "$TMPDIR/cookie_1.txt" "$BASE/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"logout"}')
check "Logout succeeds" "Logged out" "$RESP"

RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/auth/me")
check "After logout, /me fails" "Not authenticated" "$RESP"

echo ""
echo "=== 12. LOGIN AFTER LOGOUT ==="
RESP=$(curl -s -c "$TMPDIR/cookie_1.txt" "$BASE/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"player1@test.com","password":"password123"}')
check "Re-login succeeds" "player1@test.com" "$RESP"

RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/auth/me")
check "Auth/me works after re-login" "player1@test.com" "$RESP"

# Wrong password
RESP=$(curl -s "$BASE/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"player1@test.com","password":"wrongpassword"}')
check "Wrong password rejected" "Invalid" "$RESP"

echo ""
echo "========================================"
echo "RESULTS: $PASS passed, $FAIL failed out of $((PASS+FAIL)) tests"
echo "========================================"

# Cleanup
rm -rf "$TMPDIR"
exit $FAIL
