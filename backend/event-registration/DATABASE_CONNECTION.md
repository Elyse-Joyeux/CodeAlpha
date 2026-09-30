# Database connection error

The startup message `Could not connect to DB` is printed when the MongoDB
connection promise in `server.js` rejects.

## Root cause found

`config.js` exports the MongoDB connection string as `mongoUri`, but
`server.js` was destructuring a property named `mongoUrl`. Since that property
does not exist, Mongoose received `undefined` instead of the configured URI.
The default URI (`mongodb://127.0.0.1:27017/event-registration`) and any
`MONGODB_URI` value in `.env` were therefore not used.

The names now match, and the startup error includes Mongoose's message so a
subsequent connection failure can be diagnosed.

## If the connection still fails

Check the detailed error after `Could not connect to DB:`:

- `ECONNREFUSED` usually means MongoDB is not running at the host and port in
  `MONGODB_URI`.
- Authentication errors usually mean the URI credentials or database access
  settings are wrong.
- DNS or server-selection errors can indicate an incorrect host, network
  access restrictions, or a remote MongoDB service that is unavailable.

By default, the app tries `mongodb://127.0.0.1:27017/event-registration`. Set
`MONGODB_URI` in `.env` to override it. Ensure the MongoDB service is running
and reachable before starting the app.
