#!/bin/bash

# Security Controls Testing Script
# Tests all implemented security measures for the Coaching App

set -e

echo "🔒 Starting Security Controls Testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3002"
TEST_EMAIL="security-test@example.com"
TEST_PASSWORD="TestSecure123!"
WEAK_PASSWORD="weak"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Helper functions
log_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Check if server is running
check_server() {
    log_test "Server availability"
    if curl -s -f "${BASE_URL}/api/health" > /dev/null 2>&1; then
        log_pass "Server is running and accessible"
    else
        log_fail "Server is not accessible at ${BASE_URL}"
        echo "Please start the server with: npm run dev"
        exit 1
    fi
}

# Test rate limiting
test_rate_limiting() {
    log_test "Rate limiting protection"
    
    echo "  📊 Testing authentication rate limiting..."
    local failed_requests=0
    
    for i in {1..25}; do
        response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "${BASE_URL}/api/auth/signin" \
            -H "Content-Type: application/json" \
            -d '{"email":"nonexistent@test.com","password":"wrongpassword"}' 2>/dev/null || echo "000")
        
        if [ "$response" = "429" ]; then
            log_pass "Rate limiting activated after $i requests"
            return
        fi
        
        if [ "$response" = "000" ]; then
            failed_requests=$((failed_requests + 1))
        fi
        
        # Small delay to avoid overwhelming
        sleep 0.1
    done
    
    log_fail "Rate limiting not working - completed 25 requests without 429 response"
}

# Test CSRF protection
test_csrf_protection() {
    log_test "CSRF protection"
    
    echo "  🛡️  Testing CSRF token requirement..."
    
    # Try to make a state-changing request without CSRF token
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "${BASE_URL}/api/users/password" \
        -H "Content-Type: application/json" \
        -d '{"currentPassword":"old","newPassword":"new"}' 2>/dev/null || echo "000")
    
    if [ "$response" = "403" ] || [ "$response" = "401" ]; then
        log_pass "CSRF protection active - rejected request without token"
    else
        log_fail "CSRF protection not working - request succeeded without token (HTTP $response)"
    fi
}

# Test password reset functionality
test_password_reset() {
    log_test "Password reset functionality"
    
    echo "  📧 Testing password reset request..."
    
    # Test password reset request
    response=$(curl -s -w "%{http_code}" -o /tmp/reset_response.json \
        -X POST "${BASE_URL}/api/auth/reset-password" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${TEST_EMAIL}\",\"action\":\"request\"}" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        log_pass "Password reset request endpoint working"
        
        # Check if development token is returned (for testing)
        if command -v jq >/dev/null 2>&1; then
            reset_token=$(jq -r '.resetToken // empty' /tmp/reset_response.json 2>/dev/null)
            if [ -n "$reset_token" ] && [ "$reset_token" != "null" ]; then
                echo "  🔑 Testing password reset with token..."
                
                # Test password reset with token
                reset_response=$(curl -s -w "%{http_code}" -o /dev/null \
                    -X POST "${BASE_URL}/api/auth/reset-password" \
                    -H "Content-Type: application/json" \
                    -d "{\"token\":\"${reset_token}\",\"newPassword\":\"${TEST_PASSWORD}\",\"action\":\"reset\"}" 2>/dev/null || echo "000")
                
                if [ "$reset_response" = "200" ]; then
                    log_pass "Password reset with token working"
                else
                    log_fail "Password reset with token failed (HTTP $reset_response)"
                fi
            else
                log_warning "Reset token not returned (expected in production)"
            fi
        else
            log_warning "jq not installed - cannot test token-based reset"
        fi
    else
        log_fail "Password reset request failed (HTTP $response)"
    fi
    
    # Clean up
    rm -f /tmp/reset_response.json
}

# Test password strength validation
test_password_strength() {
    log_test "Password strength validation"
    
    echo "  💪 Testing weak password rejection..."
    
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "${BASE_URL}/api/auth/reset-password" \
        -H "Content-Type: application/json" \
        -d "{\"token\":\"dummy-token\",\"newPassword\":\"${WEAK_PASSWORD}\",\"action\":\"reset\"}" 2>/dev/null || echo "000")
    
    if [ "$response" = "400" ]; then
        log_pass "Weak password rejected"
    else
        log_fail "Weak password not rejected (HTTP $response)"
    fi
}

