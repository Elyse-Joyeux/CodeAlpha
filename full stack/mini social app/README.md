# Orbit — Mini Social Media App

A full-stack mini social network built with **HTML/CSS/JavaScript** (vanilla, no framework) on the frontend, **Express.js** on the backend, and **MongoDB** for storage.

## Features

- **Auth** — register/login with JWT, passwords hashed with bcrypt
- **User profiles** — bio, avatar (uploaded as an image, stored as a data URL), follower/following counts
- **Posts** — create text posts with an optional image, delete your own posts
- **Comments** — comment on any post, delete your own comments
- **Likes** — like/unlike posts
- **Follow system** — follow/unfollow users, a "Following" feed (posts from people you follow) and an "Everyone" global feed
- **Search** — find users by username
- Dark-themed, single-page UI

## Project structure

```
mini-social-app/
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── models/                # User, Post, Comment (Mongoose schemas)
│   ├── middleware/auth.js     # JWT verification
│   ├── routes/                # auth, users, posts (REST API)
│   ├── server.js              # Express app entry point
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js             # fetch wrapper + helpers
        ├── auth.js            # login/register screen
        ├── posts.js           # feed, composer, likes, comments modal
        ├── profile.js         # profile view, follow, search
        └── app.js             # bootstraps everything
```

The Express server also serves the `frontend/` folder as static files, so **one server runs the whole app** — no separate frontend server needed.

## Setup

### 1. Install MongoDB

You need a running MongoDB instance. Options:
- **Local install**: [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- **Free cloud option**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — create a free cluster and grab the connection string

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mini_social
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
```

If using Atlas, replace `MONGO_URI` with your Atlas connection string.

### 3. Install dependencies & run

```bash
cd backend
npm install
npm start
```

For auto-restart on file changes during development:
```bash
npm run dev
```

### 4. Open the app

Visit **http://localhost:5000** — the frontend is served directly from the backend.

## API overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Log in, get JWT |
| GET | `/api/users/me` | ✔ | Current user profile |
| PUT | `/api/users/me` | ✔ | Update bio/avatar |
| GET | `/api/users/search?q=` | – | Search usernames |
| GET | `/api/users/:id` | – | Public profile |
| GET | `/api/users/:id/posts` | – | A user's posts |
| POST | `/api/users/:id/follow` | ✔ | Toggle follow |
| GET | `/api/posts` | – | Global feed |
| GET | `/api/posts/feed` | ✔ | Following feed |
| POST | `/api/posts` | ✔ | Create post |
| DELETE | `/api/posts/:id` | ✔ | Delete own post |
| POST | `/api/posts/:id/like` | ✔ | Toggle like |
| GET | `/api/posts/:id/comments` | – | List comments |
| POST | `/api/posts/:id/comments` | ✔ | Add comment |
| DELETE | `/api/posts/comments/:commentId` | ✔ | Delete own comment |

Send the JWT as `Authorization: Bearer <token>` for protected routes (the frontend does this automatically after login).

## Notes / next steps you could add

- Images are stored as base64 data URLs directly in MongoDB documents for simplicity — fine for a small app/demo, but for production you'd want to upload to disk or cloud storage (e.g. S3) and store just a URL.
- No pagination yet on feeds (capped at 100 posts) — easy to add with `skip`/`limit` query params.
- No real-time updates (would need Socket.io/WebSockets for live likes/comments).
- No rate limiting/input sanitization beyond basic validation — add `express-rate-limit` and `express-validator` before deploying publicly.
