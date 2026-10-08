import "dotenv/config";
import express, { Request, Response, Nextfunction } from "express";
import http from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { Server, Socket } from "socket.io";
import { FILE } from "dns";
import { stringify } from "querystring";
import { userInfo } from "os";

interface JwtUser {
  sub: string;
  name: string;
}
interface Seg {
  a: number;
  b: number;
  x: number;
  y: number;
  c: string;
  w: number;
}

const {
  DATABASE_URL,
  JWT_SECRET,
  FILE_KEY,
  PORT = "4000",
  FRONTEND_URL = "http://localhost:3000",
} = process.env;
if (!DATABASE_URL || !JWT_SECRET || !FILE_KEY)
  throw new Error("Set DATABASE_URL, JWT_SECRET, FILE_KEY in .env");

const KEY = Buffer.from(FILE_KEY, "hex");
if (KEY.length !== 32) throw new Error("FILE_KEY must be 64 hex chars.");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});
const q = (text: string, params?: unknown[]) => pool.query(text, params);
const UP = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UP, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_URL } });

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "100kb" }));

const sign = (id: string, name: string) =>
  jwt.sign({ sub: id, name } as JwtUser, JWT_SECRET, { expiresIn: "8h" });
const auth = (req: Request, res: Response, next: Nextfunction) => {
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

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

app.post("/api/register", limiter, async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (
    !/^\S+@\S+\.\S+$/.test(email ?? "") ||
    (password ?? "").length < 8 ||
    !(name ?? "").trim()
  )
    return res
      .status(400)
      .json({ error: "Valid name, email and 8+ char password required" });

  try {
    const { rows } = await q(
      "insert into users(email, display_name, password_hash) values($1,$2,$3) returning id, display_name",
      [
        email.toLowerCase(),
        name.trim().slice(0, 40),
        await bcrypt.hash(password, 12),
      ],
    );

    res.status(201).json({
      token: sign(rows[0].id, rows[0].display_name),
      user: { id: rows[0].id, name: rows[0].display_name },
    });
  } catch {
    res.status(400).json({ error: "Email already in use" });
  }
});

app.post("api/login", limiter, async (req: Request, res: Response) => {
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
});

app.get("/api/config", auth, (_req, res) => {
  const iceServers: object[] = [{ urls: "stun:stun.l.google.com:19302" }];
  if (process.env.TURN_URL)
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USER,
      credential: process.env.TURN_PASS,
    });

  res.json({ iceServers });
});

app.post("/api/rooms", auth, async (_req, res) => {
  const code = crypto.randomBytes(4).toString("hex");
  await q("insert into rooms(code, host_id) values($1,$2)", [
    code,
    res.locals.user.sub,
  ]);
  res.status(201).json({ code });
});

// files: aes-256-gcm encrypted at rest
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.post(
  "/api/rooms/:code/files",
  auth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const room = (
      await q("select id from rooms where code=$1 and ended_at is null", [
        req.params.code,
      ])
    ).rows[0];
    if (!room || !req.file)
      return res.status(400).json({ error: "Bad request" });

    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
    const enc = Buffer.concat([c.update(req.file.buffer), c.final()]);
    const key = crypto.randomUUID();

    fs.writeFileSync(
      path.join(UP, key),
      Buffer.concat([iv, c.getAuthTag(), enc]),
    );
    const f = (
      await q(
        "insert into files(room_id, uploader_id, filename, size_bytes, storage_key) values($1, $2, $3, $4, $5) returning id, filename, size_bytes",
        [
          room.id,
          res.locals.user.sub,
          req.file.originalname.slice(0, 200),
          req.file.size,
          key,
        ],
      )
    ).rows[0];

    const meta = { ...f, by: res.locals.user.name };
    io.to(req.params.code).emit("file", meta);

    res.status(201).json(meta);
  },
);

