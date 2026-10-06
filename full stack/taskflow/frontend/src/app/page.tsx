'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken } from '@/lib/api'


export default function Home(){
  const router = useRouter()
  const [f, setF] = useState({ name: '', email: '', password: ''})
  const [err, setErr] = useState('')

  useEffect(() => {
    if (getToken())
      router.replace('/projects')
  }, [router])

  async function go(kind: 'login' | 'register') {
    try {
      const d = await api<{ token: string, user: { id: string; name: string}} >('/api/' + kind, { method: 'POST', body: JSON.stringify(f) });
      localStorage.setItem('t', d.token); localStorage.setItem('name', d.user.name); localStorage.setItem('uid', d.user.id);
      router.push('/projects');

    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="center">
      <h1 style={{ margin: 0}}>Taskflow</h1>
      <p className="mut" style={{ margin: 0}}>Plan projects and work together</p>
      <input placeholder="Display name (register only)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
      <input type="password" placeholder="Password (8+ chars)" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
      <button className="p" onClick={() => go('login')}>Log in</button>
      <button onClick={() => go('register')}>Create account</button>
      <div className="err">{err}</div>
    </div>
  )
}