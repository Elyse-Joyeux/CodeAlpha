"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  function tryJoin() {
    const c = joinCode.trim();
    if (!c) return;
    router.push("/login?join=" + encodeURIComponent(c));
  }

  return (
    <div className="landing-page">
      <div className="landing-shape shape-cube" aria-hidden />
      <div className="landing-shape shape-ring" aria-hidden />
      <div className="landing-shape shape-cylinder" aria-hidden />
      <div className="landing-shape shape-blob" aria-hidden />

      <div className="landing-card">
        <p className="brand-pill">MeetSpace</p>
        <h1>Video meetings with chat, files & whiteboard</h1>
        <p className="landing-lead">
          Encrypted file sharing, real-time collaboration, and crisp WebRTC video — built for
          teams that need more than a link.
        </p>
        <div className="landing-actions">
          <Link href="/login" className="landing-cta primary">
            Sign in
          </Link>
          <Link href="/signup" className="landing-cta ghost">
            Create account
          </Link>
        </div>
        <div className="join-teaser">
          <label htmlFor="join-code">Have a meeting code?</label>
          <div className="join-row">
            <input
              id="join-code"
              className="auth-input"
              placeholder="Enter code after sign-in"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryJoin()}
            />
            <button type="button" className="landing-cta ghost compact" onClick={tryJoin}>
              Continue
            </button>
          </div>
          <p className="join-hint">You&apos;ll sign in first, then join the room.</p>
        </div>
      </div>
    </div>
  );
}