app.get("/api/files/:id", auth, async (req: Request, res: Response) => {
  const f = (
    await q(
      `select f.filename, f.storage_key from files f join room_participants p on p.room_id=f.room_id and p.user_id=$2 where f.id=$1 limit 1`,
      [req.params.id, res.locals.user.sub],
    )
  ).rows[0];
  if (!f) return res.status(404).json({ error: "Not found" });
  const b = fs.readFileSync(path.join(UP, f.storage_key));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));

  res
    .attachment(f.filename)
    .send(Buffer.concat([d.update(b.subarray(28)), d.final()]));
});

// realtime
const boards = new Map<string, Seg[]>();
io.use((s: Socket, next) => {
  try {
    s.data.user = jwt.verify(
      String(s.handshake.auth.token),
      JWT_SECRET,
    ) as JwtUser;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (s: Socket) => {
  const user: JwtUser = s.data.user;
  s.on("join", async (code: string, ack: (r: unknown) => void) => {
    try {
      const r = (
        await q("select id from rooms where code=$1 and ended_at is null", [
          code,
        ])
      ).rows[0];
      if (!r) return ack({ error: "Room not found" });
      s.data.room = code;
      s.data.roomId = r.id;
      s.join(code);
      await q("INSERT INTO room_participants(room_id,user_id) VALUES($1,$2)", [
        r.id,
        user.sub,
      ]);

      if (!boards.has(code)) {
        const snap = (
          await q(
            "SELECT data FROM whiteboard_snapshots WHERE room_id=$1 ORDER BY id DESC LIMIT 1",
            [r.id],
          )
        ).rows[0];
        boards.set(code, snap ? snap.data : []);
      }

      const peers = (await io.in(code).fetchSockets())
        .filter((x) => x.id !== s.id)
        .map((x) => ({ id: x.id, name: x.data.user.name }));
      const messages = (
        await q(
          `select u.display_name AS name,m.body FROM messages m LEFT JOIN users u ON u.id=m.user_id
        WHERE m.room_id=$1 ORDER BY m.id DESC LIMIT 50`,
          [r.id],
        )
      ).rows.reverse();

      const files = (
        await q(
          `SELECT f.id,f.filename,f.size_bytes,u.display_name AS by FROM files f
        LEFT JOIN users u ON u.id=f.uploader_id WHERE f.room_id=$1 ORDER BY f.created_at`,
          [r.id],
        )
      ).rows;

      ack({ peers, board: boards.get(code), messages, files });
    } catch (e) {
      console.error(e);
      ack({ error: "Join failed" });
    }
  });

  s.on("signal", ({ to, data }: { to: string; data: unknown }) =>
    io.to(to).emit("signal", { from: s.id, name: user.name, data }),
  );

  s.on('chat', async (body: string) => {
    if(!s.data.room)
      return;

    const text = String(body).slice(0, 2000)
    await q('INSERT INTO messages(room_id,user_id,body) VALUES($1,$2,$3)', [s.data.roomId, user.sub, text])
    io.to(s.data.room).emit('chat', { name: user.name, body: text})
  })

  s.on('draw', (seg: Seg) => {
    const b = boards.get(s.data.room)
    if(b && b.length < 5000) {
      b.push(seg)
      s.to(s.data.room).emit('draw', seg)
    }
  })

  s.on('clear', () => { 
    if(s.data.room){
      boards.set(s.data.room, [])
      s.to(s.data.room).emit('clear')
    }
  })

  s.on('disconnect', async () => {
    const code: string | undefined = s.data.room
    if (!code)
      return;

    s.to(code).emit('peer-left', s.id)
    await q('UPDATE room_participants SET left_at=now() WHERE room_id=$1 AND user_id=$2 AND left_at IS NULL', [s.data.roomId, user.sub]).catch(() => {})
    if (!io.sockets.adapter.rooms.get(code)) {
      const b = boards.get(code)
      boards.delete(code)
      if(b?.length) 
        await q('INSERT INTO whiteboard_snapshots(room_id,data) VALUES($1,$2)', [s.data.roomId, JSON.stringify(b)]).catch(() => {})
    }
  })
});

(async () => {
  await q.(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'))
  server.listen(Number(PORT), () => console.log(`API running on http://localhost:${PORT}`))
})().catch(e => {
  console.error("Startup failed:", e.message)
  process.exit(1)
})