# Test security headers
test_security_headers() {
    log_test "Security headers"
    
    echo "  🛡️  Checking security headers..."
    
    headers=$(curl -s -I "${BASE_URL}" 2>/dev/null || echo "")
    
    # Check for key security headers
    if echo "$headers" | grep -i "x-frame-options" > /dev/null; then
        log_pass "X-Frame-Options header present"
    else
        log_fail "X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -i "x-content-type-options" > /dev/null; then
        log_pass "X-Content-Type-Options header present"
    else
        log_fail "X-Content-Type-Options header missing"
    fi
    
    if echo "$headers" | grep -i "strict-transport-security" > /dev/null; then
        log_pass "Strict-Transport-Security header present"
    else
        log_fail "Strict-Transport-Security header missing"
    fi
    
    if echo "$headers" | grep -i "content-security-policy" > /dev/null; then
        log_pass "Content-Security-Policy header present"
    else
        log_fail "Content-Security-Policy header missing"
    fi
}

# Test input validation
test_input_validation() {
    log_test "Input validation"
    
    echo "  🔍 Testing malicious input rejection..."
    
    # Test XSS attempt
    xss_payload='<script>alert("xss")</script>'
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "${BASE_URL}/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${xss_payload}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"Test\",\"role\":\"AGENT\"}" 2>/dev/null || echo "000")
    
    if [ "$response" = "400" ]; then
        log_pass "XSS payload rejected"
    else
        log_fail "XSS payload not rejected (HTTP $response)"
    fi
    
    # Test SQL injection attempt
    sql_payload="'; DROP TABLE users; --"
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "${BASE_URL}/api/auth/signin" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${sql_payload}\",\"password\":\"${TEST_PASSWORD}\"}" 2>/dev/null || echo "000")
    
    if [ "$response" = "400" ] || [ "$response" = "401" ]; then
        log_pass "SQL injection attempt handled safely"
    else
        log_fail "SQL injection attempt not handled properly (HTTP $response)"
    fi
}

# Test authentication endpoints
test_authentication() {
    log_test "Authentication security"
    
    echo "  🔐 Testing authentication endpoints..."
    
    # Test access to protected endpoint without authentication
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X GET "${BASE_URL}/api/users" 2>/dev/null || echo "000")
    
    if [ "$response" = "401" ]; then
        log_pass "Protected endpoint requires authentication"
    else
        log_fail "Protected endpoint accessible without authentication (HTTP $response)"
    fi
}

# Test database security
test_database_security() {
    log_test "Database security configuration"
    
    echo "  🗄️  Checking database configuration..."
    
    # Check if using PostgreSQL (from environment)
    if grep -q "postgresql://" .env.local 2>/dev/null; then
        log_pass "Using PostgreSQL database"
    else
        log_fail "Not using PostgreSQL - security risk"
    fi
    
    # Check for SSL in connection string
    if grep -q "sslmode=" .env.local 2>/dev/null; then
        log_pass "SSL configuration present in database URL"
    else
        log_warning "SSL configuration not found in database URL"
    fi
}

# Test session security
test_session_security() {
    log_test "Session security"
    
    echo "  🍪 Testing session configuration..."
    
    # Check NEXTAUTH_SECRET strength
    if grep -q "your-secret-key-change-this-in-production" .env.local 2>/dev/null; then
        log_fail "Using default NEXTAUTH_SECRET - critical security risk"
    else
        log_pass "Custom NEXTAUTH_SECRET configured"
    fi
    
    # Check secret length (should be at least 32 characters)
    secret_length=$(grep "NEXTAUTH_SECRET=" .env.local 2>/dev/null | cut -d'"' -f2 | wc -c)
    if [ "$secret_length" -gt 32 ]; then
        log_pass "NEXTAUTH_SECRET has adequate length"
    else
        log_fail "NEXTAUTH_SECRET too short - should be at least 32 characters"
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}🔒 Coaching App Security Controls Test Suite${NC}"
    echo "=================================================="
    echo ""
    
    # Run all tests
    check_server
    echo ""
    
    test_session_security
    echo ""
    
    test_database_security
    echo ""
    
    test_security_headers
    echo ""
    
    test_authentication
    echo ""
    
    test_rate_limiting
    echo ""
    
    test_csrf_protection
    echo ""
    
    test_input_validation
    echo ""
    
    test_password_strength
    echo ""
    
    test_password_reset
    echo ""
    
    # Summary
    echo "=================================================="
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo "=================================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All security tests passed!${NC}"
        echo -e "${GREEN}✅ Application security controls are working correctly${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}⚠️  Some security tests failed!${NC}"
        echo -e "${RED}❌ Please review and fix the failing security controls${NC}"
        exit 1
    fi
}

# Run main function
main "$@"