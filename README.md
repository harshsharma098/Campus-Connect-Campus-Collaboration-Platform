# Campus Connect Platform

A full-stack web application for college students to collaborate, ask questions, find mentors, and manage campus events.

## Tech Stack

- **Frontend**: React + Next.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, RESTful APIs
- **Database**: SQLite (for local development - no setup required!)
- **Authentication**: JWT with role-based access control

## Project Structure

```
Campus Connect/
├── frontend/          # Next.js application
├── backend/           # Node.js Express API
└── database/          # Database schema and migrations
```

## Features

1. **Authentication & User Management**
   - User registration and login with JWT
   - Secure password hashing
   - Account lockout after multiple failed login attempts
   - Roles: Student, Mentor, Admin
   - Protected routes

2. **Q&A System**
   - Post questions and answers
   - Upvote/downvote functionality
   - Tag-based filtering
   - Search by keyword or tag

3. **Mentorship Matching**
   - Mentor profiles with skills and availability
   - Student mentorship requests
   - Skill-based matching
   - Accept/reject requests

4. **Event Management**
   - Create, update, and delete campus events
   - Event registration
   - Category and date filtering
   - Admin moderation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

**No database setup required!** We use SQLite which works out of the box.

### Quick Start

Follow the setup instructions below to get started.

### Backend Setup

```bash
cd backend
npm install
# .env file is already created with defaults
npm run migrate  # Initialize SQLite database
npm run dev      # Start server
```

### Frontend Setup

```bash
cd frontend
npm install
# .env.local is already configured
npm run dev      # Start frontend
```

The database is automatically created at `database/campus_connect.db` - no external database needed!

## Environment Variables

### Backend (.env)
```
PORT=5000
DATABASE_PATH=../database/campus_connect.db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=30m
```

**Note**: SQLite is used by default - no database server setup needed!

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## API Documentation

See `backend/API.md` for detailed API documentation.

## Project Structure Details

### Backend (`/backend`)
- `server.js` - Main Express server
- `config/database.js` - SQLite database connection
- `middleware/` - Authentication and validation middleware
- `routes/` - API route handlers (auth, questions, mentorship, events, tags)
- `utils/auth.js` - Authentication utilities (hashing, JWT, lockout)
- `scripts/migrate.js` - Database migration script

### Frontend (`/frontend`)
- `app/` - Next.js App Router pages
  - `auth/` - Login and registration pages
  - `dashboard/` - User dashboard
  - `questions/` - Q&A system pages
  - `mentorship/` - Mentorship pages
  - `events/` - Event management pages
- `components/` - Reusable React components
- `contexts/` - React context providers (AuthContext)
- `lib/api.ts` - Axios API client configuration

### Database (`/database`)
- `schema.sqlite.sql` - SQLite database schema (currently in use)
- `schema.sql` - PostgreSQL schema (reference only)

## Key Features Implementation

### Authentication & Security
- ✅ JWT-based authentication
- ✅ bcrypt password hashing
- ✅ Account lockout after 5 failed login attempts (30-minute lockout)
- ✅ Role-based access control (Student, Mentor, Admin)
- ✅ Protected routes on both frontend and backend
- ✅ Token expiration and refresh handling

### Q&A System
- ✅ Post questions with tags
- ✅ Answer questions
- ✅ Upvote/downvote questions and answers
- ✅ Accept best answers
- ✅ Search by keyword
- ✅ Filter by tags
- ✅ Pagination
- ✅ View counts

### Mentorship System
- ✅ Mentor profile creation with skills
- ✅ Student mentorship requests
- ✅ Accept/reject requests
- ✅ Active mentorship tracking
- ✅ Mentor capacity management
- ✅ Skill-based mentor search

### Event Management
- ✅ Create, update, delete events
- ✅ Event registration
- ✅ Category filtering
- ✅ Date-based filtering
- ✅ Admin approval system
- ✅ Registration deadline handling
- ✅ Participant capacity limits

## Development Notes

- The backend uses Express with SQLite (no database server needed)
- Frontend uses Next.js 14 with App Router
- All API calls are made through Axios with automatic token injection
- Authentication state is managed via React Context
- Protected routes check authentication and roles
- Error handling is implemented throughout

## Deployment Considerations

1. Set strong `JWT_SECRET` in production
2. Use environment-specific database URLs
3. Configure CORS for production domain
4. Set up SSL/HTTPS
5. Configure rate limiting appropriately
6. Set up database backups
7. Use environment variables for all sensitive data

## License

This project is ready for development and deployment.
