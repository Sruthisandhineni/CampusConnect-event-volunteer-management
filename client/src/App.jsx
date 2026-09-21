import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "./api";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";

const socket = io("http://localhost:5000");

function Layout({ children }) {
  const nav = [
    ["Dashboard", "/"],
    ["Events", "/events"],
    ["Volunteers", "/volunteers"],
    ["Tasks", "/tasks"],
    ["Announcements", "/announcements"],
    ["Check-in", "/checkin"]
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">CampusConnect</div>
        <div className="subtitle">Event & Volunteer Management</div>
        <nav>
          {nav.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) => isActive ? "nav active" : "nav"}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  const load = async () => {
    const [s, a] = await Promise.all([
      api.get("/dashboard"),
      api.get("/announcements")
    ]);
    setStats(s.data);
    setAnnouncements(a.data);
  };

  useEffect(() => {
    load();
    const events = ["announcement:new", "attendance:updated", "task:updated", "task:created", "event:created"];
    events.forEach((event) => socket.on(event, load));
    return () => events.forEach((event) => socket.off(event, load));
  }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Live overview of campus event operations."
        action={<span className="live"><span className="dot" /> Live</span>}
      />
      <div className="stats-grid">
        <Stat label="Events" value={stats.events} />
        <Stat label="Volunteers" value={stats.volunteers} />
        <Stat label="Attendance" value={stats.attendance} />
        <Stat label="Task Completion" value={`${stats.completionRate}%`} />
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Recent Announcements</h2>
          <Link to="/announcements">View all</Link>
        </div>
        {announcements.length === 0 ? <Empty text="No announcements yet." /> :
          announcements.slice(0, 5).map(a => (
            <div className="announcement-row" key={a.id}>
              <div>
                <strong>{a.message}</strong>
                <span>{a.event_title || "All events"} · {a.created_by}</span>
              </div>
              <small>{new Date(a.created_at).toLocaleString()}</small>
            </div>
          ))
        }
      </section>
    </>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", venue: "", event_date: "", capacity: 100 });
  const [selected, setSelected] = useState(null);

  const load = () => api.get("/events").then(r => setEvents(r.data));
  useEffect(() => {
    load();
    socket.on("event:created", load);
    return () => socket.off("event:created", load);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/events", form);
    setForm({ title: "", description: "", venue: "", event_date: "", capacity: 100 });
  };

  return (
    <>
      <PageHeader title="Events" subtitle="Create and manage campus events." />
      <div className="two-col">
        <form className="panel form" onSubmit={submit}>
          <h2>Create Event</h2>
          <input required placeholder="Event title" value={form.title} onChange={e => setForm({...form, title:e.target.value})} />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
          <input required placeholder="Venue" value={form.venue} onChange={e => setForm({...form, venue:e.target.value})} />
          <input required type="datetime-local" value={form.event_date} onChange={e => setForm({...form, event_date:e.target.value})} />
          <input type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={e => setForm({...form, capacity:e.target.value})} />
          <button>Create Event</button>
        </form>

        <div className="panel">
          <h2>Event List</h2>
          {events.map(event => (
            <div className="card" key={event.id}>
              <div>
                <h3>{event.title}</h3>
                <p>{event.venue} · {new Date(event.event_date).toLocaleString()}</p>
                <div className="badges">
                  <span>{event.attendance_count}/{event.capacity} checked in</span>
                  <span>{event.task_count} tasks</span>
                </div>
              </div>
              <button className="secondary" onClick={() => setSelected(event)}>QR Code</button>
            </div>
          ))}
        </div>
      </div>

      {selected && <Modal onClose={() => setSelected(null)}>
        <h2>Check-in QR — {selected.title}</h2>
        <div className="qr"><QRCodeSVG value={selected.checkin_token} size={220} /></div>
        <p className="muted">Scan this QR using the Check-in page.</p>
        <code className="token">{selected.checkin_token}</code>
      </Modal>}
    </>
  );
}

function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState({ name:"", email:"", role:"VOLUNTEER", phone:"" });

  const load = () => api.get("/volunteers").then(r => setVolunteers(r.data));
  useEffect(() => {
    load();
    socket.on("volunteer:created", load);
    return () => socket.off("volunteer:created", load);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/volunteers", form);
    setForm({ name:"", email:"", role:"VOLUNTEER", phone:"" });
  };

  return (
    <>
      <PageHeader title="Volunteers" subtitle="Manage volunteer profiles and roles." />
      <div className="two-col">
        <form className="panel form" onSubmit={submit}>
          <h2>Add Volunteer</h2>
          <input required placeholder="Full name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} />
          <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} />
          <select value={form.role} onChange={e => setForm({...form,role:e.target.value})}>
            <option>VOLUNTEER</option><option>LEAD</option><option>COORDINATOR</option>
          </select>
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} />
          <button>Add Volunteer</button>
        </form>
        <div className="panel">
          <h2>Volunteer Directory</h2>
          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>{volunteers.map(v => <tr key={v.id}><td>{v.name}</td><td><span className="role">{v.role}</span></td><td>{v.email}</td><td>{v.phone || "—"}</td></tr>)}</tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState({ event_id:"", volunteer_id:"", title:"", description:"" });

  const load = async () => {
    const [t,e,v] = await Promise.all([api.get("/tasks"),api.get("/events"),api.get("/volunteers")]);
    setTasks(t.data); setEvents(e.data); setVolunteers(v.data);
  };
  useEffect(() => {
    load();
    socket.on("task:created", load);
    socket.on("task:updated", load);
    return () => { socket.off("task:created", load); socket.off("task:updated", load); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/tasks", form);
    setForm({ event_id:"", volunteer_id:"", title:"", description:"" });
  };

  const update = async (id, status) => api.patch(`/tasks/${id}`, {status});

  return (
    <>
      <PageHeader title="Task Allocation" subtitle="Assign event responsibilities by volunteer role." />
      <div className="two-col">
        <form className="panel form" onSubmit={submit}>
          <h2>Assign Task</h2>
          <select required value={form.event_id} onChange={e=>setForm({...form,event_id:e.target.value})}>
            <option value="">Select event</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <select required value={form.volunteer_id} onChange={e=>setForm({...form,volunteer_id:e.target.value})}>
            <option value="">Select volunteer</option>{volunteers.map(v=><option key={v.id} value={v.id}>{v.name} ({v.role})</option>)}
          </select>
          <input required placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          <textarea placeholder="Task details" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          <button>Assign Task</button>
        </form>
        <div className="panel">
          <h2>Live Task Board</h2>
          {tasks.map(t => <div className="task" key={t.id}>
            <div><strong>{t.title}</strong><span>{t.event_title} · {t.volunteer_name}</span><small>{t.description}</small></div>
            <select value={t.status} onChange={e=>update(t.id,e.target.value)}>
              <option>PENDING</option><option>IN_PROGRESS</option><option>COMPLETED</option>
            </select>
          </div>)}
        </div>
      </div>
    </>
  );
}

function Announcements() {
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({event_id:"", message:"", created_by:"Admin"});

  const load = async () => {
    const [a,e] = await Promise.all([api.get("/announcements"), api.get("/events")]);
    setItems(a.data); setEvents(e.data);
  };
  useEffect(() => {
    load();
    const handler = (a) => setItems(prev => [a, ...prev]);
    socket.on("announcement:new", handler);
    return () => socket.off("announcement:new", handler);
  }, []);

  const submit = async e => {
    e.preventDefault();
    await api.post("/announcements", form);
    setForm({...form,message:""});
  };

  return (
    <>
      <PageHeader title="Real-time Announcements" subtitle="Broadcast operational updates instantly to connected clients." />
      <form className="panel form" onSubmit={submit}>
        <div className="inline">
          <select value={form.event_id} onChange={e=>setForm({...form,event_id:e.target.value})}>
            <option value="">All events</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <input placeholder="Posted by" value={form.created_by} onChange={e=>setForm({...form,created_by:e.target.value})} />
        </div>
        <textarea required placeholder="Type announcement..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})} />
        <button>Publish Announcement</button>
      </form>
      <div className="panel">
        {items.map(a=><div className="announcement" key={a.id}><strong>{a.message}</strong><span>{a.event_title || "All events"} · {a.created_by} · {new Date(a.created_at).toLocaleString()}</span></div>)}
      </div>
    </>
  );
}

function CheckIn() {
  const [volunteers, setVolunteers] = useState([]);
  const [token, setToken] = useState("");
  const [volunteerId, setVolunteerId] = useState("");
  const [result, setResult] = useState("");
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    api.get("/volunteers").then(r=>setVolunteers(r.data));
  }, []);

  useEffect(() => {
    let scanner;
    try {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 220 }, false);
      scanner.render(decoded => {
        setToken(decoded);
        scanner.clear().catch(()=>{});
      }, () => {});
    } catch {}
    return () => { scanner?.clear().catch(()=>{}); };
  }, []);

  const checkIn = async e => {
    e?.preventDefault();
    try {
      const r = await api.post("/attendance/check-in", { token, volunteer_id:Number(volunteerId) });
      setResult(`✓ ${r.data.volunteer_name} checked in for ${r.data.event_title}`);
      const a = await api.get(`/attendance/${r.data.event_id}`);
      setAttendance(a.data);
    } catch (err) {
      setResult(`✕ ${err.response?.data?.error || "Check-in failed"}`);
    }
  };

  return (
    <>
      <PageHeader title="QR Check-in" subtitle="Scan an event QR code and record volunteer attendance." />
      <div className="two-col">
        <div className="panel">
          <h2>Scanner</h2>
          <div id="reader"></div>
          <form className="form" onSubmit={checkIn}>
            <label>Volunteer</label>
            <select required value={volunteerId} onChange={e=>setVolunteerId(e.target.value)}>
              <option value="">Select volunteer</option>{volunteers.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <label>QR token</label>
            <input required value={token} onChange={e=>setToken(e.target.value)} placeholder="Scan or paste token" />
            <button>Check In</button>
          </form>
          {result && <div className="result">{result}</div>}
        </div>
        <div className="panel">
          <h2>Attendance</h2>
          {attendance.length === 0 ? <Empty text="Check in a volunteer to see attendance." /> :
            attendance.map(a=><div className="attendance" key={a.id}><strong>{a.name}</strong><span>{a.email} · {new Date(a.checked_in_at).toLocaleString()}</span></div>)
          }
        </div>
      </div>
    </>
  );
}

function Modal({children,onClose}) {
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={onClose}>×</button>{children}</div></div>;
}

function Empty({text}) { return <div className="empty">{text}</div>; }

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<Dashboard/>}/>
    <Route path="/events" element={<Events/>}/>
    <Route path="/volunteers" element={<Volunteers/>}/>
    <Route path="/tasks" element={<Tasks/>}/>
    <Route path="/announcements" element={<Announcements/>}/>
    <Route path="/checkin" element={<CheckIn/>}/>
  </Routes></Layout>;
}
