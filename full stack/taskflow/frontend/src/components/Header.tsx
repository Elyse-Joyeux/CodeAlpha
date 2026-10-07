"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, clearSession, getName } from "@/lib/api";
import { closeSocket, getSocket } from "@/lib/socket";
import type { Notif } from "@/lib/types";

export default function Header() {
  const router = useRouter();
  const [list, setList] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(getName() ?? "");
    api<Notif[]>("/api/notifications")
      .then(setList)
      .catch(() => {});
    const s = getSocket();
    const on = (n: Notif) => setList((l) => [n, ...l]);
    s.on("notification", on);
    return () => {
      s.off("notification", on);
    };
  }, []);

  const unread = list.filter((n) => !n.read).length;
  async function toggle() {
    if (open && unread) {
      await api("/api/notifications/read", {
        method: "POST",
      });
      setList((l) => l.map((n) => ({ ...n, read: true })));
    }
    setOpen(!open);
  }

  return (
    <div className="hdr">
      <Link href="/projects">TaskFlow</Link>
      <span className="sp" />
      <button onClick={toggle}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-bell preview-icon"
        >
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      <span className="mut">{name}</span>
      <button
        onClick={() => {
          clearSession();
          closeSocket();
          router.push("/");
        }}
      >
        Log out
      </button>
      {open && (
        <div className="dd">
          {list.length === 0 && <div className="mut">No notifications yet</div>}
          {list.map((n) => (
            <div
              key={n.id}
              className={n.read ? "" : "un"}
              onClick={() => {
                setOpen(false);
                router.push("/projects/" + n.project_id);
              }}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
