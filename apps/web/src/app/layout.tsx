import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LLEVA Platform - Admin',
  description: 'Panel de administración LLEVA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-50 antialiased">
        {children}
      </body>
    </html>
  )
}