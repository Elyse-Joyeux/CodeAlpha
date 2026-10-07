import './globals.css'
import type { ReactNode } from 'react'


export const metadata = {
  title: "Taskflow",
  description: "Plan projects and work together",
};

export default function RootLayout({ children }: { children: ReactNode}) {
  return (
    <html lang='en'>
      <body>
        {children}
      </body>
    </html>
  );
}
