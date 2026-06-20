import { redirect } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.sub },
    select: {
      id: true, nombre_usuario: true, activo: true,
      rol:                 { select: { nombre_rol: true, nivel_numerico: true } },
      nivel_clasificacion: { select: { nombre: true } },
    },
  })

  if (!usuario || !usuario.activo) redirect('/login')

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar
          userName={usuario.nombre_usuario}
          userRole={usuario.rol.nombre_rol}
          roleLevel={usuario.rol.nivel_numerico}
          clearanceName={usuario.nivel_clasificacion.nombre}
        />
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
