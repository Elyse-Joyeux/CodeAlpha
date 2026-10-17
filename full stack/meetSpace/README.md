# MeetSpace

MeetSpace is a browser based meeting and collaboration app. It combines real time video meetings with room chat, file sharing, and a shared whiteboard.

## Features

- Create an account, sign in, and create or join a meeting with a room code.
- Connect meeting participants with WebRTC, using Socket.IO for signaling and room events.
- Share chat messages and whiteboard strokes with people in the room.
- Upload files up to 25 MB. The backend encrypts file contents at rest with AES-256-GCM.
- Store users, rooms, chat, file metadata, participant sessions, and whiteboard snapshots in PostgreSQL.

## Project layout

```text
meetSpace/
├── backend/
│   ├── schema.sql          # PostgreSQL tables and indexes
│   └── src/index.ts        # Express API and Socket.IO server
├── frontend/
│   └── src/
│       ├── app/            # Next.js routes and pages
│       ├── components/     # Shared UI components
│       └── lib/api.ts      # API URL, auth storage, and fetch helper
├── neon.ts                 # Neon project configuration
├── package.json            # Commands for working across both apps
└── README.md
```

The frontend runs on port `3000`; the API runs on port `4000` by default. Uploaded encrypted files are kept in `backend/uploads/` (created automatically and ignored by Git).

## Requirements

- Node.js 20 or later and npm
- A PostgreSQL database (Neon or another PostgreSQL provider)

## Getting started

1. Install the root and app dependencies:

   ```bash
   npm install
   npm run install:all
   ```

2. Create `backend/.env` using [`backend/.env.example`](backend/.env.example). Set `DATABASE_URL` to your PostgreSQL connection string and generate unique secrets for `JWT_SECRET` and `FILE_KEY`.

   `FILE_KEY` must be exactly 64 hexadecimal characters (32 bytes), for example generated with `openssl rand -hex 32`. Keep both secrets private and do not commit `.env` files.

3. Create `frontend/.env.local` using [`frontend/.env.example`](frontend/.env.example). The default API URL works for local development.

4. Start both apps from the project root:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). The backend creates the required database tables from `backend/schema.sql` when it starts, so the database user needs permission to create tables and indexes.

You can also start either app by itself with `npm run dev:web` or `npm run dev:api`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign authentication tokens |
| `FILE_KEY` | Yes | 32-byte encryption key encoded as 64 hex characters |
| `PORT` | No | API port; defaults to `4000` |
| `FRONTEND_URL` | No | Allowed frontend origin; defaults to `http://localhost:3000` |
| `TURN_URL` | No | TURN server URL for WebRTC connections across restrictive networks |
| `TURN_USER` | No | TURN username, when using a TURN server |
| `TURN_PASS` | No | TURN credential, when using a TURN server |

The app uses Google's public STUN server by default. A TURN server may be needed for reliable calls on some networks.

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | Backend base URL; defaults to `http://localhost:4000` |

## Useful commands

Run these from the project root unless a directory is specified.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and frontend together |
| `npm run dev:api` | Start only the backend in watch mode |
| `npm run dev:web` | Start only the Next.js frontend |
| `npm run typecheck --prefix backend` | Type-check backend TypeScript |
| `npm run lint --prefix frontend` | Lint frontend code |
| `npm run build --prefix frontend` | Build the frontend for production |

## API overview

- `GET /api/health` — check API and database connectivity
- `POST /api/register` and `POST /api/login` — create an account and sign in
- `POST /api/rooms` — create a room (authentication required)
- `GET /api/config` — retrieve WebRTC ICE server configuration (authentication required)
- `POST /api/rooms/:code/files` and `GET /api/files/:id` — share and download room files (authentication required)

Room membership, chat, presence, signaling, and whiteboard updates use Socket.IO. The client authenticates with its token and joins a room using the room code.

## Security and deployment notes

- Use HTTPS in deployed environments, strong unique secrets, and a restricted database account.
- Configure `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` for the deployed origins. If the frontend and API use different domains, configure the API URL as the full public API origin.
- `NEXT_PUBLIC_API_URL` is public client configuration; never place private keys or credentials in `NEXT_PUBLIC_*` variables.
- File encryption is at rest on the backend. It does not mean uploaded files are end-to-end encrypted between meeting participants.
- The backend's local upload directory must be persistent and writable in production, or file storage should be replaced with durable object storage.

## Current limitations

- The configured call connectivity starts with a public STUN server; production deployments should provide a TURN service for broader network compatibility.
- Backend test script is a placeholder; automated backend tests have not been set up yet.

