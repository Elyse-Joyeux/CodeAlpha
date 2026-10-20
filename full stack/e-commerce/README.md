# ShopKart - Simple E-commerce Store

A basic e-commerce web application built for the **CodeAlpha** internship.

- **Frontend:** HTML, CSS, and vanilla JavaScript (no framework)
- **Backend:** Express.js (Node.js) REST API
- **Database:** MongoDB (Mongoose) for products, users, and orders
- **Auth:** JSON Web Tokens (JWT) with bcrypt password hashing

## Features

- Product listing with search and category filter, paginated
- Product details page with quantity selector
- Shopping cart (saved in `localStorage`, works without logging in)
- Order processing / checkout (login required) with stock validation
- User registration and login
- Order history page (per user, protected)
- Admin-protected product create/edit endpoints
- Responsive, clean UI that works on mobile and desktop

## Prerequisites

1. **Node.js** (v18+ recommended) - https://nodejs.org/
2. **MongoDB** - choose one:
   - **Local:** install MongoDB Community Edition and run `mongod`
     (https://www.mongodb.com/try/download/community)
   - **Cloud (easier, no install):** create a free MongoDB Atlas cluster
     (https://www.mongodb.com/cloud/atlas) and copy the connection string

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create your environment file by copying the example:

   ```
   copy .env.example .env
   ```

   Open `.env` and set:
   - `MONGODB_URI` - your MongoDB connection string
     (local default is already set to `mongodb://127.0.0.1:27017/ecommerce`)
   - `JWT_SECRET` - any random long string (used to sign login tokens)
   - `PORT` - defaults to 5000

3. Seed the database with sample products and an admin user:

   ```
   npm run seed
   ```

   This creates:
   - 12 sample products across categories (Electronics, Fashion, Home, Sports, Books)
   - an admin account: **email `admin@shop.com`**, **password `admin123`**

## Run

Start the server:

```
npm start
```

Then open **http://localhost:5000** in your browser.

During development you can use:

```
npm run dev
```

which restarts the server automatically when files change (Node `--watch`).

## Product images

The sample products use Unsplash photography mapped by their existing image
filenames in `public/js/api.js`; no database reseed or manual download is needed.
Custom products can use either an image file in `public/images/` or a full image
URL. Missing images fall back to the built-in placeholder.

## Project structure

```
e-commerce/
├── server.js              # Express entry point (serves API + static frontend)
├── seed.js                # Seeds sample products + admin user
├── package.json
├── .env.example           # Copy to .env and fill in
├── config/
│   └── db.js              # Mongoose connection
├── models/
│   ├── User.js            # User (password hashing with bcrypt)
│   ├── Product.js         # Product
│   └── Order.js           # Order + order items
├── middleware/
│   └── auth.js            # JWT protect + admin guards
├── routes/
│   ├── auth.js            # register, login, me
│   ├── products.js        # list/search, categories, get one, create/update
│   └── orders.js          # create, list, get one
└── public/                # Frontend (served as static files)
    ├── index.html         # Home / product listing
    ├── product.html       # Product details
    ├── cart.html           # Shopping cart
    ├── checkout.html      # Order processing
    ├── login.html         # Login
    ├── register.html      # Registration
    ├── orders.html        # Order history
    ├── css/style.css
    ├── js/
    │   ├── api.js         # fetch wrapper, token, helpers, placeholder image
    │   ├── auth.js        # login/register/logout/session helpers
    │   ├── cart.js        # cart state (localStorage) + cart page UI
    │   ├── navbar.js      # shared navbar + footer
    │   ├── main.js        # home page logic
    │   ├── product.js     # product details logic
    │   ├── checkout.js    # checkout logic
    │   ├── orders.js      # orders history logic
    │   ├── login.js       # login form logic
    │   └── register.js    # register form logic
    └── images/            # Add product image files here
```

## API reference

Base URL: `http://localhost:5000/api`

### Auth

| Method | Endpoint        | Auth  | Body                          | Returns            |
|--------|-----------------|-------|-------------------------------|--------------------|
| POST   | /auth/register  | -     | `{ name, email, password }`    | `{ token, user }`  |
| POST   | /auth/login     | -     | `{ email, password }`          | `{ token, user }`  |
| GET    | /auth/me        | token | -                             | `{ user }`         |

### Products

| Method | Endpoint                    | Auth     | Query / Body                         | Returns            |
|--------|-----------------------------|----------|--------------------------------------|--------------------|
| GET    | /products                   | -        | `?search=&category=&page=&limit=`    | `{ products, page, pages, total }` |
| GET    | /products/categories        | -        | -                                    | `{ categories }`   |
| GET    | /products/:id               | -        | -                                    | `{ product }`      |
| POST   | /products                   | admin    | product fields                       | `{ product }`      |
| PUT    | /products/:id               | admin    | product fields                       | `{ product }`      |

### Orders

| Method | Endpoint        | Auth  | Body                                              | Returns     |
|--------|-----------------|-------|---------------------------------------------------|-------------|
| POST   | /orders         | token | `{ items:[{product,qty}], shippingAddress, paymentMethod }` | `{ order }` |
| GET    | /orders         | token | -                                                 | `{ orders }` |
| GET    | /orders/:id     | token | -                                                 | `{ order }`  |

The `Authorization` header for protected routes must be `Bearer <token>`.

## How it fits together

- The browser stores the JWT and current user in `localStorage` after login.
- `js/api.js` attaches the token to every API request automatically.
- The cart lives in `localStorage` so it survives page reloads and works while
  logged out. Checkout requires login and sends the cart to the server, which
  validates stock, deducts inventory, and saves the order under the user.
- Orders are scoped to the logged-in user; the order history page fetches them.

## Testing the flow

1. `npm run seed` then `npm start`, open http://localhost:5000
2. Browse products, add some to the cart, open the cart page
3. Click "Proceed to Checkout" - you'll be asked to log in
4. Register a new account (or log in as `admin@shop.com` / `admin123`)
5. Fill in the shipping form and place the order
6. Visit "Orders" to see your order history

## Notes

- Passwords are hashed with bcryptjs; the password field is never returned by the API.
- Stock is decremented server-side when an order is placed, and the server rejects
  orders that exceed available stock.
- No real payment is processed - the payment method is just recorded on the order.
