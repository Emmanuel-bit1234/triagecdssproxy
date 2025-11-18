#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== User Management API Tests ===${NC}\n"

# Test 1: Register Admin User
echo -e "${BLUE}Test 1: Register Admin User${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin-test-'$(date +%s)'@test.com",
    "password": "password123",
    "name": "Test Admin",
    "role": "Admin"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ADMIN_ID=$(echo $ADMIN_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ Failed: Admin registration${NC}"
  echo "$ADMIN_RESPONSE"
else
  echo -e "${GREEN}✅ Passed: Admin registered (ID: $ADMIN_ID)${NC}"
fi

# Test 2: Register Nurse User (default role)
echo -e "\n${BLUE}Test 2: Register Nurse User (default role)${NC}"
NURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nurse-test-'$(date +%s)'@test.com",
    "password": "password123",
    "name": "Test Nurse"
  }')

NURSE_TOKEN=$(echo $NURSE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
NURSE_ID=$(echo $NURSE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
NURSE_ROLE=$(echo $NURSE_RESPONSE | grep -o '"role":"[^"]*' | cut -d'"' -f4)

if [ "$NURSE_ROLE" != "Nurse" ]; then
  echo -e "${RED}❌ Failed: Should default to Nurse role${NC}"
  echo "$NURSE_RESPONSE"
else
  echo -e "${GREEN}✅ Passed: Nurse registered with default role (ID: $NURSE_ID)${NC}"
fi

# Test 3: Get All Users
echo -e "\n${BLUE}Test 3: Get All Users${NC}"
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$USERS_RESPONSE" | grep -q '"users"'; then
  TOTAL=$(echo $USERS_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✅ Passed: Retrieved users (Total: $TOTAL)${NC}"
else
  echo -e "${RED}❌ Failed: Get users${NC}"
  echo "$USERS_RESPONSE"
fi

# Test 4: Get User by ID
echo -e "\n${BLUE}Test 4: Get User by ID${NC}"
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/users/$ADMIN_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$USER_RESPONSE" | grep -q '"user"'; then
  echo -e "${GREEN}✅ Passed: Retrieved user by ID${NC}"
else
  echo -e "${RED}❌ Failed: Get user by ID${NC}"
  echo "$USER_RESPONSE"
fi

# Test 5: Update User Profile
echo -e "\n${BLUE}Test 5: Update User Profile${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/users/$NURSE_ID" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Nurse"
  }')

if echo "$UPDATE_RESPONSE" | grep -q "Updated Test Nurse"; then
  echo -e "${GREEN}✅ Passed: Updated user profile${NC}"
else
  echo -e "${RED}❌ Failed: Update user profile${NC}"
  echo "$UPDATE_RESPONSE"
fi

# Test 6: Update User Role (Admin only)
echo -e "\n${BLUE}Test 6: Update User Role (Admin)${NC}"
ROLE_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/users/$NURSE_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Doctor"
  }')

if echo "$ROLE_UPDATE_RESPONSE" | grep -q '"role":"Doctor"'; then
  echo -e "${GREEN}✅ Passed: Updated user role to Doctor${NC}"
else
  echo -e "${RED}❌ Failed: Update user role${NC}"
  echo "$ROLE_UPDATE_RESPONSE"
fi

# Test 7: Search Users
echo -e "\n${BLUE}Test 7: Search Users${NC}"
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/users/search?query=Test" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$SEARCH_RESPONSE" | grep -q '"users"'; then
  echo -e "${GREEN}✅ Passed: Search users working${NC}"
else
  echo -e "${RED}❌ Failed: Search users${NC}"
  echo "$SEARCH_RESPONSE"
fi

# Test 8: Filter by Role
echo -e "\n${BLUE}Test 8: Filter Users by Role${NC}"
FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/users?role=Admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$FILTER_RESPONSE" | grep -q '"users"'; then
  echo -e "${GREEN}✅ Passed: Filter by role working${NC}"
else
  echo -e "${RED}❌ Failed: Filter by role${NC}"
  echo "$FILTER_RESPONSE"
fi

# Test 9: Non-admin cannot update role
echo -e "\n${BLUE}Test 9: Non-admin Cannot Update Role${NC}"
FORBIDDEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/users/$ADMIN_ID/role" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Nurse"
  }')

HTTP_CODE=$(echo "$FORBIDDEN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ Passed: Non-admin correctly rejected (403)${NC}"
else
  echo -e "${RED}❌ Failed: Expected 403, got $HTTP_CODE${NC}"
  echo "$FORBIDDEN_RESPONSE"
fi

# Test 10: Invalid role validation
echo -e "\n${BLUE}Test 10: Invalid Role Validation${NC}"
INVALID_ROLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-'$(date +%s)'@test.com",
    "password": "password123",
    "name": "Invalid Role",
    "role": "InvalidRole"
  }')

HTTP_CODE=$(echo "$INVALID_ROLE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ Passed: Invalid role correctly rejected (400)${NC}"
else
  echo -e "${RED}❌ Failed: Expected 400, got $HTTP_CODE${NC}"
  echo "$INVALID_ROLE_RESPONSE"
fi

# Test 11: Email uniqueness
echo -e "\n${BLUE}Test 11: Email Uniqueness Validation${NC}"
DUPLICATE_EMAIL="duplicate-$(date +%s)@test.com"

# Register first
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DUPLICATE_EMAIL\",
    \"password\": \"password123\",
    \"name\": \"First User\"
  }" > /dev/null

# Try duplicate
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DUPLICATE_EMAIL\",
    \"password\": \"password123\",
    \"name\": \"Second User\"
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "409" ]; then
  echo -e "${GREEN}✅ Passed: Duplicate email correctly rejected (409)${NC}"
else
  echo -e "${RED}❌ Failed: Expected 409, got $HTTP_CODE${NC}"
  echo "$DUPLICATE_RESPONSE"
fi

echo -e "\n${GREEN}=== Tests Completed ===${NC}\n"

