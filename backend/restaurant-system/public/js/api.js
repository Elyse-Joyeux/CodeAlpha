import { S } from './state.js'

// thin fetch wrapper: JSON
export async function api(path, o = {}){
    const admin = path.startsWith('/admin')
    const r = await fetch('/api' + path, {
        method: o.method || 'GET',
        headers: { 'Contenty-Type': 'application/json', ...(admin && S.token ? { Authorization: 'Bearer ' + S.token } : {})},
        body: o.body ? JSON.stringify(o.body) : undefined
    })

    const d = await r.json().catch(()=> {})
    if (!r.ok) {
        if(r.status === 401 && admin) {
            S.token = ''; sessionStorage.removeItem('hearth')
            throw new Error(d.error || 'Request failed');
        }
    }
    return d;
}