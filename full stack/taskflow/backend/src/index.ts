import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import http from "http";
import path from "path";
import fs from "fs";
import cors from "cors";
import type { CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { Server } from "socket.io";

interface JwtUser {
  sub: string;
  name: string;
}
const {
  DATABASE_URL,
  JWT_SECRET,
  PORT = "4000",
  FRONTEND_URL = "http://localhost:3000",
} = process.env;
if (!DATABASE_URL || !JWT_SECRET)
  throw new Error("Set DATABASE_URL and JWT_SECRET in .env");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});
const q = (t: string, p?: unknown[]) => pool.query(t, p);
const app = express();
const server = http.createServer(app);
const configuredOrigins = new Set(
  FRONTEND_URL.split(",").map((origin) => origin.trim()),
);
const isLocalFrontendOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || url.port !== "3000") return false;
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]")
      return true;
    const octets = host.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => part < 0 || part > 255))
      return false;
    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  } catch {
    return false;
  }
};
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(
      null,
      !origin || configuredOrigins.has(origin) || isLocalFrontendOrigin(origin),
    );
  },
};
const io = new Server(server, { cors: corsOptions });

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

const STATUSES = ["todo", "in_progress", "done"];
const sign = (id: string, name: string) =>
  jwt.sign({ sub: id, name } as JwtUser, JWT_SECRET, { expiresIn: "8h" });
const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.locals.user = jwt.verify(
      (req.headers.authorization || "").replace("Bearer ", ""),
      JWT_SECRET,
    ) as JwtUser;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const me = (res: Response) => res.locals.user as JwtUser;
const routeId = (req: Request) => String(req.params.id ?? "");
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const isMember = async (pid: string, uid: string) =>
  ((
    await q(
      "select 1 from project_members where project_id=$1 and user_id=$2",
      [pid, uid],
    )
  ).rowCount ?? 0) > 0;

const TASK_SQL =
  "SELECT t.*, u.display_name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id";
const fullTask = async (id: string) =>
  (await q(TASK_SQL + " WHERE t.id=$1", [id])).rows[0];

async function notify(
  userId: string | null,
  actor: string,
  message: string,
  projectId: string,
  taskId: string,
) {
  if (!userId || userId === actor) return;
  const n = (
    await q(
      "INSERT INTO notifications(user_id,message,project_id,task_id) VALUES($1,$2,$3,$4) RETURNING *",
      [userId, message, projectId, taskId],
    )
  ).rows[0];
  io.to("user:" + userId).emit("notification", n);
}

// loads a task the caller may access
async function taskFor(req: Request, res: Response) {
  const t = (await q("SELECT * FROM tasks WHERE id=$1", [routeId(req)]))
    .rows[0];
  if (!t || !(await isMember(t.project_id, me(res).sub))) {
    res.status(404).json({ error: "Task not found" });
    return null;
  }
  return t;
}

// auth
app.post(
  "/api/register",
  limiter,
  h(async (req, res) => {
    const { email, password, name } = req.body ?? {};
    if (
      !/^\S+@\S+\.\S+$/.test(email ?? "") ||
      (password ?? "").length < 8 ||
      !(name ?? "").trim()
    )
      return res
        .status(400)
        .json({ error: "Valid name, email and 8+ char password requiredd" });

    try {
      const u = (
        await q(
          "INSERT INTO users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,display_name",
          [
            email.toLowerCase(),
            name.trim().slice(0, 40),
            await bcrypt.hash(password, 12),
          ],
        )
      ).rows[0];
      return res.status(201).json({
        token: sign(u.id, u.display_name),
        user: { id: u.id, name: u.display_name },
      });
    } catch {
      return res.status(400).json({ error: "Email already in use" });
    }
  }),
);

app.post(
  "/api/login",
  limiter,
  h(async (req, res) => {
    const { email, password } = req.body ?? {};
    const u = (
      await q("SELECT * FROM users WHERE email=$1", [
        String(email ?? "").toLowerCase(),
      ])
    ).rows[0];
    if (!u || !(await bcrypt.compare(String(password ?? ""), u.password_hash)))
      return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      token: sign(u.id, u.display_name),
      user: { id: u.id, name: u.display_name },
    });
  }),
);

