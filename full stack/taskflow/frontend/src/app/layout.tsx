import './globals.css'
import type { ReactNode } from 'react'


export const metadata = { title: 'Taskflow',
  icons: {icon: '/favicon.ico'}
}

export default function RootLayout({ children }: { children: ReactNode}) {
  return (
    <html lang='en'>
      <body>
        {children}
      </body>
    </html>
  );
}
