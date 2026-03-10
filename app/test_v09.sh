#!/bin/bash
# v0.9.0 Integration Test: Auth + Profiles + Wallet + Groups + Stake + Check-in + Settle
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
    -d "{\"action\":\"register\",\"email\":\"p${i}@test.com\",\"password\":\"password123\"}")
  check "Register player $i" "p${i}@test.com" "$RESP"
done

echo ""
echo "=== 2. WALLET (auto-created on registration) ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/wallet")
check "Player 1 has wallet" "balance" "$RESP"
check "Player 1 has 100 credits" '"balance":100' "$RESP"

# Top up
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/wallet" \
  -H "Content-Type: application/json" -X POST \
  -d '{"amount":50}')
check "Top up 50 credits" '"balance":150' "$RESP"

echo ""
echo "=== 3. PROFILE CREATION ==="
NAMES=("Alice" "Bob" "Charlie" "Dave")
AGES=(28 32 25 35)
SKILLS=(3.5 4.0 2.5 3.0)

for i in 0 1 2 3; do
  idx=$((i+1))
  RESP=$(curl -s -w "\n%{http_code}" -b "$TMPDIR/cookie_$idx.txt" "$BASE/api/profiles" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${NAMES[$i]}\",\"age\":${AGES[$i]},\"skill_level\":${SKILLS[$i]},\"languages\":[\"English\"],\"city\":\"Austin\"}")
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  PID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  eval "PROFILE_$idx='$PID'"
  check "Create profile ${NAMES[$i]} (201)" "201" "$CODE"
done

echo ""
echo "=== 4. CREATE GAME (new group system) ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/groups" \
  -H "Content-Type: application/json" -X POST \
  -d '{"title":"Saturday Doubles","city":"Austin","description":"Casual game","stake_amount":10,"min_skill":2.0,"max_skill":5.0}')
check "Alice creates game" "Saturday Doubles" "$RESP"
GROUP_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  (Group ID: $GROUP_ID)"

# Check wallet was debited
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/wallet")
check "Alice's wallet debited by 10" '"balance":140' "$RESP"

echo ""
echo "=== 5. BROWSE GAMES ==="
RESP=$(curl -s "$BASE/api/groups")
check "Browse shows game" "Saturday Doubles" "$RESP"
check "Game has Austin city" "Austin" "$RESP"

RESP=$(curl -s "$BASE/api/groups?city=Austin")
check "Filter by city works" "Saturday Doubles" "$RESP"

echo ""
echo "=== 6. JOIN GAME (with stake) ==="
# Bob joins
RESP=$(curl -s -b "$TMPDIR/cookie_2.txt" "$BASE/api/groups/$GROUP_ID/apply" -X POST)
check "Bob joins game" "Bob" "$RESP"

# Charlie joins
RESP=$(curl -s -b "$TMPDIR/cookie_3.txt" "$BASE/api/groups/$GROUP_ID/apply" -X POST)
check "Charlie joins game" "Charlie" "$RESP"

# Dave joins (4th = auto-book)
RESP=$(curl -s -b "$TMPDIR/cookie_4.txt" "$BASE/api/groups/$GROUP_ID/apply" -X POST)
check "Dave joins (auto-book triggers)" "booked" "$RESP"

echo ""
echo "=== 7. NOTIFICATIONS ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/notifications")
check "Alice has notifications" "notifications" "$RESP"
check "Alice notified of joins" "joined" "$RESP"

echo ""
echo "=== 8. MESSAGING ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/messages" \
  -H "Content-Type: application/json" -X POST \
  -d "{\"group_id\":\"$GROUP_ID\",\"content\":\"Let's play!\"}")
check "Alice sends message" "play" "$RESP"

RESP=$(curl -s "$BASE/api/messages?group_id=$GROUP_ID")
check "Messages retrieved" "play" "$RESP"

echo ""
echo "=== 9. CHECK-IN ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/groups/$GROUP_ID/checkin" -X POST)
check "Alice checks in" "checked_in" "$RESP"

RESP=$(curl -s -b "$TMPDIR/cookie_2.txt" "$BASE/api/groups/$GROUP_ID/checkin" -X POST)
check "Bob checks in" "checked_in" "$RESP"

RESP=$(curl -s -b "$TMPDIR/cookie_3.txt" "$BASE/api/groups/$GROUP_ID/checkin" -X POST)
check "Charlie checks in" "checked_in" "$RESP"
# Dave is a no-show

echo ""
echo "=== 10. SETTLE GAME ==="
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/groups/$GROUP_ID/settle" -X POST)
check "Alice settles game" "attended" "$RESP"
check "Settlement shows no-shows" "noShows" "$RESP"

# Check Alice got refund + bonus
RESP=$(curl -s -b "$TMPDIR/cookie_1.txt" "$BASE/api/wallet")
check "Alice got credits back" "balance" "$RESP"

echo ""
echo "=== 11. AUTH-GATING ==="
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/groups" \
  -H "Content-Type: application/json" -X POST \
  -d '{"title":"Hack","city":"NYC"}')
CODE=$(echo "$RESP" | tail -1)
check "Unauth game creation -> 401" "401" "$CODE"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/wallet")
CODE=$(echo "$RESP" | tail -1)
check "Unauth wallet -> 401" "401" "$CODE"

echo ""
echo "=== 12. PAGE RENDERING ==="
for page in "/" "/login" "/profile" "/matches" "/games" "/courts" "/browse" "/create-game" "/notifications"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$page")
  check "GET $page -> 200" "200" "$CODE"
done

echo ""
echo "========================================"
echo "RESULTS: $PASS passed, $FAIL failed out of $((PASS+FAIL)) tests"
echo "========================================"

rm -rf "$TMPDIR"
exit $FAIL
