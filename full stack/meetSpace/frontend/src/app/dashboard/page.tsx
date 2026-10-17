"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getName, getToken } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const timer = window.setTimeout(() => setMe(getName()), 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  async function create() {
    setBusy(true);
    setErr("");
    try {
      const { code: roomCode } = await api<{ code: string }>("/api/rooms", {
        method: "POST",
      });
      router.push("/room/" + roomCode);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function join() {
    const c = code.trim();
    if (c) router.push("/room/" + c);
  }

  function logout() {
    localStorage.removeItem("t");
    localStorage.removeItem("name");
    router.push("/");
  }

  if (!me) return null;

  return (
    <div className="landing-page">
      <div className="landing-shape shape-cube" aria-hidden />
      <div className="landing-shape shape-ring" aria-hidden />
      <div className="landing-card dashboard-card">
        <p className="brand-pill">MeetSpace</p>
        <h1>Welcome back, {me}</h1>
        <p className="landing-lead">Start a secure meeting or join with a code.</p>
        <button type="button" className="landing-cta primary" disabled={busy} onClick={create}>
          {busy ? "Creating…" : "New meeting"}
        </button>
        <div className="dashboard-join">
          <input
            className="auth-input"
            type="text"
            placeholder="Meeting code (e.g. a1b2c3d4)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
          />
          <button type="button" className="landing-cta ghost" onClick={join}>
            Join
          </button>
        </div>
        {err ? <p className="auth-error">{err}</p> : null}
        <button type="button" className="text-btn" onClick={logout}>
          Log out
        </button>
        <Link href="/" className="text-btn subtle">
          Back to home
        </Link>
      </div>
    </div>
  );
}
