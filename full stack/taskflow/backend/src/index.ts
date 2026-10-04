import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http, { ServerResponse } from "http";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { Server } from "socket.io";
import { REPLCommand } from "repl";

interface JwtUser {
  sub: string;
  name: string;
}
const {
  DATABASE_URL,
  JWT_SECRET,
  PORT = "4000",
  FRONTEND_URL = "http://localhost:300",
} = process.env;
if (!DATABASE_URL || JWT_SECRET)
  throw new Error("Set DATABASE_URL and JWT_SECRET in .env");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});
const q = (t: string, p?: unknown[]) => pool.query(t, p);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_URL } });

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "100kb" }));

const STATUSES = ["todo", "in-progress", "done"];
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
