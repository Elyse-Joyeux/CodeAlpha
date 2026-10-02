const app = require('./src/app')
const { port, mongoUri } = require('./src/config')
const connectDB = require('./src/config/db')
const seed = require('./scr/seed/seed')


connectDB()
    .then(seed)
    .then(() => app.listen(port, () => console.log(`Restaurant system running at http://localhost:${prompt}`)))
    .catch(e => {
        console.error(`Could not connect to MongoDB at ${mongoUri}\n Start MongoDB, or set MONGO_DB_URI (for example a MongoDB Atlas link).\n${e.message}`)
        process.exit(1);
    })
