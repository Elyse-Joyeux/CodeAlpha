require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' })); // higher limit to allow small base64 avatar/post images

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend static files (so the whole app can run from one server)
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 5000;
// Do not accept requests until the database is ready. This avoids failed first
// signups while Mongoose is still establishing its initial connection.
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Unable to start server:', err.message);
    process.exit(1);
  });
