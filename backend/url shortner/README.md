# URL Shortener

A small URL shortener built with **Express.js**, **MongoDB** (via Mongoose) and a plain HTML/CSS/JS frontend.

## Features

- `POST /api/shorten` accepts a long URL and returns a unique 7-character short code
- Short code and original URL are stored in MongoDB
- `GET /:code` redirects to the original URL (and counts the click)
- Frontend at `/` to paste a link and copy the shortened version

## Setup

Requires Node.js 18+ and a running MongoDB (local install or MongoDB Atlas).

```bash
npm install
cp .env.example .env      # then edit MONGODB_URI if needed
npm start
```

Open http://localhost:3000.

## API

### Create a short link

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/some/very/long/path?x=1"}'
```

Response (`201`):

```json
{
  "shortCode": "aB3xY9Z",
  "shortUrl": "http://localhost:3000/aB3xY9Z",
  "longUrl": "https://example.com/some/very/long/path?x=1"
}
```

Invalid input returns `400` with `{ "error": "..." }`.

### Follow a short link

`GET /aB3xY9Z` responds with a `302` redirect to the original URL. Unknown codes show a 404 page.

## Project structure

```
server.js        Express app, API route, redirect route
models/Url.js    Mongoose schema (shortCode, longUrl, clicks)
public/          Frontend (index.html, style.css, app.js, 404.html)
.env.example     Environment variables
```

## Notes

- Codes are random base62 strings; a unique index on `shortCode` guarantees no duplicates, and the server retries on the rare collision.
- Submitting the same URL twice returns the same short code.
- Set `BASE_URL` in `.env` when deploying so short links use your public domain.
