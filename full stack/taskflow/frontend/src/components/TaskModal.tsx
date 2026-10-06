"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Comment, Status, Task, User } from "@/lib/types";

type Props = {
  task: Task;
  members: User[];
  onClose: () => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
};

export default function TaskModal({
  task,
  members,
  onClose,
  onUpdate,
  onDelete,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    api<Comment[]>(`/api/tasks/${task.id}/comments`)
      .then(setComments)
      .catch(() => {});
    const s = getSocket();
    const on = (c: Comment) =>
      c.task_id === task.id &&
      setComments((l) => (l.some((x) => x.id === c.id) ? l : [...l, c]));
    s.on("comment:new", on);
    return () => {
      s.off("comment:new", on);
    };
  }, [task.id]);

  const path = async (b: Partial<Task>) =>
    onUpdate(
      await api<Task>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    );

  async function send() {
    if (!text.trim()) return;
    const c = await api<Comment>(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });

    setComments((l) => (l.some((x) => x.id === c.id) ? l : [...l, c]));
    setText("");
  }

  async function remove() {
    if (!confirm("Delete this task?")) return;
    await api(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });
    onDelete(task.id);
    onClose();
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <input
          key={task.id + task.title}
          defaultValue={task.title}
          style={{ fontWeight: 700, fontSize: 18 }}
          onBlur={(e) =>
            e.target.value.trim() &&
            e.target.value !== task.title &&
            patch({ title: e.target.value })
          }
        />
        <textarea
          rows={3}
          placeholder="Description"
          defaultValue={task.description}
          onBlur={(e) =>
            e.target.value !== task.description &&
            patch({ description: e.target.value })
          }
        />
        <div className="row">
          <select
            value={task.status}
            onChange={(e) => patch({ status: e.target.value as Status })}
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <select
            value={task.assignee_id ?? ""}
            onChange={(e) => patch({ assignee_id: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <span className="sp" />
          <button className="d" onClick={remove}>
            Delete
          </button>
        </div>
        <b>Comments</b>
        {comments.length === 0 && <span className="mut">No comments yet</span>}
        {comments.map((c) => (
          <div className="cm" key={c.id}>
            <b>{c.name}: </b>
            {c.body}
          </div>
        ))}
        <div className="row">
          <input
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="p" onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
