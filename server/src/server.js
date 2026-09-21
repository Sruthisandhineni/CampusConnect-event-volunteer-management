import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import db from "./db.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST", "PATCH"] }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

function makeToken() {
  return crypto.randomBytes(12).toString("hex");
}

function seed() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM volunteers").get().count;
  if (count > 0) return;

  const insertVolunteer = db.prepare(
    "INSERT INTO volunteers (name, email, role, phone) VALUES (?, ?, ?, ?)"
  );
  insertVolunteer.run("Aarav Mehta", "aarav@example.com", "LEAD", "9000000001");
  insertVolunteer.run("Diya Sharma", "diya@example.com", "VOLUNTEER", "9000000002");
  insertVolunteer.run("Rohan Kumar", "rohan@example.com", "VOLUNTEER", "9000000003");

  const event = db.prepare(`
    INSERT INTO events (title, description, venue, event_date, capacity, checkin_token)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    "Campus Tech Fest",
    "Technology and innovation showcase.",
    "Main Auditorium",
    new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    200,
    makeToken()
  );

  db.prepare(`
    INSERT INTO tasks (event_id, volunteer_id, title, description)
    VALUES (?, ?, ?, ?)
  `).run(event.lastInsertRowid, 1, "Registration Desk", "Manage participant registration.");
}

seed();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "CampusConnect API" });
});

app.get("/api/events", (req, res) => {
  const rows = db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.id) AS attendance_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.event_id = e.id) AS task_count
    FROM events e
    ORDER BY event_date ASC
  `).all();
  res.json(rows);
});

app.post("/api/events", (req, res) => {
  const { title, description = "", venue, event_date, capacity = 100 } = req.body;
  if (!title || !venue || !event_date) {
    return res.status(400).json({ error: "title, venue and event_date are required" });
  }

  const result = db.prepare(`
    INSERT INTO events (title, description, venue, event_date, capacity, checkin_token)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description, venue, event_date, Number(capacity), makeToken());

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid);
  io.emit("event:created", event);
  res.status(201).json(event);
});

app.get("/api/volunteers", (req, res) => {
  res.json(db.prepare("SELECT * FROM volunteers ORDER BY name").all());
});

app.post("/api/volunteers", (req, res) => {
  const { name, email, role = "VOLUNTEER", phone = "" } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email are required" });

  try {
    const result = db.prepare(`
      INSERT INTO volunteers (name, email, role, phone)
      VALUES (?, ?, ?, ?)
    `).run(name, email, role, phone);

    const volunteer = db.prepare("SELECT * FROM volunteers WHERE id = ?").get(result.lastInsertRowid);
    io.emit("volunteer:created", volunteer);
    res.status(201).json(volunteer);
  } catch (error) {
    res.status(409).json({ error: "A volunteer with this email already exists." });
  }
});

app.get("/api/tasks", (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, e.title AS event_title, v.name AS volunteer_name
    FROM tasks t
    JOIN events e ON e.id = t.event_id
    JOIN volunteers v ON v.id = t.volunteer_id
    ORDER BY t.created_at DESC
  `).all();
  res.json(rows);
});

app.post("/api/tasks", (req, res) => {
  const { event_id, volunteer_id, title, description = "" } = req.body;
  if (!event_id || !volunteer_id || !title) {
    return res.status(400).json({ error: "event_id, volunteer_id and title are required" });
  }

  const result = db.prepare(`
    INSERT INTO tasks (event_id, volunteer_id, title, description)
    VALUES (?, ?, ?, ?)
  `).run(event_id, volunteer_id, title, description);

  const task = db.prepare(`
    SELECT t.*, e.title AS event_title, v.name AS volunteer_name
    FROM tasks t
    JOIN events e ON e.id = t.event_id
    JOIN volunteers v ON v.id = t.volunteer_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  io.emit("task:created", task);
  res.status(201).json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  const { status } = req.body;
  const allowed = ["PENDING", "IN_PROGRESS", "COMPLETED"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  io.emit("task:updated", task);
  res.json(task);
});

app.get("/api/announcements", (req, res) => {
  res.json(db.prepare(`
    SELECT a.*, e.title AS event_title
    FROM announcements a
    LEFT JOIN events e ON e.id = a.event_id
    ORDER BY a.created_at DESC
    LIMIT 20
  `).all());
});

app.post("/api/announcements", (req, res) => {
  const { event_id = null, message, created_by = "Admin" } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "message is required" });

  const result = db.prepare(`
    INSERT INTO announcements (event_id, message, created_by)
    VALUES (?, ?, ?)
  `).run(event_id || null, message.trim(), created_by);

  const announcement = db.prepare(`
    SELECT a.*, e.title AS event_title
    FROM announcements a
    LEFT JOIN events e ON e.id = a.event_id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  io.emit("announcement:new", announcement);
  res.status(201).json(announcement);
});

app.get("/api/attendance/:eventId", (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, v.name, v.email, v.role
    FROM attendance a
    JOIN volunteers v ON v.id = a.volunteer_id
    WHERE a.event_id = ?
    ORDER BY a.checked_in_at DESC
  `).all(req.params.eventId);
  res.json(rows);
});

app.post("/api/attendance/check-in", (req, res) => {
  const { token, volunteer_id } = req.body;
  if (!token || !volunteer_id) {
    return res.status(400).json({ error: "token and volunteer_id are required" });
  }

  const event = db.prepare("SELECT * FROM events WHERE checkin_token = ?").get(token);
  if (!event) return res.status(404).json({ error: "Invalid event QR token" });

  const volunteer = db.prepare("SELECT * FROM volunteers WHERE id = ?").get(volunteer_id);
  if (!volunteer) return res.status(404).json({ error: "Volunteer not found" });

  try {
    db.prepare(`
      INSERT INTO attendance (event_id, volunteer_id)
      VALUES (?, ?)
    `).run(event.id, volunteer.id);
  } catch {
    return res.status(409).json({ error: "Volunteer is already checked in for this event." });
  }

  const record = {
    event_id: event.id,
    event_title: event.title,
    volunteer_id: volunteer.id,
    volunteer_name: volunteer.name,
    checked_in_at: new Date().toISOString()
  };

  io.emit("attendance:updated", record);
  res.status(201).json(record);
});

app.get("/api/dashboard", (req, res) => {
  const events = db.prepare("SELECT COUNT(*) AS count FROM events").get().count;
  const volunteers = db.prepare("SELECT COUNT(*) AS count FROM volunteers").get().count;
  const tasks = db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
  const completedTasks = db.prepare(
    "SELECT COUNT(*) AS count FROM tasks WHERE status = 'COMPLETED'"
  ).get().count;
  const attendance = db.prepare("SELECT COUNT(*) AS count FROM attendance").get().count;

  res.json({
    events,
    volunteers,
    tasks,
    completedTasks,
    attendance,
    completionRate: tasks ? Math.round((completedTasks / tasks) * 100) : 0
  });
});

io.on("connection", (socket) => {
  socket.emit("connected", { message: "Connected to CampusConnect realtime service." });
});

httpServer.listen(PORT, () => {
  console.log(`CampusConnect API running on http://localhost:${PORT}`);
});
