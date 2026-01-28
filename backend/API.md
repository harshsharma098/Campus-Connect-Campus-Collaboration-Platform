# Campus Connect API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Auth Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student" // optional, defaults to "student"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }
}
```

#### POST `/api/auth/login`
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }
}
```

#### GET `/api/auth/me`
Get current user information (requires authentication).

---

### Questions Routes (`/api/questions`)

#### GET `/api/questions`
Get all questions with pagination and filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search in title and content
- `tagId` - Filter by tag
- `sortBy` - Sort by: `created_at`, `views`, `votes` (default: `created_at`)
- `order` - `ASC` or `DESC` (default: `DESC`)

#### GET `/api/questions/:id`
Get single question with answers.

#### POST `/api/questions`
Create a new question (requires authentication).

**Request Body:**
```json
{
  "title": "How to prepare for interviews?",
  "content": "I need advice on preparing for technical interviews...",
  "tags": ["career", "interview", "advice"]
}
```

#### POST `/api/questions/:id/answers`
Create an answer to a question (requires authentication).

**Request Body:**
```json
{
  "content": "Here are some tips for interview preparation..."
}
```

#### POST `/api/questions/:id/vote`
Vote on a question or answer (requires authentication).

**Request Body:**
```json
{
  "votableType": "question", // or "answer"
  "voteType": "upvote" // or "downvote"
}
```

#### PATCH `/api/questions/answers/:id/accept`
Accept an answer (requires authentication, question owner only).

---

### Mentorship Routes (`/api/mentorship`)

#### GET `/api/mentorship/mentors`
Get all available mentors.

**Query Parameters:**
- `search` - Search by name or bio
- `skill` - Filter by skill

#### GET `/api/mentorship/mentors/:userId`
Get mentor profile by user ID.

#### POST `/api/mentorship/mentors`
Create or update mentor profile (requires mentor role).

**Request Body:**
```json
{
  "skills": ["JavaScript", "React", "Node.js"],
  "experienceYears": 5,
  "maxMentees": 5,
  "bio": "Experienced full-stack developer...",
  "availabilityStatus": "available"
}
```

#### GET `/api/mentorship/requests`
Get mentorship requests (requires authentication).

**Query Parameters:**
- `status` - Filter by status: `pending`, `accepted`, `rejected`

#### POST `/api/mentorship/requests`
Create mentorship request (requires student role).

**Request Body:**
```json
{
  "mentorId": 2,
  "message": "I would like to learn about web development..."
}
```

#### PATCH `/api/mentorship/requests/:id`
Accept or reject mentorship request (requires mentor role).

**Request Body:**
```json
{
  "status": "accepted" // or "rejected"
}
```

#### GET `/api/mentorship/mentorships`
Get active mentorships (requires authentication).

---

### Events Routes (`/api/events`)

#### GET `/api/events`
Get all events with filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `categoryId` - Filter by category
- `startDate` - Filter events from this date
- `endDate` - Filter events until this date
- `search` - Search in title and description
- `approvedOnly` (default: true)

#### GET `/api/events/:id`
Get single event with registrations.

#### POST `/api/events`
Create event (requires authentication).

**Request Body:**
```json
{
  "title": "Web Development Workshop",
  "description": "Learn modern web development...",
  "location": "Main Hall",
  "eventDate": "2026-02-15T10:00:00Z",
  "registrationDeadline": "2026-02-10T23:59:59Z",
  "maxParticipants": 50,
  "categoryId": 1
}
```

#### PUT `/api/events/:id`
Update event (requires authentication, creator or admin).

#### DELETE `/api/events/:id`
Delete event (requires authentication, creator or admin).

#### PATCH `/api/events/:id/approve`
Approve event (requires admin role).

#### POST `/api/events/:id/register`
Register for event (requires authentication).

#### DELETE `/api/events/:id/register`
Unregister from event (requires authentication).

#### GET `/api/events/categories/all`
Get all event categories.

---

### Tags Routes (`/api/tags`)

#### GET `/api/tags`
Get all tags with question counts.

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message here"
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Account Lockout

After 5 failed login attempts (configurable via `MAX_LOGIN_ATTEMPTS`), the account is locked for 30 minutes (configurable via `LOCKOUT_TIME`).
