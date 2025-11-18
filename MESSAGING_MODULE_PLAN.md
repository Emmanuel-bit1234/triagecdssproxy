# Messaging/Communication Module - Implementation Plan

## 📋 Overview

This document outlines the complete plan for implementing a Messaging/Communication Module that allows:
- **Direct messaging** between any logged-in users (nurses, doctors, etc.)
- **User search** to find who to message
- **Group chat** functionality
- **Admin controls** to create groups and manage members

---

## 🎯 Core Features

### 1. Direct Messaging (1-on-1)
- Any authenticated user can send messages to any other user
- Real-time or near-real-time message delivery
- Message history and conversation threads
- Read/unread status tracking
- Message timestamps

### 2. User Search
- Search users by name or email
- View user profiles (name, email, role)
- Start conversation from search results

### 3. Group Chat
- Admin can create groups
- Admin can add/remove members from groups
- Group members can send messages to the group
- Group message history
- Group metadata (name, description, created date)

### 4. Admin Features
- Create groups
- Add users to groups
- Remove users from groups
- Delete groups
- View all groups and members

---

## 🗄️ Database Schema Design

### New Tables Required

#### 1. `user_roles` Table
**Purpose:** Add role-based access control (admin, nurse, doctor, etc.)

```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin', 'doctor', 'nurse', 'user'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Primary key
- `user_id`: Foreign key to users table
- `role`: User role (admin, doctor, nurse, user)
- `created_at`: Timestamp

---

#### 2. `conversations` Table
**Purpose:** Store conversation metadata (both direct and group)

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'direct' or 'group'
  name VARCHAR(255), -- NULL for direct, group name for groups
  description TEXT, -- NULL for direct, description for groups
  created_by INTEGER REFERENCES users(id), -- NULL for direct, admin for groups
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Primary key
- `type`: 'direct' or 'group'
- `name`: Group name (NULL for direct conversations)
- `description`: Group description (NULL for direct)
- `created_by`: User who created the group (NULL for direct)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

---

#### 3. `conversation_participants` Table
**Purpose:** Track who is in each conversation

```sql
CREATE TABLE conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP, -- Track when user last read messages
  UNIQUE(conversation_id, user_id)
);
```

**Fields:**
- `id`: Primary key
- `conversation_id`: Foreign key to conversations
- `user_id`: Foreign key to users
- `joined_at`: When user joined
- `last_read_at`: Last time user read messages (for unread count)

**Indexes:**
- Unique constraint on (conversation_id, user_id)
- Index on user_id for quick lookup of user's conversations

---

#### 4. `messages` Table
**Purpose:** Store all messages (direct and group)

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image', etc.
  metadata JSONB, -- For file URLs, image URLs, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete support
);
```

**Fields:**
- `id`: Primary key
- `conversation_id`: Which conversation this message belongs to
- `sender_id`: Who sent the message
- `content`: Message text content
- `message_type`: Type of message (text, file, image)
- `metadata`: JSONB for additional data (file URLs, etc.)
- `created_at`: When message was sent
- `updated_at`: Last edit timestamp
- `deleted_at`: Soft delete timestamp

**Indexes:**
- Index on conversation_id for quick message retrieval
- Index on created_at for chronological ordering
- Index on sender_id (optional, for user message history)

---

#### 5. `message_reads` Table (Optional - for read receipts)
**Purpose:** Track which users have read which messages

```sql
CREATE TABLE message_reads (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
```

**Fields:**
- `id`: Primary key
- `message_id`: Which message was read
- `user_id`: Who read it
- `read_at`: When it was read

**Note:** This is optional. Can use `last_read_at` in `conversation_participants` for simpler unread count.

---

## 📁 File Structure

```
src/
├── routes/
│   └── messages.ts              # All messaging endpoints
├── db/
│   └── schema.ts                # Add new tables to schema
├── types/
│   └── messaging.ts             # TypeScript interfaces
├── auth/
│   └── middleware.ts            # Add adminMiddleware
└── index.ts                     # Register new routes
```

---

## 🔌 API Endpoints Design

### Base URL: `/messages`

### **Direct Messaging Endpoints**

#### 1. Search Users
**GET** `/messages/users/search?query=john`

