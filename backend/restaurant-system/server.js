const app = require('./src/app')
const { port, mongoUri } = require('./src/config')
const connectDB = require('./src/config/db')
const seed = require('./src/seed/seed')


connectDB()
    .then(seed)
    .then(() => app.listen(port, () => console.log(`Restaurant system running at http://localhost:${port}`)))
    .catch(e => {
        console.error(`Could not connect to MongoDB at ${mongoUri}\nStart MongoDB, or set MONGODB_URI (for example a MongoDB Atlas link).\n${e.message}`)
        process.exit(1);
    })
