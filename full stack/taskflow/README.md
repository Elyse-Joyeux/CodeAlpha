# TaskFlow

TaskFlow is a project collaboration app with task boards, assignments, comments,
notifications, and real-time updates. It uses Next.js (TypeScript), Express,
Socket.io, and PostgreSQL.

```
taskflow/
├── README.md
├── .gitignore
├── backend/                       # API + WebSockets (port 4000)
│   ├── src/index.ts
│   ├── schema.sql                 # auto-applied on startup
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── frontend/                      # Next.js app (port 3000)
    ├── public/favicon.svg
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── globals.css
    │   │   ├── page.tsx                 # login / register
    │   │   └── projects/
    │   │       ├── page.tsx             # project list
    │   │       └── [id]/page.tsx        # board
    │   ├── components/
    │   │   ├── Header.tsx               # notification bell
    │   │   └── TaskModal.tsx            # task details + comments
    │   └── lib/ (api.ts, socket.ts, types.ts)
    ├── next.config.ts
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## Run locally

Requirements: Node.js 20.9 or newer and a PostgreSQL database. For the hosted
setup, create a Neon project and use its pooled connection string.

1. In `backend`, install dependencies and create `.env` from `.env.example`.
   Set `DATABASE_URL` and a long random `JWT_SECRET`; keep the API on port 4000
   and allow the frontend origin `http://localhost:3000`.
2. Start the API with `npm run dev` from `backend`. It creates the schema on
   startup.
3. In `frontend`, install dependencies and create `.env.local` from
   `.env.example`. Start the UI with `npm run dev`.
4. Open <http://localhost:3000>.

Run the frontend and backend in separate terminals. Production builds are
available with `npm run build` in each directory; start them with `npm start`.