**Query Parameters:**
- `query` (required): Search term (name or email)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "doctor"
    }
  ]
}
```

---

#### 2. Get or Create Direct Conversation
**POST** `/messages/conversations/direct`

**Body:**
```json
{
  "userId": 2
}
```

**Response:**
```json
{
  "conversation": {
    "id": 1,
    "type": "direct",
    "participants": [
      {
        "id": 1,
        "name": "Current User",
        "email": "current@example.com"
      },
      {
        "id": 2,
        "name": "Other User",
        "email": "other@example.com"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Logic:**
- Check if direct conversation already exists between two users
- If exists, return it
- If not, create new conversation and add both users as participants

---

#### 3. Get User's Conversations
**GET** `/messages/conversations`

**Query Parameters:**
- `type` (optional): Filter by 'direct' or 'group'
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "conversations": [
    {
      "id": 1,
      "type": "direct",
      "otherParticipant": {
        "id": 2,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "lastMessage": {
        "id": 10,
        "content": "Hello!",
        "senderId": 2,
        "createdAt": "2024-01-15T11:00:00Z"
      },
      "unreadCount": 2,
      "updatedAt": "2024-01-15T11:00:00Z"
    },
    {
      "id": 2,
      "type": "group",
      "name": "Emergency Team",
      "description": "Emergency department team chat",
      "participantCount": 5,
      "lastMessage": {
        "id": 15,
        "content": "Meeting at 3pm",
        "senderId": 3,
        "createdAt": "2024-01-15T10:45:00Z"
      },
      "unreadCount": 0,
      "updatedAt": "2024-01-15T10:45:00Z"
    }
  ],
  "total": 10
}
```

---

#### 4. Get Conversation Messages
**GET** `/messages/conversations/:conversationId/messages`

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50)
- `before` (optional): Get messages before this message ID (for pagination)
- `after` (optional): Get messages after this message ID

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "sender": {
        "id": 1,
        "name": "Current User",
        "email": "current@example.com"
      },
      "content": "Hello!",
      "messageType": "text",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "sender": {
        "id": 2,
        "name": "Other User",
        "email": "other@example.com"
      },
      "content": "Hi there!",
      "messageType": "text",
      "createdAt": "2024-01-15T10:31:00Z",
      "updatedAt": "2024-01-15T10:31:00Z"
    }
  ],
  "hasMore": false
}
```

---

#### 5. Send Message
**POST** `/messages/conversations/:conversationId/messages`

**Body:**
```json
{
  "content": "Hello, how are you?",
  "messageType": "text"
}
```

**Response:**
```json
{
  "message": {
    "id": 1,
    "conversationId": 1,
    "sender": {
      "id": 1,
      "name": "Current User",
      "email": "current@example.com"
    },
    "content": "Hello, how are you?",
    "messageType": "text",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation:**
- User must be a participant in the conversation
- Content cannot be empty
- Conversation must exist

---

#### 6. Mark Conversation as Read
**PUT** `/messages/conversations/:conversationId/read`

**Response:**
```json
{
  "message": "Conversation marked as read",
  "lastReadAt": "2024-01-15T11:00:00Z"
}
```

**Logic:**
- Update `last_read_at` in `conversation_participants` for current user

---

### **Group Chat Endpoints (Admin Only)**

#### 7. Create Group
**POST** `/messages/groups` (Admin only)

**Body:**
```json
{
  "name": "Emergency Team",
  "description": "Emergency department team chat",
  "userIds": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "group": {
    "id": 1,
    "type": "group",
    "name": "Emergency Team",
    "description": "Emergency department team chat",
    "createdBy": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "participants": [
      {
        "id": 1,
        "name": "User 1",
        "email": "user1@example.com"
      },
      {
        "id": 2,
        "name": "User 2",
        "email": "user2@example.com"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation:**
- User must be admin
- Name is required
- At least one user ID must be provided
- All user IDs must exist

---

#### 8. Get Group Details
**GET** `/messages/groups/:groupId`

**Response:**
```json
{
  "group": {
    "id": 1,
    "name": "Emergency Team",
    "description": "Emergency department team chat",
    "createdBy": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "participants": [
      {
        "id": 1,
        "name": "User 1",
        "email": "user1@example.com",
        "joinedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### 9. Add Users to Group
**POST** `/messages/groups/:groupId/participants` (Admin only)

**Body:**
```json
{
  "userIds": [6, 7, 8]
}
```

**Response:**
```json
{
  "message": "Users added successfully",
  "addedUsers": [
    {
      "id": 6,
      "name": "User 6",
      "email": "user6@example.com"
    }
  ]
}
```

**Validation:**
- User must be admin
- User must be creator of the group (or admin)
- User IDs must exist
- Users not already in group

---

#### 10. Remove Users from Group
**DELETE** `/messages/groups/:groupId/participants/:userId` (Admin only)

**Response:**
```json
{
  "message": "User removed from group successfully"
}
```

**Validation:**
- User must be admin
- User must be creator of the group (or admin)
- User must be a participant

---

#### 11. Get All Groups (Admin)
**GET** `/messages/groups` (Admin only)

**Query Parameters:**
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "groups": [
    {
      "id": 1,
      "name": "Emergency Team",
      "description": "Emergency department team chat",
      "participantCount": 5,
      "createdBy": {
        "id": 1,
        "name": "Admin User"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 10
}
```

---

#### 12. Delete Group
**DELETE** `/messages/groups/:groupId` (Admin only)

**Response:**
```json
{
  "message": "Group deleted successfully"
}
```

**Validation:**
- User must be admin
- User must be creator of the group (or admin)

**Note:** This will cascade delete all messages in the group (or soft delete)

---

## 🔐 Authentication & Authorization

### Middleware Requirements

1. **authMiddleware**: Required for all messaging endpoints
   - Already exists in codebase
   - Ensures user is logged in

2. **adminMiddleware**: New middleware for admin-only endpoints
   ```typescript
   // Check if user has 'admin' role
   export async function adminMiddleware(c: Context, next: Next) {
     const user = c.get('user');
     const userRole = await getUserRole(user.id);
     
     if (userRole !== 'admin') {
       return c.json({ error: 'Admin access required' }, 403);
     }
     
     await next();
   }
   ```

### Role Management

**Adding Roles to Users:**
- Add `user_roles` table
- Default role: 'user'
- Admin can assign roles via separate endpoint (optional)
- Or assign during user registration (if admin creates users)

---

## 📊 Data Flow Diagrams

### Direct Message Flow

```
User A                    API                    Database
  |                        |                        |
  |-- Search User B ------>|                        |
  |                        |-- Query users -------->|
  |                        |<-- Return results -----|
  |<-- User B info --------|                        |
  |                        |                        |
  |-- Create/Get Conv ---->|                        |
  |                        |-- Check if exists ---->|
  |                        |<-- Conversation -------|
  |                        |-- Create if needed --->|
  |<-- Conversation -------|                        |
  |                        |                        |
  |-- Send Message ------->|                        |
  |                        |-- Insert message ---->|
  |                        |-- Update conv time --->|
  |<-- Message saved ------|                        |
```

### Group Chat Flow

```
Admin                     API                    Database
  |                        |                        |
  |-- Create Group ------->|                        |
  |                        |-- Validate admin ----->|
  |                        |-- Create conversation>|
  |                        |-- Add participants --->|
  |<-- Group created ------|                        |
  |                        |                        |
  |-- Add Users ---------->|                        |
  |                        |-- Validate admin ----->|
  |                        |-- Add participants --->|
  |<-- Users added --------|                        |
```

---

## 🎨 TypeScript Types

### `src/types/messaging.ts`

```typescript
// User with role
export interface UserWithRole {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'nurse' | 'user';
}

// Conversation types
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: number;
  type: ConversationType;
  name?: string;
  description?: string;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
  participants: Array<{
    id: number;
    name: string;
    email: string;
    joinedAt: Date;
    lastReadAt?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Message types
export type MessageType = 'text' | 'file' | 'image';

export interface Message {
  id: number;
  conversationId: number;
  sender: {
    id: number;
    name: string;
    email: string;
  };
  content: string;
  messageType: MessageType;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types
export interface CreateDirectConversationRequest {
  userId: number;
}

export interface SendMessageRequest {
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, any>;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  userIds: number[];
}

export interface AddGroupParticipantsRequest {
  userIds: number[];
}

export interface ConversationListItem {
  id: number;
  type: ConversationType;
  name?: string;
  otherParticipant?: UserWithRole; // For direct messages
  participantCount?: number; // For groups
  lastMessage?: {
    id: number;
    content: string;
    senderId: number;
    createdAt: Date;
  };
  unreadCount: number;
  updatedAt: Date;
}
```

---

## 🔄 Implementation Phases

### Phase 1: Foundation
1. Add `user_roles` table and migration
2. Create admin middleware
3. Add role assignment logic
4. Update user schema/types

### Phase 2: Direct Messaging
1. Create `conversations` table
2. Create `conversation_participants` table
3. Create `messages` table
4. Implement user search endpoint
5. Implement direct conversation creation
6. Implement message sending
7. Implement message retrieval
8. Implement conversation list

### Phase 3: Group Chat
1. Implement group creation (admin)
2. Implement add/remove participants (admin)
3. Implement group listing (admin)
4. Implement group deletion (admin)
5. Update message sending to work with groups

### Phase 4: Enhancements
1. Add unread count tracking
2. Add mark as read functionality
3. Add message pagination
4. Add soft delete for messages
5. Add file/image message support (optional)

---

## 🚀 API Route Structure

### File: `src/routes/messages.ts`

```typescript
import { Hono } from 'hono';
import { authMiddleware } from '../auth/middleware.js';
import { adminMiddleware } from '../auth/middleware.js'; // New
import type { AuthVariables } from '../types/auth.js';

const messagesRoute = new Hono<{ Variables: AuthVariables }>();

// User Search
messagesRoute.get('/users/search', authMiddleware, ...);

// Direct Conversations
messagesRoute.post('/conversations/direct', authMiddleware, ...);
messagesRoute.get('/conversations', authMiddleware, ...);
messagesRoute.get('/conversations/:id', authMiddleware, ...);
messagesRoute.get('/conversations/:id/messages', authMiddleware, ...);
messagesRoute.post('/conversations/:id/messages', authMiddleware, ...);
messagesRoute.put('/conversations/:id/read', authMiddleware, ...);

// Group Chat (Admin Only)
messagesRoute.post('/groups', authMiddleware, adminMiddleware, ...);
messagesRoute.get('/groups', authMiddleware, adminMiddleware, ...);
messagesRoute.get('/groups/:id', authMiddleware, ...);
messagesRoute.post('/groups/:id/participants', authMiddleware, adminMiddleware, ...);
messagesRoute.delete('/groups/:id/participants/:userId', authMiddleware, adminMiddleware, ...);
messagesRoute.delete('/groups/:id', authMiddleware, adminMiddleware, ...);

export default messagesRoute;
```

### Register in `src/index.ts`:
```typescript
import messagesRoute from './routes/messages.js';

app.route('/messages', messagesRoute);
```

---

## 🔍 Key Implementation Details

### 1. Direct Conversation Creation Logic
```typescript
// Pseudo-code
async function getOrCreateDirectConversation(userId1: number, userId2: number) {
  // Check if conversation already exists
  const existing = await findDirectConversation(userId1, userId2);
  
  if (existing) {
    return existing;
  }
  
  // Create new conversation
  const conversation = await createConversation({
    type: 'direct',
    createdBy: null
  });
  
  // Add both users as participants
  await addParticipant(conversation.id, userId1);
  await addParticipant(conversation.id, userId2);
  
  return conversation;
}
```

### 2. Unread Count Calculation
```typescript
// For each conversation, count messages after last_read_at
async function getUnreadCount(conversationId: number, userId: number) {
  const participant = await getParticipant(conversationId, userId);
  const lastReadAt = participant.lastReadAt || participant.joinedAt;
  
  return await countMessagesAfter(conversationId, lastReadAt);
}
```

### 3. Message Ordering
- Messages ordered by `created_at` ASC (oldest first)
- For pagination, use cursor-based pagination with `before`/`after` message IDs
- Or use offset-based pagination with `limit` and `offset`

### 4. Group Participant Validation
- Before sending message to group, verify user is a participant
- Before adding/removing users, verify admin role and group ownership

---

## 📝 Database Indexes

**Recommended indexes for performance:**

```sql
-- Conversation participants
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);

-- Messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- User roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

---

## 🧪 Testing Considerations

### Test Cases to Implement:

1. **User Search**
   - Search by name
   - Search by email
   - Case-insensitive search
   - Empty results

2. **Direct Messaging**
   - Create new conversation
   - Get existing conversation
   - Send message
   - Retrieve messages
   - Unread count

3. **Group Chat**
   - Admin creates group
   - Admin adds users
   - Admin removes users
   - Non-admin cannot create groups
   - Non-admin cannot add/remove users
   - Group members can send messages

4. **Authorization**
   - Unauthenticated users cannot access
   - Non-admin cannot access admin endpoints
   - Users can only see their own conversations

---

## 🎯 Future Enhancements (Optional)

1. **Real-time Messaging**
   - WebSocket support for real-time delivery
   - Server-Sent Events (SSE) as alternative

2. **Message Features**
   - Edit messages
   - Delete messages (soft delete)
   - Reply to messages
   - Message reactions/emojis

3. **Notifications**
   - Push notifications for new messages
   - Email notifications (optional)

4. **File Attachments**
   - Upload files/images
   - Store in cloud storage (S3, etc.)
   - File size limits

5. **Message Search**
   - Search messages within conversations
   - Full-text search

6. **Typing Indicators**
   - Show when user is typing
   - Requires WebSocket/SSE

---

## 📋 Summary

This plan provides:

✅ **Complete database schema** for messaging system
✅ **Comprehensive API design** with all endpoints
✅ **Role-based access control** for admin features
✅ **Direct messaging** between any users
✅ **Group chat** with admin management
✅ **User search** functionality
✅ **TypeScript types** for type safety
✅ **Implementation phases** for gradual rollout

**Next Steps:**
1. Review and approve this plan
2. Start with Phase 1 (Foundation)
3. Implement Phase 2 (Direct Messaging)
4. Implement Phase 3 (Group Chat)
5. Add enhancements as needed

---

## ❓ Questions to Consider

1. **Real-time vs Polling**: Do you want real-time messaging (WebSocket) or polling-based?
2. **Message Limits**: Any limits on message length or file size?
3. **Message Retention**: How long to keep messages? Archive old messages?
4. **Admin Assignment**: How are admins assigned? Manual database update or admin endpoint?
5. **Group Permissions**: Should group creators have special permissions, or only admins?

Let me know if you'd like any adjustments to this plan before implementation!

