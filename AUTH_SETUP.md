# Authentication Setup Guide

## ✅ Authentication System Complete

Your Hono.js application now has a complete authentication system using Drizzle ORM and Neon DB.

### 🔧 What's Been Set Up

1. **Database Schema** - Users table with secure password hashing
2. **JWT Authentication** - Token-based authentication with 7-day expiration
3. **Password Security** - bcryptjs with 12 salt rounds
4. **Protected Routes** - Your `/predict` endpoint now requires authentication
5. **CORS Support** - Cross-origin requests enabled

### 📁 File Structure

```
src/
├── index.ts                 # Main app with protected routes
├── db/
│   ├── schema.ts           # Database schema
│   ├── connection.ts       # Database connection
│   └── test-connection.ts  # Connection test utility
├── auth/
│   ├── routes.ts           # Auth endpoints
│   ├── middleware.ts       # JWT middleware
│   └── utils.ts            # Password & JWT utilities
└── types/
    └── auth.ts             # TypeScript interfaces
```

### 🚀 Getting Started

1. **Set up your environment variables:**
   ```bash
   # Create .env file
   DATABASE_URL=your_neon_database_url_here
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

2. **Generate and run database migrations:**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

3. **Test the setup:**
   ```bash
   pnpm test:auth
   ```

4. **Start the server:**
   ```bash
   pnpm dev
   ```

### 🔐 API Endpoints

#### Authentication Routes

- **POST** `/auth/register` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }
  ```

- **POST** `/auth/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- **GET** `/auth/me` - Get current user (requires auth header)
- **POST** `/auth/logout` - Logout user (client-side token removal)

#### Protected Routes

- **POST** `/predict` - Your existing prediction endpoint (now requires authentication)

### 🔑 Authentication Headers

For protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer your_jwt_token_here
```

### 🛡️ Security Features

- **Password Hashing**: bcryptjs with 12 salt rounds
- **JWT Tokens**: 7-day expiration with secure secret
- **Input Validation**: Email format and password length validation
- **Error Handling**: Secure error messages without sensitive data
- **CORS**: Cross-origin request support

### 🧪 Testing the API

1. **Register a user:**
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

2. **Login:**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Use protected endpoint:**
   ```bash
   curl -X POST http://localhost:3000/predict \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"your": "prediction_data"}'
   ```

### 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm test:auth` - Test authentication setup
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema to database

Your authentication system is ready to use! 🎉
