"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { api, getToken } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const joinRoom = search.get("join");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    router.replace(joinRoom ? "/room/" + joinRoom : "/dashboard");
  }, [router, joinRoom]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ token: string; user: { name: string } }>(
        "/api/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      localStorage.setItem("t", d.token);
      localStorage.setItem("name", d.user.name);
      router.push(joinRoom ? "/room/" + joinRoom : "/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Log In"
      submitLabel="Log In"
      onSubmit={submit}
      busy={busy}
      error={error}
      altPrompt="Don't have an account?"
      altHref="/signup"
      altLabel="Sign up"
      oauthVerb="Log in"
      fields={
        <>
          <input
            className="auth-input"
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </>
      }
    />
  );
}
