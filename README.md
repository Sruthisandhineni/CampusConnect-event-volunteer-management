# CampusConnect – Event & Volunteer Management Platform

A full-stack campus event operations platform for creating events, managing volunteers, assigning role-based tasks, tracking attendance, and broadcasting real-time announcements.

## Features

- Event creation and management
- Role-based volunteer management
- Event-specific task allocation
- Task status tracking
- QR-based event check-in
- Volunteer attendance tracking
- Real-time announcements using Socket.IO
- Live operations dashboard
- SQLite database persistence
- Responsive React interface

## Tech Stack

### Frontend

- React
- Vite
- Axios
- Socket.IO Client
- QRCode
- html5-qrcode

### Backend

- Node.js
- Express.js
- Socket.IO
- better-sqlite3

### Database

- SQLite

## System Architecture

```text
                    CampusConnect
                         |
                  React Frontend
                         |
              +----------+----------+
              |                     |
          REST API             Socket.IO
              |                     |
              v                     v
       Express + Node.js      Real-time Events
              |
              v
           SQLite
```

## Core Modules

### 1. Event Management

Create and manage campus events with event title, description, venue, schedule, capacity, and unique QR check-in tokens.

### 2. Volunteer Management

Maintain volunteer profiles with contact information and roles such as Volunteer and Lead.

### 3. Role-Based Task Allocation

Assign event-specific tasks to volunteers and track task progress through:

```text
PENDING → IN_PROGRESS → COMPLETED
```

### 4. QR Check-in

Generate a unique QR code for each event and use the corresponding token to record volunteer attendance.

### 5. Real-Time Announcements

Broadcast event announcements to connected clients using Socket.IO without requiring a page refresh.

### 6. Live Dashboard

Display operational statistics including:

- Total events
- Total volunteers
- Attendance
- Task completion
- Event activity

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/events` | Get all events |
| POST | `/api/events` | Create an event |
| GET | `/api/volunteers` | Get volunteers |
| POST | `/api/volunteers` | Add a volunteer |
| GET | `/api/tasks` | Get tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update task status |
| GET | `/api/announcements` | Get announcements |
| POST | `/api/announcements` | Publish an announcement |
| POST | `/api/attendance/check-in` | Record attendance |
| GET | `/api/attendance/:eventId` | Get event attendance |
| GET | `/api/dashboard` | Get dashboard statistics |

## Project Structure

```text
CampusConnect/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── db.js
│   │   └── server.js
│   └── package.json
│
├── docs/
│   └── PROJECT_PROOF.md
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Running Locally

### Requirements

- Node.js 22+
- npm

### Installation

Clone the repository and install dependencies:

```bash
npm install
npm run install-all
```

### Start the Application

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

The backend runs at:

```text
http://localhost:5000
```

## Demonstrated Workflow

The application supports the following event-management workflow:

```text
Create Event
     ↓
Register Volunteers
     ↓
Assign Event Tasks
     ↓
Track Task Status
     ↓
Generate Event QR
     ↓
Volunteer Check-in
     ↓
Attendance Tracking
     ↓
Real-Time Announcements
     ↓
Live Dashboard
```

## Key Implementation Details

### Real-Time Communication

Socket.IO is used to broadcast new announcements and operational updates to connected clients in real time.

### Persistent Storage

SQLite is used as the application database, with the Express backend handling database operations.

### Attendance

Each event has a unique check-in token. The token is validated by the backend before an attendance record is created.

### Task Management

Tasks are associated with both an event and a volunteer, allowing coordinators to track event-specific responsibilities and completion status.

## Future Enhancements

- Authentication and authorization
- Separate Admin and Coordinator dashboards
- Email/SMS notifications
- Cloud database deployment
- Event analytics
- Volunteer performance reports
- Role-based access control
- Production deployment

## Project Status

Functional prototype with event management, volunteer management, task allocation, QR check-in, attendance tracking, real-time announcements, and live dashboard functionality.