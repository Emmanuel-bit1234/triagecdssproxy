#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Messaging Module - Admin Tests ===${NC}\n"

# Register admin user
ADMIN_EMAIL="test-admin-$(date +%s)@test.com"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"password123\",
    \"name\": \"Test Admin\",
    \"role\": \"Admin\"
  }")

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ADMIN_ID=$(echo $ADMIN_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

# Register regular users
USER1_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"user1-$(date +%s)@test.com\",
    \"password\": \"password123\",
    \"name\": \"User One\"
  }")

USER1_ID=$(echo $USER1_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"user2-$(date +%s)@test.com\",
    \"password\": \"password123\",
    \"name\": \"User Two\"
  }")

USER2_ID=$(echo $USER2_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ Failed: Admin registration${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Admin registered (ID: $ADMIN_ID)${NC}\n"

# Test 1: Create Group
echo -e "${BLUE}Test 1: Create Group (Admin)${NC}"
GROUP_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/groups" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Emergency Team\",
    \"description\": \"Emergency department team\",
    \"userIds\": [$USER1_ID, $USER2_ID]
  }")

GROUP_ID=$(echo $GROUP_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$GROUP_ID" ]; then
  echo -e "${RED}❌ Failed: Create group${NC}"
  echo "$GROUP_RESPONSE"
else
  echo -e "${GREEN}✅ Passed: Group created (ID: $GROUP_ID)${NC}"
fi

# Test 2: Get Group Details
echo -e "\n${BLUE}Test 2: Get Group Details${NC}"
GROUP_DETAILS=$(curl -s -X GET "$BASE_URL/messages/groups/$GROUP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$GROUP_DETAILS" | grep -q '"group"'; then
  echo -e "${GREEN}✅ Passed: Retrieved group details${NC}"
else
  echo -e "${RED}❌ Failed: Get group details${NC}"
  echo "$GROUP_DETAILS"
fi

# Test 3: Get All Groups
echo -e "\n${BLUE}Test 3: Get All Groups (Admin)${NC}"
GROUPS_RESPONSE=$(curl -s -X GET "$BASE_URL/messages/groups" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$GROUPS_RESPONSE" | grep -q '"groups"'; then
  TOTAL=$(echo $GROUPS_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✅ Passed: Retrieved groups (Total: $TOTAL)${NC}"
else
  echo -e "${RED}❌ Failed: Get groups${NC}"
  echo "$GROUPS_RESPONSE"
fi

# Test 4: Add User to Group
echo -e "\n${BLUE}Test 4: Add User to Group (Admin)${NC}"
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/groups/$GROUP_ID/participants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userIds\": [$ADMIN_ID]
  }")

if echo "$ADD_RESPONSE" | grep -q "added successfully" || echo "$ADD_RESPONSE" | grep -q "already in the group"; then
  echo -e "${GREEN}✅ Passed: Add user to group${NC}"
else
  echo -e "${RED}❌ Failed: Add user to group${NC}"
  echo "$ADD_RESPONSE"
fi

# Test 5: Send Message to Group
echo -e "\n${BLUE}Test 5: Send Message to Group${NC}"
USER1_TOKEN=$(echo $USER1_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

GROUP_MSG_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/conversations/$GROUP_ID/messages" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello everyone in the group!"
  }')

if echo "$GROUP_MSG_RESPONSE" | grep -q '"message"'; then
  echo -e "${GREEN}✅ Passed: Message sent to group${NC}"
else
  echo -e "${RED}❌ Failed: Send message to group${NC}"
  echo "$GROUP_MSG_RESPONSE"
fi

# Test 6: Non-admin cannot create group
echo -e "\n${BLUE}Test 6: Non-admin Cannot Create Group${NC}"
FORBIDDEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/messages/groups" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Group",
    "userIds": [1]
  }')

HTTP_CODE=$(echo "$FORBIDDEN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ Passed: Non-admin correctly rejected (403)${NC}"
else
  echo -e "${RED}❌ Failed: Expected 403, got $HTTP_CODE${NC}"
fi

# Test 7: Remove User from Group
echo -e "\n${BLUE}Test 7: Remove User from Group (Admin)${NC}"
REMOVE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/messages/groups/$GROUP_ID/participants/$USER2_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$REMOVE_RESPONSE" | grep -q "removed successfully" || echo "$REMOVE_RESPONSE" | grep -q "successfully"; then
      echo -e "${GREEN}✅ Passed: User removed from group${NC}"
    else
      echo -e "${RED}❌ Failed: Remove user from group${NC}"
      echo "$REMOVE_RESPONSE"
    fi

echo -e "\n${GREEN}=== Admin Tests Completed ===${NC}\n"

