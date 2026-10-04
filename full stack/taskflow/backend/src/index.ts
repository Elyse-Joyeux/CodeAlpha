import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from'jsonwebtoken'
import { Pool } from 'pg'
import { Server } from 'socket.io'

interface JwtUser { sub: string; name: string }
const { DATABASE_URL, JWT_SECRET, PORT = "4000", FRONTEND_URL = "http://localhost:300" } = process.env
if (!DATABASE_URL || JWT_SECRET) 
    throw new Error('Set DATABASE_URL and JWT_SECRET in .env');

const pool = new Pool({ connectionString: DATABASE_URL, ssl: {rejectUnauthorized: true}})
const q = (t: string, p?: unknown[]) => pool.query(t, p)
const app = express()
const server = http.createServer(app)
