'use client';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { api } from '@/lib/api'


type Project = { id: string; name: string; task_count: number }


export default function Projects(){
    const router = useRouter()
    const [list, setList] = useState<Project[]>([])
    const [name, setName] = useState('')
    const [err, setErr] = useState('')

    useEffect(() => {
        api<Project[]>('/api/projects').then(setList).catch(e => setErr(e.message));
    }, [])

    async function create(){
        if(!name.trim()) return;
        try {
            const p = await api<Project>('/api/projects', {
                method: 'POST',
                body: JSON.stringify({ name }),
            })

            router.push('/projects/' + p.id)
        } catch(e){
            setErr((e as Error).message)
        }
    }

    return (
        <>
      <Header />
      <div className="wrap">
        <h2>Your projects</h2>
        <div className="row" style={{ marginBottom: 16, maxWidth: 420 }}>
          <input placeholder="New project name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
          <button className="p" onClick={create}>Create</button>
        </div>
        <div className="err">{err}</div>
        {list.length === 0 && <p className="mut">No projects yet. Create one to get started.</p>}
        <div className="grid">
          {list.map(p => (
            <div key={p.id} className="pc" onClick={() => router.push('/projects/' + p.id)}>
              <b>{p.name}</b><div className="mut">{p.task_count} task{p.task_count === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      </div>
    </>
    )
}
