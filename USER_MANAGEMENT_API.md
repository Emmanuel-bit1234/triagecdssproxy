# User Management API Documentation

Complete guide to the User Management API for the Triage CDSS system. This API provides comprehensive user account management including role assignment, profile updates, and user listing.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Endpoints](#endpoints)
  - [Register User](#1-register-user)
  - [Get All Users](#2-get-all-users)
  - [Get User by ID](#3-get-user-by-id)
  - [Update User](#4-update-user)
  - [Update User Role](#5-update-user-role)
  - [Delete User](#6-delete-user)
  - [Search Users](#7-search-users)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

---

## Overview

The User Management API allows administrators and authorized users to:
- Register new user accounts with optional role assignment
- View all users in the system
- Update user information (name, email)
- Assign and update user roles (Admin, Doctor, Nurse, User)
- Search and filter users
- Delete user accounts

**Base URL:**
```
{IP}/users
```

---

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  "{IP}/users"
```

---

## Authorization

### Role-Based Access Control

**Admin-Only Endpoints:**
- Update user role
- Delete user
- View all users (optional - can be restricted to admin)

**All Authenticated Users:**
- View own profile
- Update own profile (name, email)
- Search users (for messaging/communication)

**Note:** Role management (assigning Admin, Doctor, etc.) should be restricted to Admin users only for security.

---

## Endpoints

### 1. Register User

Create a new user account with optional role assignment.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "Nurse"
}
```

**Required Fields:**
- `email` (string): User's email address (must be unique)
- `password` (string): User's password (minimum 6 characters)
- `name` (string): User's full name

**Optional Fields:**
- `role` (string): User's role - must be one of: `Admin`, `Doctor`, `Nurse`, `User`
  - If not provided, defaults to `Nurse`

**Validation:**
- Email must be unique (not already registered)
- Password must be at least 6 characters long
- Role must be one of the valid roles if provided

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Nurse"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Example Requests:**

**Register without role (defaults to 'Nurse'):**
```json
POST {IP}/auth/register
{
  "email": "nurse@example.com",
  "password": "password123",
  "name": "Nurse Johnson"
}
```

**Register with specific role:**
```json
POST {IP}/auth/register
{
  "email": "doctor@example.com",
  "password": "password123",
  "name": "Dr. Smith",
  "role": "Doctor"
}
```

**Register as Admin:**
```json
POST {IP}/auth/register
{
  "email": "admin@example.com",
  "password": "password123",
  "name": "Admin User",
  "role": "Admin"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields, invalid password length, or invalid role
- `409 Conflict`: Email already exists

**Notes:**
- The endpoint returns both the user object and a JWT token for immediate authentication
- Password is hashed before storage (never stored in plain text)
- New users are automatically assigned the 'Nurse' role if no role is specified
- All roles are case-sensitive: `Admin`, `Doctor`, `Nurse`, `User`

---

### 2. Get All Users

Retrieve a list of all users in the system. Can be restricted to admin-only or available to all authenticated users.

**Endpoint:** `GET /users`

**Query Parameters:**
- `role` (optional): Filter by role (`Admin`, `Doctor`, `Nurse`, `User`)
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `search` (optional): Search by name or email

**Example:**
```bash
GET /users
GET /users?role=Doctor
GET /users?search=john&limit=10
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@edtriage.co.za",
      "name": "Admin",
      "role": "Admin",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "email": "doctor@example.com",
      "name": "Dr. Smith",
      "role": "Doctor",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    },
    {
      "id": 3,
      "email": "nurse@example.com",
      "name": "Nurse Johnson",
      "role": "Nurse",
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "total": 13,
  "limit": 50,
  "offset": 0
}
```

**Notes:**
- Password hash is never returned in responses
- Results are ordered by creation date (newest first)
- Pagination is supported via `limit` and `offset`

---

### 3. Get User by ID

Retrieve a specific user by their ID.

**Endpoint:** `GET /users/:id`

**Path Parameters:**
- `id` (integer): User database ID

**Example:**
```bash
GET /users/1
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "admin@edtriage.co.za",
    "name": "Admin",
    "role": "Admin",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid user ID
- `404 Not Found`: User not found

---

### 4. Update User

Update user information (name, email). Users can update their own profile, or admins can update any user.

**Endpoint:** `PUT /users/:id`

**Path Parameters:**
- `id` (integer): User database ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

**Fields:**
- `name` (string, optional): User's full name
- `email` (string, optional): User's email address

**Validation:**
- Email must be valid format
- Email must be unique (if changed)
- At least one field must be provided

**Response (200 OK):**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "email": "updated@example.com",
    "name": "Updated Name",
    "role": "Admin",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:30:00.000Z"
  }
}
```

**Authorization:**
- Users can update their own profile
- Admins can update any user's profile

**Error Responses:**
- `400 Bad Request`: Invalid user ID, invalid email format, or email already exists
- `403 Forbidden`: User trying to update another user (non-admin)
- `404 Not Found`: User not found

---

### 5. Update User Role

Update a user's role. **Admin-only endpoint.**

**Endpoint:** `PUT /users/:id/role`

**Path Parameters:**
- `id` (integer): User database ID

**Request Body:**
```json
{
  "role": "Doctor"
}
```

**Fields:**
- `role` (string, required): New role - must be one of: `Admin`, `Doctor`, `Nurse`, `User`

**Validation:**
- Role must be one of the valid roles
- Cannot remove the last Admin user (safety check)

**Response (200 OK):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 2,
    "email": "doctor@example.com",
    "name": "Dr. Smith",
    "role": "Doctor",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-16T15:00:00.000Z"
  }
}
```

**Authorization:**
- **Admin only** - Only users with `Admin` role can update user roles

**Error Responses:**
- `400 Bad Request`: Invalid user ID or invalid role
- `403 Forbidden`: User is not an admin
- `404 Not Found`: User not found
- `409 Conflict`: Cannot remove the last Admin user

**Security Notes:**
- Role changes should be logged for audit purposes
- Consider preventing admins from removing their own admin role
- Consider preventing removal of the last admin in the system

---

### 6. Delete User

Delete a user account. **Admin-only endpoint.**

**Endpoint:** `DELETE /users/:id`

**Path Parameters:**
- `id` (integer): User database ID

**Example:**
```bash
DELETE /users/5
```

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

**Authorization:**
- **Admin only** - Only users with `Admin` role can delete users

**Validation:**
- Cannot delete the last Admin user (safety check)
- Consider soft delete instead of hard delete (optional)

**Error Responses:**
- `400 Bad Request`: Invalid user ID
- `403 Forbidden`: User is not an admin
- `404 Not Found`: User not found
- `409 Conflict`: Cannot delete the last Admin user

**Cascade Behavior:**
- Deleting a user may cascade delete related records (depending on database constraints)
- Consider what happens to:
  - Prediction logs created by the user
  - Messages sent by the user
  - Other user-related data

---

### 7. Search Users

Search for users by name or email. Useful for finding users to message or manage.

**Endpoint:** `GET /users/search`

**Query Parameters:**
- `query` (required): Search term (name or email)
- `role` (optional): Filter by role
- `limit` (optional): Number of results (default: 20)

**Example:**
```bash
GET /users/search?query=john
GET /users/search?query=doctor&role=Doctor
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 2,
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "Doctor"
    },
    {
      "id": 5,
      "email": "john.smith@example.com",
      "name": "John Smith",
      "role": "Nurse"
    }
  ],
  "total": 2
}
```

**Notes:**
- Search is case-insensitive
- Matches partial strings in name or email
- Results are limited to prevent large result sets
- Useful for user selection in messaging/communication features

---

## Data Models

### User Object

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
  createdAt: Date;
  updatedAt: Date;
}
```

**Note:** Password hash is never included in API responses.

### Register User Request

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'Admin' | 'Doctor' | 'Nurse' | 'User'; // Optional, defaults to 'Nurse'
}
```

### Update User Request

```typescript
interface UpdateUserRequest {
  name?: string;
  email?: string;
}
```

### Update Role Request

```typescript
interface UpdateRoleRequest {
  role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
}
```

### User List Response

```typescript
interface UserListResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}
```

---

## Error Handling

### 400 Bad Request

**Invalid User ID:**
```json
{
  "error": "Invalid user ID"
}
```

**Invalid Role:**
```json
{
  "error": "Invalid role. Must be one of: Admin, Doctor, Nurse, User"
}
```

**Invalid Email Format:**
```json
{
  "error": "Invalid email format"
}
```

**Missing Required Fields:**
```json
{
  "error": "At least one field (name or email) must be provided"
}
```

### 401 Unauthorized

**Missing Token:**
```json
{
  "error": "Authorization token required"
}
```

**Invalid Token:**
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden

**Not Admin:**
```json
{
  "error": "Admin access required"
}
```

**Cannot Update Other Users:**
```json
{
  "error": "You can only update your own profile"
}
```

### 404 Not Found

**User Not Found:**
```json
{
  "error": "User not found"
}
```

### 409 Conflict

**Email Already Exists:**
```json
{
  "error": "Email already exists"
}
```

**Cannot Remove Last Admin:**
```json
{
  "error": "Cannot remove the last Admin user"
}
```

### 500 Internal Server Error

**Server Error:**
```json
{
  "error": "Failed to update user"
}
```

---

## Usage Examples

### Register User

```bash
# Register without role (defaults to 'Nurse')
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nurse@example.com",
    "password": "password123",
    "name": "Nurse Johnson"
  }' \
  "{IP}/auth/register"

# Register with specific role
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123",
    "name": "Dr. Smith",
    "role": "Doctor"
  }' \
  "{IP}/auth/register"

# Register as Admin
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin User",
    "role": "Admin"
  }' \
  "{IP}/auth/register"
```

### Get All Users

```bash
curl -H "Authorization: Bearer <your-token>" \
  "{IP}/users"
```

### Get Users by Role

```bash
curl -H "Authorization: Bearer <your-token>" \
  "{IP}/users?role=Doctor"
```

### Get User by ID

```bash
curl -H "Authorization: Bearer <your-token>" \
  "{IP}/users/1"
```

### Update User Profile

```bash
curl -X PUT \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com"
  }' \
  "{IP}/users/1"
```

### Update User Role (Admin Only)

```bash
curl -X PUT \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Doctor"
  }' \
  "{IP}/users/2/role"
```

### Search Users

```bash
curl -H "Authorization: Bearer <your-token>" \
  "{IP}/users/search?query=john"
```

### Delete User (Admin Only)

```bash
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  "{IP}/users/5"
```

---

## Implementation Considerations

### Security

1. **Role Management:**
   - Only admins can change user roles
   - Prevent removal of the last admin
   - Log all role changes for audit

2. **Password Management:**
   - Password updates should be a separate endpoint (not included here)
   - Require current password for password changes
   - Consider password reset functionality

3. **Email Updates:**
   - Verify new email addresses (send confirmation email)
   - Prevent email changes that would lock out users

### Data Integrity

1. **Cascade Deletes:**
   - Decide what happens to user-related data when a user is deleted
   - Consider soft delete (mark as deleted, don't actually delete)
   - Preserve audit trails

2. **Last Admin Protection:**
   - Always maintain at least one admin user
   - Prevent deletion of the last admin
   - Prevent role change of the last admin to non-admin

### Performance

1. **Pagination:**
   - Always paginate user lists
   - Default limit should be reasonable (50 users)
   - Consider cursor-based pagination for large datasets

2. **Indexing:**
   - Index on `email` (already unique)
   - Index on `role` for filtering
   - Index on `name` for search

### Audit Trail

1. **Logging:**
   - Log all role changes
   - Log all user deletions
   - Log profile updates (optional)

2. **History:**
   - Consider storing user update history
   - Track who made changes (if admin updates another user)

---

## Future Enhancements

### Optional Features

1. **Password Management:**
   - Change password endpoint
   - Reset password endpoint
   - Password strength validation

2. **User Status:**
   - Active/Inactive status
   - Account suspension
   - Email verification status

3. **User Profile:**
   - Profile picture
   - Phone number
   - Department/Unit assignment
   - Specialization (for doctors)

4. **Bulk Operations:**
   - Bulk role updates
   - Bulk user import
   - Export user list

5. **Advanced Search:**
   - Filter by multiple roles
   - Filter by creation date
   - Sort by various fields

6. **User Statistics:**
   - Total users by role
   - Recently registered users
   - Active users count

---

## Summary

This API provides comprehensive user management capabilities:

✅ **View users** - List, search, and get user details
✅ **Update profiles** - Update name and email
✅ **Role management** - Assign and update user roles (admin-only)
✅ **User deletion** - Remove user accounts (admin-only)
✅ **Security** - Role-based access control
✅ **Validation** - Input validation and error handling

**Next Steps:**
1. Implement the endpoints according to this specification
2. Add admin middleware for role-protected endpoints
3. Add validation and error handling
4. Test all endpoints with different user roles
5. Add audit logging for sensitive operations

---

## Questions to Consider

1. **Soft Delete vs Hard Delete:** Should deleted users be permanently removed or marked as deleted?
2. **Email Verification:** Should email changes require verification?
3. **Password Updates:** Should password updates be part of this API or separate?
4. **Audit Logging:** How detailed should the audit trail be?
5. **Bulk Operations:** Are bulk user operations needed?

Let me know if you'd like any adjustments to this specification before implementation!

