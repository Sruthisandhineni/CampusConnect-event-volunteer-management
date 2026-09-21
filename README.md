# CampusConnect – Event & Volunteer Management Platform

A full-stack event operations platform for campus events.

## Features

- Event creation and management
- Role-based volunteer task allocation
- QR-based event check-in
- Volunteer attendance tracking
- Real-time announcements with Socket.IO
- Live event dashboard with attendance/task statistics
- SQLite persistence through the Express backend
- React frontend with responsive UI

## Tech Stack

**Frontend:** React, Vite, Axios, Socket.IO Client, QRCode, html5-qrcode  
**Backend:** Node.js, Express, Socket.IO, better-sqlite3  
**Database:** SQLite

## Run locally

Requirements:
- Node.js 18+
- npm

Install all dependencies:

```bash
npm install
npm run install-all
```

Start frontend and backend together:

```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

The SQLite database is created automatically at `server/data/campusconnect.db`.

## Demo flow

1. Open the dashboard.
2. Create an event from the Events page.
3. Add volunteers from the Volunteers page.
4. Assign a task to a volunteer.
5. Open the event QR code.
6. Use the Check-in page to scan the QR code or enter the token manually.
7. Post an announcement and watch it appear live on connected browsers.
8. Use the dashboard to see attendance and task counts update.

## API

- `GET /api/events`
- `POST /api/events`
- `GET /api/volunteers`
- `POST /api/volunteers`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/announcements`
- `POST /api/announcements`
- `GET /api/attendance/:eventId`
- `POST /api/attendance/check-in`
- `GET /api/dashboard`

## Note for project proof

Only claim features you have actually run and verified locally. This repository is a complete implementation template for the project description; test the full flow before submitting it as evidence of your work.