// projects and members
app.get(
  "/api/projects",
  auth,
  h(async (_req, res) => {
    res.json(
      (
        await q(
          `SELECT p.*, (SELECT count(*) FROM tasks WHERE project_id=p.id)::int AS task_count FROM projects p
    JOIN project_members m ON m.project_id=p.id WHERE m.user_id=$1 ORDER BY p.created_at DESC`,
          [me(res).sub],
        )
      ).rows,
    );
  }),
);

app.post(
  "/api/projects",
  auth,
  h(async (req, res) => {
    const name = String(req.body?.name ?? "")
      .trim()
      .slice(0, 80);

    if (!name) return res.status(400).json({ error: "Name is required" });

    const p = (
      await q("INSERT INTO projects(name,owner_id) VALUES($1,$2) RETURNING *", [
        name,
        me(res).sub,
      ])
    ).rows[0];
    await q(
      "INSERT INTO project_members(project_id,user_id,role) VALUES($1,$2,'owner')",
      [p.id, me(res).sub],
    );

    res.status(201).json(p);
  }),
);

app.get(
  "/api/projects/:id",
  auth,
  h(async (req, res) => {
    if (!(await isMember(routeId(req), me(res).sub)))
      return res.status(404).json({ error: "Project not found" });

    const project = (
      await q("SELECT id,name FROM projects WHERE id=$1", [routeId(req)])
    ).rows[0];

    const members = (
      await q(
        "SELECT u.id,u.display_name,u.email FROM project_members m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1",
        [routeId(req)],
      )
    ).rows;

    const tasks = (
      await q(TASK_SQL + " WHERE t.project_id=$1 ORDER BY t.created_at", [
        routeId(req),
      ])
    ).rows;

    res.json({ project, members, tasks });
  }),
);

app.post(
  "/api/projects/:id/members",
  auth,
  h(async (req, res) => {
    if (!(await isMember(routeId(req), me(res).sub)))
      return res.status(404).json({ error: "Project not found" });

    const u = (
      await q("SELECT id,display_name,email FROM users WHERE email=$1", [
        String(req.body?.email ?? "").toLowerCase(),
      ])
    ).rows[0];

    if (!u)
      return res.status(404).json({ error: "No user with that email exists" });

    await q(
      "INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [routeId(req), u.id],
    );

    const p = (
      await q("SELECT name FROM projects WHERE id=$1", [routeId(req)])
    ).rows[0];

    await notify(
      u.id,
      me(res).sub,
      `${me(res).name} added you to project "${p.name}"`,
      routeId(req),
      "",
    );

    io.to("project:" + routeId(req)).emit("member:added", u);
    res.status(201).json(u);
  }),
);

// tasks
app.post(
  "/api/projects/:id/tasks",
  auth,
  h(async (req, res) => {
    const pid = routeId(req),
      { title, status = "todo", assignee_id = null } = req.body ?? {};
    if (!(await isMember(pid, me(res).sub)))
      return res.status(404).json({ error: "Project not found" });
    if (!String(title ?? "").trim() || !STATUSES.includes(status))
      return res.status(400).json({ error: "Valid title and status required" });
    if (assignee_id && !(await isMember(pid, assignee_id)))
      return res
        .status(400)
        .json({ error: "Assignee must be a project member" });
    const id = (
      await q(
        "INSERT INTO tasks(project_id,title,status,assignee_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [
          pid,
          String(title).trim().slice(0, 200),
          status,
          assignee_id,
          me(res).sub,
        ],
      )
    ).rows[0].id;
    const t = await fullTask(id);
    io.to("project:" + pid).emit("task:created", t);
    await notify(
      assignee_id,
      me(res).sub,
      `${me(res).name} assigned you "${t.title}"`,
      pid,
      id,
    );
    res.status(201).json(t);
  }),
);
app.patch(
  "/api/tasks/:id",
  auth,
  h(async (req, res) => {
    const old = await taskFor(req, res);
    if (!old) return;
    const b = req.body ?? {},
      sets: string[] = [],
      vals: unknown[] = [];
    for (const k of ["title", "description", "status", "assignee_id"]) {
      if (!(k in b)) continue;
      let v = b[k];
      if (k === "status" && !STATUSES.includes(v))
        return res.status(400).json({ error: "Bad status" });
      if (k === "title" && !String(v).trim())
        return res.status(400).json({ error: "Title required" });
      if (k === "assignee_id") {
        v = v || null;
        if (v && !(await isMember(old.project_id, v)))
          return res
            .status(400)
            .json({ error: "Assignee must be a project member" });
      }
      vals.push(v);
      sets.push(`${k}=$${vals.length}`);
    }
    if (!sets.length)
      return res.status(400).json({ error: "Nothing to update" });
    await q(`UPDATE tasks SET ${sets.join(",")} WHERE id=$${vals.length + 1}`, [
      ...vals,
      old.id,
    ]);
    const t = await fullTask(old.id);
    io.to("project:" + old.project_id).emit("task:updated", t);
    if ("assignee_id" in b && t.assignee_id !== old.assignee_id)
      await notify(
        t.assignee_id,
        me(res).sub,
        `${me(res).name} assigned you "${t.title}"`,
        old.project_id,
        old.id,
      );
    res.json(t);
  }),
);
app.delete(
  "/api/tasks/:id",
  auth,
  h(async (req, res) => {
    const t = await taskFor(req, res);
    if (!t) return;
    await q("DELETE FROM tasks WHERE id=$1", [t.id]);
    io.to("project:" + t.project_id).emit("task:deleted", { id: t.id });
    res.json({ ok: true });
  }),
);

