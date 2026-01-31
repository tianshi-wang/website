# Questionnaire Web Application

A full-stack questionnaire application built with React, Express, and SQLite.

## Features

- User registration and authentication (JWT-based)
- Admin dashboard for creating questionnaires
- Support for three question types:
  - Text (free input)
  - Single Choice (radio buttons)
  - Multiple Choice (checkboxes)
- Multi-page questionnaires with pagination
- Response summary after completion
- Filter questionnaires by completion status

## Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT + bcrypt

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Running the Application

1. Start the backend server (runs on port 3001):
```bash
cd backend
npm start
```

2. Start the frontend development server (runs on port 5173):
```bash
cd frontend
npm run dev
```

3. Open http://localhost:5173 in your browser

### Default Admin Account

On first startup, a default admin user is created:
- **Email**: admin@example.com
- **Password**: admin123

## Usage

### As Admin

1. Login with the admin account
2. Click "Admin" in the navigation bar
3. Click "Create Questionnaire" to build a new questionnaire
4. Add questions with different types (text, single choice, multiple choice)
5. Set page numbers to control pagination
6. Publish the questionnaire

### As User

1. Register a new account (password must be at least 6 characters)
2. Browse available questionnaires in the Feed
3. Click "Start" to fill out a questionnaire
4. Navigate between pages using Previous/Next buttons
5. Submit your responses on the last page
6. View your summary after completion

## Project Structure

```
website/
├── backend/
│   ├── package.json
│   ├── server.js           # Express server entry point
│   ├── database.js         # SQLite database setup
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   └── routes/
│       ├── auth.js         # Login/Register endpoints
│       ├── questionnaires.js # Questionnaire CRUD
│       └── responses.js    # Response submission
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx         # Main app with routes
│       ├── index.jsx       # React entry point
│       ├── index.css       # Global styles
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Feed.jsx
│           ├── Questionnaire.jsx
│           ├── Summary.jsx
│           └── admin/
│               ├── Dashboard.jsx
│               └── CreateQuestionnaire.jsx
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Questionnaires
- `GET /api/questionnaires` - List all questionnaires
- `GET /api/questionnaires/:id` - Get questionnaire with questions
- `POST /api/questionnaires` - Create questionnaire (admin only)
- `DELETE /api/questionnaires/:id` - Delete questionnaire (admin only)

### Responses
- `POST /api/responses` - Submit questionnaire response
- `GET /api/responses/questionnaire/:id` - Get user's response
- `GET /api/responses/admin/questionnaire/:id` - Get all responses (admin)
