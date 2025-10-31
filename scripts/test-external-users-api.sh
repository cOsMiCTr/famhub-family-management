#!/bin/bash

# External Users Linking System - API Testing Script
# This script tests the API endpoints for the External Users Linking System
# Usage: ./scripts/test-external-users-api.sh [BASE_URL] [AUTH_TOKEN]

BASE_URL="${1:-http://localhost:5000}"
AUTH_TOKEN="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test header
print_header() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    echo -n "Testing: $test_name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check if AUTH_TOKEN is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Warning: No AUTH_TOKEN provided. Some tests will fail.${NC}"
    echo "Usage: $0 [BASE_URL] [AUTH_TOKEN]"
    echo "Example: $0 http://localhost:5000 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
fi

# ============================================
# 1. External Persons API Tests
# ============================================
print_header "1. External Persons API Tests"

# GET /api/external-persons
run_test "GET all external persons" \
    "GET" \
    "/api/external-persons" \
    "" \
    "200"

# POST /api/external-persons (create)
EXTERNAL_PERSON_DATA='{"name":"Test Friend","email":"testfriend@example.com","relationship":"Friend","notes":"Test person"}'
run_test "POST create external person" \
    "POST" \
    "/api/external-persons" \
    "$EXTERNAL_PERSON_DATA" \
    "200"

# Get the created external person ID (assuming it's in the response)
# In a real scenario, you'd parse the response JSON
EXTERNAL_PERSON_ID=1  # This would need to be extracted from the response

# GET /api/external-persons/:id/invite-status
run_test "GET invite status" \
    "GET" \
    "/api/external-persons/$EXTERNAL_PERSON_ID/invite-status" \
    "" \
    "200"

# PUT /api/external-persons/:id (update)
UPDATE_DATA='{"name":"Updated Test Friend"}'
run_test "PUT update external person" \
    "PUT" \
    "/api/external-persons/$EXTERNAL_PERSON_ID" \
    "$UPDATE_DATA" \
    "200"

# Test duplicate email (should fail)
DUPLICATE_EMAIL_DATA='{"name":"Duplicate Email","email":"testfriend@example.com","relationship":"Friend"}'
run_test "POST create with duplicate email (should fail)" \
    "POST" \
    "/api/external-persons" \
    "$DUPLICATE_EMAIL_DATA" \
    "400"

# Test invalid email format (should fail)
INVALID_EMAIL_DATA='{"name":"Invalid Email","email":"not-an-email","relationship":"Friend"}'
run_test "POST create with invalid email (should fail)" \
    "POST" \
    "/api/external-persons" \
    "$INVALID_EMAIL_DATA" \
    "400"

# ============================================
# 2. Invitations API Tests
# ============================================
print_header "2. Invitations API Tests"

# GET /api/invitations
run_test "GET all invitations" \
    "GET" \
    "/api/invitations" \
    "" \
    "200"

# GET /api/invitations?status=pending
run_test "GET pending invitations" \
    "GET" \
    "/api/invitations?status=pending" \
    "" \
    "200"

# GET /api/invitations?status=accepted
run_test "GET accepted connections" \
    "GET" \
    "/api/invitations?status=accepted" \
    "" \
    "200"

# POST /api/invitations (send invitation)
INVITATION_DATA="{\"external_person_id\":$EXTERNAL_PERSON_ID}"
run_test "POST send invitation" \
    "POST" \
    "/api/invitations" \
    "$INVITATION_DATA" \
    "201"

# Get connection ID from response (would need to parse JSON)
CONNECTION_ID=1  # This would need to be extracted from the response

# POST /api/invitations/:id/accept
run_test "POST accept invitation" \
    "POST" \
    "/api/invitations/$CONNECTION_ID/accept" \
    "" \
    "200"

# POST /api/invitations/:id/reject (create another invitation first)
# This would require creating a new invitation

# DELETE /api/invitations/:id (revoke)
run_test "DELETE revoke invitation" \
    "DELETE" \
    "/api/invitations/$CONNECTION_ID" \
    "" \
    "200"

# POST /api/invitations/:id/disconnect
run_test "POST disconnect connection" \
    "POST" \
    "/api/invitations/$CONNECTION_ID/disconnect" \
    "" \
    "200"

# ============================================
# 3. User Notifications API Tests
# ============================================
print_header "3. User Notifications API Tests"

# GET /api/user/notifications
run_test "GET user notifications" \
    "GET" \
    "/api/user/notifications" \
    "" \
    "200"

# GET /api/user/notifications?is_read=false
run_test "GET unread notifications" \
    "GET" \
    "/api/user/notifications?is_read=false" \
    "" \
    "200"

# GET /api/user/notifications/unread-count
run_test "GET unread count" \
    "GET" \
    "/api/user/notifications/unread-count" \
    "" \
    "200"

# Get notification ID (would need to parse from response)
NOTIFICATION_ID=1

# PUT /api/user/notifications/:id/read
run_test "PUT mark notification as read" \
    "PUT" \
    "/api/user/notifications/$NOTIFICATION_ID/read" \
    "" \
    "200"

# PUT /api/user/notifications/read-all
run_test "PUT mark all notifications as read" \
    "PUT" \
    "/api/user/notifications/read-all" \
    "" \
    "200"

# DELETE /api/user/notifications/:id
run_test "DELETE notification" \
    "DELETE" \
    "/api/user/notifications/$NOTIFICATION_ID" \
    "" \
    "200"

# ============================================
# 4. Linked Data API Tests
# ============================================
print_header "4. Linked Data API Tests"

# GET /api/linked-data/connections
run_test "GET linked data connections" \
    "GET" \
    "/api/linked-data/connections" \
    "" \
    "200"

# Get connection ID from response
LINKED_CONNECTION_ID=1

# GET /api/linked-data/:connectionId/expenses
run_test "GET linked expenses" \
    "GET" \
    "/api/linked-data/$LINKED_CONNECTION_ID/expenses" \
    "" \
    "200"

# GET /api/linked-data/:connectionId/income
run_test "GET linked income" \
    "GET" \
    "/api/linked-data/$LINKED_CONNECTION_ID/income" \
    "" \
    "200"

# GET /api/linked-data/:connectionId/assets
run_test "GET linked assets" \
    "GET" \
    "/api/linked-data/$LINKED_CONNECTION_ID/assets" \
    "" \
    "200"

# GET /api/linked-data/:connectionId/summary
run_test "GET linked data summary" \
    "GET" \
    "/api/linked-data/$LINKED_CONNECTION_ID/summary" \
    "" \
    "200"

# ============================================
# 5. Security Tests
# ============================================
print_header "5. Security Tests"

# Test unauthorized access (without token)
run_test "GET external persons without auth (should fail)" \
    "GET" \
    "/api/external-persons" \
    "" \
    "401" \
    ""  # Empty token

# Test invalid invitation ID
run_test "POST accept invalid invitation (should fail)" \
    "POST" \
    "/api/invitations/999999/accept" \
    "" \
    "400"

# ============================================
# Summary
# ============================================
print_header "Test Summary"

echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi

