const mongoose = require('mongoose');

async function connectDB() {
  const uri =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', uri.replace(/:([^:@/]+)@/, ':****@'));
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error(
      'Make sure MongoDB is running (local `mongod` or MongoDB Atlas) and MONGODB_URI is correct in .env'
    );
    process.exit(1);
  }
}

module.exports = connectDB;
