#!/bin/bash
# Full integration test: auth -> profiles -> matching -> courts -> booking -> messaging
set -e
BASE="${TEST_BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc (expected '$expected', got '$actual')"
    FAIL=$((FAIL+1))
  fi
}

echo "=== 1. REGISTRATION ==="
for i in 1 2 3 4; do
  RESP=$(curl -sv "$BASE/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"register\",\"email\":\"player${i}@test.com\",\"password\":\"password123\"}" 2>&1)
  COOKIE=$(echo "$RESP" | grep -i "set-cookie:" | head -1 | sed 's/.*set-cookie: //i' | cut -d';' -f1)
  eval "COOKIE_$i='$COOKIE'"
  check "Register player $i" "player${i}@test.com" "$RESP"
done

echo ""
echo "=== 2. PROFILE CREATION ==="
NAMES=("Alice" "Bob" "Charlie" "Dave")
AGES=(28 32 25 35)
SKILLS=(3.5 4.0 2.5 3.0)

for i in 0 1 2 3; do
  idx=$((i+1))
  eval COOKIE=\$COOKIE_$idx
  RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/profiles" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d "{\"name\":\"${NAMES[$i]}\",\"age\":${AGES[$i]},\"skill_level\":${SKILLS[$i]},\"languages\":[\"English\"],\"city\":\"Austin\"}")
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | head -n -1)
  PID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  eval "PROFILE_$idx='$PID'"
  check "Create profile ${NAMES[$i]} (201)" "201" "$CODE"
done

echo ""
echo "=== 3. MATCHING ==="
# Alice interested in Bob
RESP=$(curl -s "$BASE/api/matches" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_1\",\"target_id\":\"$PROFILE_2\",\"action\":\"interested\"}")
check "Alice -> Bob interest" "mutual" "$RESP" || check "Alice -> Bob interest" "interest_sent" "$RESP"

# Bob interested in Alice (mutual match)
RESP=$(curl -s "$BASE/api/matches" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_2\",\"target_id\":\"$PROFILE_1\",\"action\":\"interested\"}")
check "Bob -> Alice mutual match" "mutual" "$RESP"

# Check mutual matches
RESP=$(curl -s "$BASE/api/matches?profile_id=$PROFILE_1&type=mutual")
check "Alice has mutual matches" "$PROFILE_2" "$RESP"

echo ""
echo "=== 4. COURTS ==="
# GET courts for Austin (should be empty initially)
RESP=$(curl -s "$BASE/api/courts?city=Austin")
check "Courts initially empty or populated" "\[" "$RESP"

echo ""
echo "=== 5. BOOKING (auto-book at 4 players) ==="
for i in 1 2 3; do
  eval PID=\$PROFILE_$i
  RESP=$(curl -s "$BASE/api/bookings" -H "Content-Type: application/json" \
    -d "{\"profile_id\":\"$PID\",\"city\":\"Austin\"}")
  check "Player $i joins group (forming)" "forming" "$RESP"
done

# 4th player triggers auto-book
RESP=$(curl -s "$BASE/api/bookings" -H "Content-Type: application/json" \
  -d "{\"profile_id\":\"$PROFILE_4\",\"city\":\"Austin\"}")
check "4th player triggers auto-book (booked)" "booked" "$RESP"

# Get group ID
GROUP_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "=== 6. MESSAGING ==="
# Alice sends message
RESP=$(curl -s "$BASE/api/messages" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_1" \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"Hello team\"}")
check "Alice sends message (201)" "Hello team" "$RESP"

# Bob sends message
RESP=$(curl -s "$BASE/api/messages" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_2" \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"Ready to play\"}")
check "Bob sends message" "Ready to play" "$RESP"

# Get messages
RESP=$(curl -s "$BASE/api/messages?group_id=$GROUP_ID")
check "Messages retrieved" "Hello team" "$RESP"
check "Both messages present" "Ready to play" "$RESP"

echo ""
echo "=== 7. AUTH-GATING ==="
# Unauthenticated profile creation should fail
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/profiles" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker","age":25,"skill_level":3.0,"languages":["English"]}')
CODE=$(echo "$RESP" | tail -1)
check "Unauth profile creation rejected (401)" "401" "$CODE"

# Unauthenticated message should fail
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/messages" \
  -H "Content-Type: application/json" \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"sneaky\"}")
CODE=$(echo "$RESP" | tail -1)
check "Unauth message rejected (401)" "401" "$CODE"

echo ""
echo "=== 8. VALIDATION ==="
RESP=$(curl -s "$BASE/api/profiles" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_1" \
  -d '{"name":"","age":5,"skill_level":99}')
check "Invalid profile rejected" "Validation failed" "$RESP"

echo ""
echo "================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================"

exit $FAIL
