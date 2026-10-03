require('./atlasDns')
const tls = require('node:tls')
const dns = require('node:dns/promises')
const { MongoClient } = require('mongodb')
const mongoose = require('mongoose')
const { mongoUri } = require('./index')

function tlsReachable(host, port, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const socket = tls.connect(
            { host, port, servername: host, timeout: timeoutMs },
            () => {
                socket.end()
                resolve(true)
            },
        )
        socket.on('error', () => resolve(false))
        socket.on('timeout', () => {
            socket.destroy()
            resolve(false)
        })
    })
}

async function writableUri(uri) {
    if (!uri.startsWith('mongodb+srv://')) return uri

    const parsed = new URL(uri)
    const user = encodeURIComponent(decodeURIComponent(parsed.username))
    const pass = encodeURIComponent(decodeURIComponent(parsed.password))
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'hearth')
    const records = await dns.resolve(`_mongodb._tcp.${parsed.hostname}`, 'SRV')

    let lastError
    for (const rec of records) {
        const host = rec.name.replace(/\.$/, '')
        const port = rec.port || 27017
        if (!(await tlsReachable(host, port))) {
            lastError = new Error(`TLS timeout ${host}:${port}`)
            continue
        }

        const probe = `mongodb://${user}:${pass}@${host}:${port}/${dbName}?tls=true&authSource=admin&directConnection=true&retryWrites=false`
        const client = new MongoClient(probe, { serverSelectionTimeoutMS: 10000 })
        try {
            await client.connect()
            const hello = await client.db('admin').command({ hello: 1 })
            await client.close()
            if (hello.isWritablePrimary) return probe
            lastError = new Error(`${host} is not the replica set primary`)
        } catch (e) {
            lastError = e
            await client.close().catch(() => {})
        }
    }

    throw lastError || new Error('No reachable MongoDB Atlas primary')
}

async function connectDB({ reset = false } = {}) {
    mongoose.set('strictQuery', true)
    await mongoose.connect(await writableUri(mongoUri), { serverSelectionTimeoutMS: 15000 })
    if (reset) await mongoose.connection.dropDatabase()
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()))
}

module.exports = connectDB
