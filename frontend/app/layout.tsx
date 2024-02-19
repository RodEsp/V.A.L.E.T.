import './globals.css';

import Providers from '@/app/context/SessionWrapper';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="dark min-h-screen flex flex-col items-center justify-center text-2xl">
            {children}
          </main >
        </Providers>
      </body>
    </html>
  );
}
