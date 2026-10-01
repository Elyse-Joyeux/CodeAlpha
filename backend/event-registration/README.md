# Event Registration System

Backend: **Express.js** (v5) + **MongoDB** (Mongoose). Auth: JWT with two roles, `user` and `admin` (organizer).
Frontend: plain HTML/CSS/JS served from `public/`.

## Features

- Sign up and log in (passwords hashed with bcrypt, JWT tokens)
- Browse upcoming events, search by title or location, view event details
- Register for an event through a form (full name, phone, notes)
- View your registrations and cancel them; cancelling frees the spot
- Organizer panel: create and delete events, see who registered
- Capacity is enforced atomically, so an event can never be overbooked

## Setup

Requires Node.js 18+ and MongoDB (local or MongoDB Atlas).

```bash
npm install
cp .env.example .env     # set MONGODB_URI and JWT_SECRET
npm run seed             # creates the organizer account + 7 sample events
npm start
```

Open http://localhost:3000.
Organizer login: use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values configured in `.env`. Choose a unique password before deploying.

## Data models

| Model | Fields |
| --- | --- |
| **User** | name, email (unique), passwordHash, role (`user` or `admin`) |
| **Event** | title, description, location, date, capacity, registeredCount, createdBy (User) |
| **Registration** | event (Event), user (User), fullName, phone, notes, status (`registered` or `cancelled`), cancelledAt |

A unique index on `(event, user)` allows one registration record per user per event. Cancelling sets `status: "cancelled"`; registering again reactivates the same record.

## API

Send the token as `Authorization: Bearer <token>` for routes marked Login or Admin.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create an account (`name`, `email`, `password`) |
| POST | `/api/auth/login` | Public | Log in, returns `token` and `user` |
| GET | `/api/auth/me` | Login | Current user |
| GET | `/api/events` | Public | Upcoming events. Query: `q` (search), `past=true` (include past events) |
| GET | `/api/events/:id` | Public | Event details |
| POST | `/api/events/:id/register` | Login | Submit registration form (`fullName`, `phone`, `notes`) |
| GET | `/api/registrations/mine` | Login | Your registrations |
| GET | `/api/registrations/:id` | Login | One registration (owner or admin) |
| DELETE | `/api/registrations/:id` | Login | Cancel a registration (owner or admin) |
| POST | `/api/events` | Admin | Create event (`title`, `location`, `date`, `capacity`, `description`) |
| PUT | `/api/events/:id` | Admin | Update event |
| DELETE | `/api/events/:id` | Admin | Delete event and its registrations |
| GET | `/api/events/:id/registrations` | Admin | Everyone registered for an event |

Errors use the shape `{ "error": "message" }` with a suitable status code (400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict such as already registered or event full).

### Example

```bash
# Log in
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin12345"}'

# Register for an event
curl -X POST http://localhost:3000/api/events/EVENT_ID/register \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"fullName":"Ann K","phone":"0788000000","notes":"Vegetarian"}'

# Cancel it
curl -X DELETE http://localhost:3000/api/registrations/REGISTRATION_ID \
  -H "Authorization: Bearer TOKEN"
```

## Project structure

```
server.js                  Connects to MongoDB and starts the server
app.js                     Express app: middleware and routes
config.js                  Environment settings
models/                    User, Event, Registration
routes/                    auth, events, registrations
middleware/                auth (login + admin checks), error handler
scripts/seed.js            Creates the organizer account and sample events
public/                    Frontend
```

## Design notes

- **No overbooking:** `registeredCount` is only changed with atomic updates. A registration reserves a spot with a condition (`registeredCount < capacity`), and the spot is released if saving the registration fails or it is cancelled.
- **Security:** passwords are hashed, the password hash is never returned, login only accepts string inputs (blocks NoSQL injection), clients cannot set `role`, `registeredCount` or `createdBy`, and the frontend builds the page with `textContent` so event text can't inject HTML.
- **Not included (possible extensions):** pagination, email confirmations, editing events in the UI (the `PUT` endpoint exists), rate limiting.
