
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');

const sampleProducts = [
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description:
      'Over-ear Bluetooth headphones with active noise cancellation, 30-hour battery life, and plush memory-foam ear cushions. Perfect for travel and focused work.',
    price: 129.99,
    image: 'wireless-headphones.jpg',
    category: 'Electronics',
    countInStock: 25,
    rating: 4.5,
    numReviews: 12,
  },
  {
    name: 'Smart Fitness Watch',
    description:
      'Track steps, heart rate, sleep, and workouts. Water-resistant with a 7-day battery and a bright AMOLED display. Compatible with iOS and Android.',
    price: 79.99,
    image: 'smart-watch.jpg',
    category: 'Electronics',
    countInStock: 40,
    rating: 4.2,
    numReviews: 30,
  },
  {
    name: 'Aluminium Laptop Stand',
    description:
      'Ergonomic, height-adjustable laptop stand that improves airflow and keeps your screen at eye level. Folds flat for travel.',
    price: 39.99,
    image: 'laptop-stand.jpg',
    category: 'Electronics',
    countInStock: 60,
    rating: 4.7,
    numReviews: 8,
  },
  {
    name: 'Running Shoes',
    description:
      'Lightweight breathable running shoes with cushioned soles for everyday training. Available in multiple sizes.',
    price: 59.99,
    image: 'running-shoes.jpg',
    category: 'Fashion',
    countInStock: 50,
    rating: 4.3,
    numReviews: 21,
  },
  {
    name: 'Travel Backpack 30L',
    description:
      'Durable water-resistant backpack with a padded laptop sleeve, USB charging port, and anti-theft pockets. Ideal for commuting and trips.',
    price: 49.99,
    image: 'backpack.jpg',
    category: 'Fashion',
    countInStock: 35,
    rating: 4.6,
    numReviews: 15,
  },
  {
    name: 'Ceramic Coffee Mug',
    description:
      'Handmade 350ml ceramic mug, dishwasher and microwave safe. Keeps your coffee warm and looks great on any desk.',
    price: 14.99,
    image: 'coffee-mug.jpg',
    category: 'Home',
    countInStock: 100,
    rating: 4.8,
    numReviews: 5,
  },
  {
    name: 'Polarised Sunglasses',
    description:
      'UV400 polarised lenses with a lightweight acetate frame. Includes a hard case and cleaning cloth.',
    price: 29.99,
    image: 'sunglasses.jpg',
    category: 'Fashion',
    countInStock: 45,
    rating: 4.1,
    numReviews: 9,
  },
  {
    name: 'Cotton Crew T-Shirt',
    description:
      'Soft 100% combed cotton t-shirt with a classic crew neck. Pre-shrunk and available in several colours.',
    price: 19.99,
    image: 't-shirt.jpg',
    category: 'Fashion',
    countInStock: 120,
    rating: 4.4,
    numReviews: 18,
  },
  {
    name: 'LED Desk Lamp',
    description:
      'Dimmable LED desk lamp with 3 colour temperatures and a USB charging port. Touch controls and a flexible arm.',
    price: 34.99,
    image: 'desk-lamp.jpg',
    category: 'Home',
    countInStock: 70,
    rating: 4.5,
    numReviews: 11,
  },
  {
    name: 'Non-Slip Yoga Mat',
    description:
      '6mm thick eco-friendly TPE yoga mat with extra grip and a carry strap. Lightweight and easy to clean.',
    price: 27.99,
    image: 'yoga-mat.jpg',
    category: 'Sports',
    countInStock: 80,
    rating: 4.6,
    numReviews: 14,
  },
  {
    name: 'Insulated Water Bottle',
    description:
      '750ml stainless steel vacuum bottle that keeps drinks cold for 24h or hot for 12h. Leak-proof lid.',
    price: 22.99,
    image: 'water-bottle.jpg',
    category: 'Sports',
    countInStock: 90,
    rating: 4.7,
    numReviews: 22,
  },
  {
    name: 'Hardcover Lined Notebook',
    description:
      'A5 hardcover notebook with 192 lined pages, a ribbon bookmark, and an elastic closure. Smooth acid-free paper.',
    price: 9.99,
    image: 'notebook.jpg',
    category: 'Books',
    countInStock: 150,
    rating: 4.5,
    numReviews: 7,
  },
];

async function seed() {
  try {
    await connectDB();

    console.log('Clearing existing products...');
    await Product.deleteMany({});

    console.log(`Inserting ${sampleProducts.length} products...`);
    await Product.insertMany(sampleProducts);
    const adminEmail = 'admin@shop.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Store Admin',
        email: adminEmail,
        password: 'admin123',
        isAdmin: true,
      });
      console.log(`Admin user created -> email: ${adminEmail}  password: admin123`);
    } else {
      console.log(`Admin user already exists -> email: ${adminEmail}`);
    }

    console.log('Seed complete!');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seed();
