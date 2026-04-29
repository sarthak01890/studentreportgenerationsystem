# Student Report Generation System

A higher-level student report system with login/register, role-based access, teacher dashboard, and student report details.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root with your MongoDB connection and JWT secret:
   ```env
   MONGO_URI=mongodb://localhost:27017/student_report_system
   JWT_SECRET=your-secret-key
   ```
3. Start the server:
   ```bash
   npm run start
   ```
4. Open your browser at `http://localhost:5000`.

This project now uses a single frontend file at `public/index.html` and a single backend file at `server.js`.

## Pages

- `/` — landing page with login/register links
- `/login.html` — user login page
- `/register.html` — register as student, teacher, or admin
- `/dashboard.html` — profile and student dashboard

## Backend API

- `POST /api/auth/register` — register new user
- `POST /api/auth/login` — login and receive token
- `GET /api/auth/me` — get current profile
- `GET /api/students` — get student records for the current user
- `POST /api/students` — teacher/admin can add student records

## Sample JSON dataset

The project includes a sample dataset at `data/sample-data.json`.
Use this file if MongoDB is not set up yet, or run the seed script once your database is ready:

```bash
npm run seed
```

This script will create sample users and student records in MongoDB.

## Capabilities

- Role-based access for `student`, `teacher`, and `admin`
- Teachers can add student details, subjects, grades, and notes
- Students can view their own report only
- Dashboard summary cards with student count and attendance
- MongoDB-ready using `mongoose`
