import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default:  'OSLU - Bóveda Segura',
    template: '%s | OSLU - Bóveda Segura',
  },
  description: 'Sistema de repositorio digital seguro de documentos',
  icons: { icon: '/LOGO.png', shortcut: '/LOGO.png', apple: '/LOGO.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
