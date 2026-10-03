const mongoose = require('mongoose')
const { mongoUri } = require('./index')


async function connectDB({ reset = false } = {}){
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000});
    if (reset) await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map(m => m.syncIndexes()))
}




module.exports = connectDB;