// comments
const CM_SQL =
  "SELECT c.id,c.task_id,c.body,c.created_at,u.display_name AS name FROM comments c LEFT JOIN users u ON u.id=c.user_id";
app.get(
  "/api/tasks/:id/comments",
  auth,
  h(async (req, res) => {
    const t = await taskFor(req, res);
    if (!t) return;
    res.json(
      (await q(CM_SQL + " WHERE c.task_id=$1 ORDER BY c.created_at", [t.id]))
        .rows,
    );
  }),
);
app.post(
  "/api/tasks/:id/comments",
  auth,
  h(async (req, res) => {
    const t = await taskFor(req, res);
    if (!t) return;
    const body = String(req.body?.body ?? "")
      .trim()
      .slice(0, 2000);
    if (!body) return res.status(400).json({ error: "Comment required" });
    const id = (
      await q(
        "INSERT INTO comments(task_id,user_id,body) VALUES($1,$2,$3) RETURNING id",
        [t.id, me(res).sub, body],
      )
    ).rows[0].id;
    const c = (await q(CM_SQL + " WHERE c.id=$1", [id])).rows[0];
    io.to("project:" + t.project_id).emit("comment:new", c);
    const msg = `${me(res).name} commented on "${t.title}"`;
    await notify(t.assignee_id, me(res).sub, msg, t.project_id, t.id);
    if (t.created_by !== t.assignee_id)
      await notify(t.created_by, me(res).sub, msg, t.project_id, t.id);
    res.status(201).json(c);
  }),
);

// notifications
app.get(
  "/api/notifications",
  auth,
  h(async (_req, res) => {
    res.json(
      (
        await q(
          "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
          [me(res).sub],
        )
      ).rows,
    );
  }),
);
app.post(
  "/api/notifications/read",
  auth,
  h(async (_req, res) => {
    await q(
      "UPDATE notifications SET read=true WHERE user_id=$1 AND NOT read",
      [me(res).sub],
    );
    res.json({ ok: true });
  }),
);

app.use(
  (
    e: { code?: string; message: string },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (e.code === "22P02") return res.status(404).json({ error: "Not found" }); // malformed UUID
    console.error(e);
    res.status(500).json({ error: "Server error" });
  },
);

// real time
io.use((s, next) => {
  try {
    s.data.user = jwt.verify(
      String(s.handshake.auth.token),
      JWT_SECRET,
    ) as JwtUser;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});
io.on("connection", (s) => {
  const u: JwtUser = s.data.user;
  s.join("user:" + u.sub); // personal room for notifications
  s.on("watch", async (pid: string) => {
    try {
      if (await isMember(pid, u.sub)) s.join("project:" + pid);
    } catch {
      /* bad id */
    }
  });
  s.on("unwatch", (pid: string) => s.leave("project:" + pid));
});

(async () => {
  await q(fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8")); // create tables if missing
  server.listen(Number(PORT), () =>
    console.log(`API running on http://localhost:${PORT}`),
  );
})().catch((e) => {
  console.error("Startup failed:", e.message);
  process.exit(1);
});
