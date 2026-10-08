"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getName, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (getToken()) setMe(getName());
  }, []);

  async function go(kind: "login" | "register") {
    try {
      const d = await api<{ token: string; user: { name: string } }>(
        "/api/" + kind,
        {
          method: "POST",
          body: JSON.stringify(f),
        },
      );

      localStorage.setItem("t", d.token);
      localStorage.setItem("name", d.user.name);
      setMe(d.user.name);
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function create() {
    try {
      router.path(
        "/room/" +
          (
            await api<{ code: string }>("/api/rooms", {
              method: "POST",
            })
          ).code,
      );
    } catch {
      localStorage.clear();
      setMe(null);
    }
  }

  if (me)
    return (
      <div className="center">
        <h2 style={{ margin: 0 }}>Hi, {me}</h2>
        <button className="p" onClick={create}>
          New meeting
        </button>
        <div className="row">
          <input
            type="text"
            placeholder="Meeting code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            onClick={() => code.trim() && router.push("/room/" + code.trim())}
          >
            Join
          </button>
        </div>
        <button
          onClick={() => {
            localStorage.clear();
            setMe(null);
          }}
        >
          Log out
        </button>
      </div>
    );

  return (
    <div className="center">
      <h1 style={{ margin: 0 }}>MeetSpace</h1>
      <p className="mut" style={{ margin: 0 }}>
        Sign in to start or join a meeting
      </p>
      <input
        placeholder="Display name (register only)"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password (8+ chars)"
        value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })}
      />
      <button className="p" onClick={() => go("login")}>
        Log in
      </button>
      <button onClick={() => go("register")}>Create account</button>
      <div className="err">{err}</div>
    </div>
  ); 
}
