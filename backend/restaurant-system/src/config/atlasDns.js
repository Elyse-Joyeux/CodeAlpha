const dns = require('node:dns')

dns.setDefaultResultOrder('ipv4first')

const origResolve = dns.promises.resolve.bind(dns.promises)

function parseSrv(data) {
    const [priority, weight, port, name] = String(data).trim().split(/\s+/)
    return {
        priority: Number(priority),
        weight: Number(weight),
        port: Number(port),
        name: String(name).replace(/\.$/, ''),
    }
}

async function doh(name, type) {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`
    const res = await fetch(url, { headers: { accept: 'application/dns-json' } })
    if (!res.ok) throw new Error(`DNS-over-HTTPS ${res.status} for ${name}`)
    const json = await res.json()
    return json.Answer || []
}

dns.promises.resolve = async function resolveWithDohFallback(hostname, rrtype) {
    try {
        return await origResolve(hostname, rrtype)
    } catch (err) {
        if (rrtype !== 'SRV' && rrtype !== 'TXT') throw err
        const answers = await doh(hostname, rrtype)
        if (rrtype === 'SRV') {
            const records = answers.filter((a) => a.type === 33).map((a) => parseSrv(a.data))
            if (!records.length) throw err
            return records
        }
        const txt = answers
            .filter((a) => a.type === 16)
            .map((a) => [String(a.data).replace(/^"|"$/g, '')])
        if (!txt.length) throw err
        return txt
    }
}
