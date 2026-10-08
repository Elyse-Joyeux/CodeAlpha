import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "MeetSpace", icons: { icon: "/favicon.svg" } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
