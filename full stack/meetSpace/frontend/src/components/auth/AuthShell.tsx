"use client";

import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  fields: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  busy?: boolean;
  error?: string;
  altPrompt: string;
  altHref: string;
  altLabel: string;
  oauthVerb?: "Sign up" | "Log in";
};

function Shape({ className }: { className: string }) {
  return <div className={`auth-shape ${className}`} aria-hidden />;
}

export function AuthShell({
  title,
  fields,
  submitLabel,
  onSubmit,
  busy,
  error,
  altPrompt,
  altHref,
  altLabel,
  oauthVerb = "Sign up",
}: Props) {
  return (
    <div className="auth-page">
      <Shape className="shape-cube" />
      <Shape className="shape-ring" />
      <Shape className="shape-cylinder" />
      <Shape className="shape-blob" />
      <Shape className="shape-star" />

      <div className="auth-card">
        <div className="auth-grid">
          <div className="auth-fields">
            <h1>{title}</h1>
            {fields}
            {error ? <p className="auth-error">{error}</p> : null}
          </div>
          <div className="auth-actions">
            <button
              type="button"
              className="auth-primary"
              disabled={busy}
              onClick={onSubmit}
            >
              {busy ? "Please wait…" : submitLabel}
            </button>
            <p className="auth-alt">
              {altPrompt}{" "}
              <Link href={altHref} className="auth-link">
                {altLabel}
              </Link>
            </p>
            <div className="auth-or">
              <span />
              <em>Or</em>
              <span />
            </div>
            <button type="button" className="auth-oauth" disabled title="Email sign-in required">
              <GoogleIcon />
              {oauthVerb} with Google
            </button>
            <button type="button" className="auth-oauth" disabled title="Email sign-in required">
              <FacebookIcon />
              {oauthVerb} with Facebook
            </button>
            <p className="auth-oauth-hint">Social sign-in is not configured — use email and password.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.203 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.024 4.388 11.021 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.094 24 18.097 24 12.073z"
      />
    </svg>
  );
}
