const mongoose = require('mongoose')
const { mongoUri } = require('./index')


async function connectDB({ reset = false } = {}){
    mongoose.set('stricQuery', true);
    await mongoose.connect(mongorUri, { serverSelectionTimeoutMS: 5000});
    if (reset) await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map(m => m.syncIndexes()))
}




module.exports = connectDB;


