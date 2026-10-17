# Kindred

A small, calm social space for sharing the everyday moments that make life feel full. Built with HTML, CSS, JavaScript, Express, and MongoDB.

## Run locally

You’ll need Node.js and MongoDB available locally, or a MongoDB connection string.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a private `JWT_SECRET`.
3. Start the app with `npm run dev` (or `npm start`).
4. Open [http://localhost:3000](http://localhost:3000).

The database and collections are created automatically when the server connects. Set `MONGODB_URI` to your MongoDB Atlas URI to use Atlas.

## What’s included

- Sign up and sign in with hashed passwords and seven-day bearer-token sessions.
- Profiles with a bio, location, and photo URL.
- Create and remove your posts, optionally with an image URL.
- Like and comment on posts.
- Follow and unfollow people, with follower and following counts on your profile.
- Responsive home feed, profile view, and people suggestions.

## Backend layout

The Express API is organized by responsibility under `server/`:

- `models/` — Mongoose user and post schemas (comments are embedded in posts).
- `controllers/` — request handlers for authentication, users, and posts.
- `routes/` — API endpoint definitions grouped by resource.
- `middleware/` — shared authentication middleware.
- `utils/` — response serializers used by the controllers.
- `index.js` — Express setup, static frontend serving, and MongoDB connection.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/me`, `PATCH /api/me`
- `GET /api/posts`, `POST /api/posts`, `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`, `POST /api/posts/:id/comments`
- `GET /api/users`, `GET /api/users/:username`, `POST /api/users/:id/follow`

All routes except registration and login require `Authorization: Bearer <token>`.
