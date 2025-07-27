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

# Step 2: Get NextAuth CSRF token for login
echo -e "\n2️⃣ Getting NextAuth CSRF token..."
SIGNIN_PAGE=$(curl -s -c cookies.txt "$BASE_URL/api/auth/signin")
NEXTAUTH_CSRF=$(cat cookies.txt | grep "next-auth.csrf-token" | awk '{print $7}' | cut -d'%' -f1)
echo "NextAuth CSRF Token: ${NEXTAUTH_CSRF:0:20}..."

# Step 3: Login using credentials
echo -e "\n3️⃣ Logging in to get session..."
LOGIN_RESPONSE=$(curl -s -L -c cookies.txt -b cookies.txt -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin123&csrfToken=$NEXTAUTH_CSRF&json=true")

# Check if we have a session token
SESSION_TOKEN=$(cat cookies.txt | grep "next-auth.session-token" | awk '{print $7}')
if [ -z "$SESSION_TOKEN" ]; then
  echo "❌ Failed to get session token. Login might have failed."
  echo "Login response: $LOGIN_RESPONSE"
else
  echo "✅ Session established"
fi

# Step 4: Test with session but without CSRF token (should fail with 403)
echo -e "\n4️⃣ Testing with session but WITHOUT CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PUT "$BASE_URL/api/users/profile" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"admin@example.com","department":"IT"}')
STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
echo "Status: $STATUS (Expected: 403)"
if [ "$STATUS" != "403" ]; then
  echo "Response body: $BODY"
fi

# Step 5: Get our API CSRF token
echo -e "\n5️⃣ Fetching API CSRF token..."
CSRF_RESPONSE=$(curl -s -b cookies.txt "$BASE_URL/api/auth/csrf")
echo "CSRF Response: $CSRF_RESPONSE"
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  echo "❌ Failed to get CSRF token"
  echo "Response: $CSRF_RESPONSE"
else
  echo "✅ CSRF Token: ${CSRF_TOKEN:0:20}..."
  
  # Step 6: Test with both session and CSRF token (should succeed)
  echo -e "\n6️⃣ Testing with session AND CSRF token..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PUT "$BASE_URL/api/users/profile" \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $CSRF_TOKEN" \
    -d '{"name":"Admin User Updated","email":"admin@example.com","department":"IT Support"}')
  STATUS=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  echo "Status: $STATUS (Expected: 200)"
  if [ "$STATUS" = "200" ]; then
    echo "✅ Profile updated successfully!"
    echo "Response: $BODY"
  else
    echo "❌ Failed to update profile"
    echo "Response: $BODY"
  fi
  
  # Step 7: Test with invalid CSRF token (should fail with 403)
  echo -e "\n7️⃣ Testing with INVALID CSRF token..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PUT "$BASE_URL/api/users/profile" \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: invalid-token-12345" \
    -d '{"name":"Test User","email":"admin@example.com"}')
  STATUS=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $STATUS (Expected: 403)"
fi

# Cleanup
rm -f cookies.txt

echo -e "\n✅ CSRF test completed!"