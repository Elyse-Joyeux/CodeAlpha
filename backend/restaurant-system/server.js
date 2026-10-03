const app = require('./src/app')
const { port } = require('./src/config')
const connectDB = require('./src/config/db')
const seed = require('./src/seed/seed')


async function start() {
    try {
        await connectDB()
    } catch (e) {
        console.error(`Could not connect to MongoDB. Check MONGODB_URI and network access.\n${e.message}`)
        process.exitCode = 1
        return
    }

    try {
        await seed()
    } catch (e) {
        console.error(`MongoDB connected, but database seeding failed.\n${e.message}`)
        process.exitCode = 1
        return
    }

    app.listen(port, () => console.log(`Restaurant system running at http://localhost:${port}`))
}

start()
