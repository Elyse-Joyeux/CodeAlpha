# Hearth: Restaurant Management System

Express.js + MongoDB (Mongoose) backend with a modular vanilla-JS frontend served by Express.

## Run
1. Start MongoDB locally (or use a MongoDB Atlas link).
2. Install and start:

       npm install
       cp .env.example .env      # optional: edit password / Mongo URI
       npm start                 # http://localhost:3000

   Demo data (menu, recipes, tables, a week of sales) is created on first start.
   `npm run seed` wipes the database and re-creates it. `npm run dev` restarts on file changes.

Environment variables: `MONGODB_URI`, `ADMIN_PASSWORD` (default `admin123`), `TOKEN_SECRET`, `PORT` (default 3000).

## Structure
    server.js                 entry point: connect DB, seed, listen
    src/
      app.js                  Express app: middleware, static frontend, /api routes
      config/                 env settings (index.js) and MongoDB connection (db.js)
      models/                 Inventory, MenuItem, Table, Reservation, Order, Counter
      routes/                 URL -> controller mapping, one file per resource
      controllers/            thin request/response handlers
      services/               business logic (orders, tables, inventory, menu, reports)
      middleware/             auth (admin token), validateId, errorHandler
      utils/                  httpError, asyncHandler, dates, token
      seed/                   demo data
    public/                   frontend
      index.html, css/styles.css
      js/main.js              router + event delegation
      js/api.js, state.js, ui.js
      js/views/               order, kitchen, tables, admin

## Requirement checklist
| Requirement | Where |
|---|---|
| Express backend for orders, tables, inventory | `src/app.js`, `src/routes/*` |
| Models: menu, orders, tables, reservations, inventory | `src/models/*` |
| API: place orders, reserve tables, update inventory, view menu | `POST /api/orders`, `POST /api/reservations`, `PATCH /api/admin/inventory/:id`, `GET /api/menu` |
| Order processing logic | `services/orderService.js` (validation, whole-order stock check, status flow pending > preparing > served > paid, cancel); admin manages kitchen stages and customers can mark served orders paid |
| Table availability check | `services/tableService.js` (fits party, 90-minute booking window, in-use check) |
| Inventory auto-update | Stock is deducted atomically when an order is placed and restored on cancel |
| Reporting | Daily sales, best sellers, 7-day trend, stock alerts (`services/reportService.js`, `inventoryService.lowStock`) |
| Admin access panel | `/api/auth/login` + `requireAdmin` middleware; Admin tab in the UI |

## API (ids are MongoDB ObjectId strings)
Public
- `GET  /api/menu`                                   menu with `portions` still makeable
- `POST /api/orders`                                 `{ table_id, items:[{menu_item_id, qty}], note }`
- `GET  /api/orders?status=open | ?date=YYYY-MM-DD`
- `PATCH /api/orders/:id/status`                     `{ status: "paid" }` is public; kitchen stage changes and cancellation require an admin token
- `GET  /api/tables`, `GET /api/tables/availability?starts_at=YYYY-MM-DD HH:MM&party=N`
- `POST /api/reservations`                           `{ name, phone, party, starts_at, table_id? }`
- `GET  /api/reservations`, `DELETE /api/reservations/:id`

Admin (`Authorization: Bearer <token>` from `POST /api/auth/login { password }`)
- `GET  /api/admin/reports/daily?date=YYYY-MM-DD`
- `GET  /api/admin/alerts`
- `GET/POST /api/admin/inventory`, `PATCH/DELETE /api/admin/inventory/:id`   (`{ add, reorder_level }`)
- `POST /api/admin/menu`, `PATCH/DELETE /api/admin/menu/:id`   (`{ name, category, price, description, available, recipe:[{inventory_id, qty}] }`)

The Management area has an admin-only Kitchen tab for starting, serving, and cancelling orders. The public Kitchen screen is for recording payment on served orders.
