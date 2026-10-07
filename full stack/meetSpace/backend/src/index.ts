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

    res
      .status(201)
      .json({
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
