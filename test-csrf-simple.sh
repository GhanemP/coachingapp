#!/bin/bash

echo "🔐 Testing CSRF Protection for Profile Update"
echo "============================================"

# Base URL
BASE_URL="http://localhost:3002"

# Step 1: Test without any authentication (should fail with 401)
echo -e "\n1️⃣ Testing without authentication..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}')
STATUS=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $STATUS (Expected: 401)"

# Step 2: Get a session by logging in
echo -e "\n2️⃣ Logging in to get session..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin123&csrfToken=")
echo "Login completed"

# Step 3: Test with session but without CSRF token (should fail with 403)
echo -e "\n3️⃣ Testing with session but WITHOUT CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"admin@example.com","department":"IT"}')
STATUS=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $STATUS (Expected: 403)"

# Step 4: Get CSRF token
echo -e "\n4️⃣ Fetching CSRF token..."
CSRF_RESPONSE=$(curl -s -b cookies.txt "$BASE_URL/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

# Step 5: Test with both session and CSRF token (should succeed)
echo -e "\n5️⃣ Testing with session AND CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"name":"Admin User Updated","email":"admin@example.com","department":"IT Support"}')
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "Status: $STATUS (Expected: 200)"
if [ "$STATUS" = "200" ]; then
  echo "Response: $BODY"
fi

# Step 6: Test with invalid CSRF token (should fail with 403)
echo -e "\n6️⃣ Testing with INVALID CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: invalid-token-12345" \
  -d '{"name":"Test User","email":"admin@example.com"}')
STATUS=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $STATUS (Expected: 403)"

# Cleanup
rm -f cookies.txt

echo -e "\n✅ CSRF test completed!"