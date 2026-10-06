"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import TaskModal from "@/components/TaskModal";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Status, Task, User } from "@/lib/types";

const COLS: { key: Status; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<{ name: string } | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const upsert = (t: Task) =>
    setTasks((l) =>
      l.some((x) => x.id === t.id)
        ? l.map((x) => (x.id === t.id ? t : x))
        : [...l, t],
    );
  const remove = (tid: string) =>
    setTasks((l) => l.filter((x) => x.id !== tid));

  useEffect(() => {
    api(`/api/projects/${id}`)
      .then((d) => {
        setProject(d.project);
        setMembers(d.members);
        setTasks(d.tasks);
      })
      .catch((e) => setErr(e.message));
    const s = getSocket();
    const watch = () => s.emit("watch", id);
    const del = ({ id: tid }: { id: string }) => remove(tid);
    const mem = (u: User) =>
      setMembers((l) => (l.some((x) => x.id === u.id) ? l : [...l, u]));
    watch();
    s.on("conanect", watch);
    s.on("task:created", upsert);
    s.on("task:updated", upsert);
    s.on("task:deleted", del);
    s.on("member:added", mem);
    return () => {
      s.emit("unwatch", id);
      s.off("connect", watch);
      s.off("task:created", upsert);
      s.off("task:updated", upsert);
      s.off("task:deleted", del);
      s.off("member:added", mem);
    };
  }, [id]);

  async function add(status: Status) {
    const title = (drafts[status] ?? "").trim();
    if (!title) return;
    setDrafts((d) => ({ ...d, [status]: "" }));
    try {
      upsert(
        await api<Task>(`/api/projects/${id}/tasks`, {
          method: "POST",
          body: JSON.stringify({ title, status }),
        }),
      );
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function drop(status: Status, e: React.DragEvent) {
    const tid = e.dataTransfer.getData("text/plain"),
      t = tasks.find((x) => x.id === tid);
    if (!t || t.status === status) return;
    upsert({ ...t, status }); // optimistic
    try {
      upsert(
        await api<Task>(`/api/tasks/${tid}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      );
    } catch {
      upsert(t);
    }
  }
  async function invite() {
    try {
      await api(`/api/projects/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail("");
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const open = tasks.find((t) => t.id === openId);
  if (!project)
    return (
      <>
        <Header />
        <div className="wrap">
          {err ? <p className="err">{err}</p> : "Loading…"}
        </div>
      </>
    );

  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 1300 }}>
        <div className="row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>{project.name}</h2>
          <span className="sp" />
          <span className="mut">
            Members: {members.map((m) => m.display_name).join(", ")}
          </span>
          <input
            style={{ flex: "0 1 200px" }}
            placeholder="Invite by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={invite}>Invite</button>
        </div>
        <div className="err">{err}</div>
        <div className="cols">
          {COLS.map((c) => (
            <div
              key={c.key}
              className="col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(c.key, e)}
            >
              <h3>
                {c.label} ({tasks.filter((t) => t.status === c.key).length})
              </h3>
              {tasks
                .filter((t) => t.status === c.key)
                .map((t) => (
                  <div
                    key={t.id}
                    className="card"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", t.id)
                    }
                    onClick={() => setOpenId(t.id)}
                  >
                    {t.title}
                    {t.assignee_name && (
                      <div>
                        <span className="tag">{t.assignee_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              <div className="row">
                <input
                  placeholder="+ Add task"
                  value={drafts[c.key] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [c.key]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && add(c.key)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {open && (
        <TaskModal
          task={open}
          members={members}
          onClose={() => setOpenId(null)}
          onUpdate={upsert}
          onDelete={remove}
        />
      )}
    </>
  );
}
