/**
 * seed.ts — Datos iniciales del Sistema de Bóveda Segura (v2).
 *
 * Crea: roles, niveles de clasificación, usuarios de prueba, un proyecto
 * de ejemplo y una autorización Need-to-Know. Idempotente vía upsert.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database (v2)...')

  // ── Roles ───────────────────────────────────────────────────────────────────
  const [rolAdmin, rolGestor, rolAnalista] = await Promise.all([
    prisma.rol.upsert({
      where: { nombre_rol: 'Administrador' },
      update: {},
      create: { nombre_rol: 'Administrador', nivel_numerico: 3, descripcion: 'Control total del sistema' },
    }),
    prisma.rol.upsert({
      where: { nombre_rol: 'Gestor' },
      update: {},
      create: { nombre_rol: 'Gestor', nivel_numerico: 2, descripcion: 'Carga y gestión de archivos' },
    }),
    prisma.rol.upsert({
      where: { nombre_rol: 'Analista' },
      update: {},
      create: { nombre_rol: 'Analista', nivel_numerico: 1, descripcion: 'Consulta según necesidad de saber' },
    }),
  ])

  // ── Clasificaciones de seguridad ─────────────────────────────────────────────
  const [clPublico, clNormal, clConfidencial, clTopSecret] = await Promise.all([
    prisma.clasificacionSeguridad.upsert({ where: { nivel_numerico: 1 }, update: {}, create: { nombre: 'PUBLICO',      nivel_numerico: 1, descripcion: 'Sin restricción' } }),
    prisma.clasificacionSeguridad.upsert({ where: { nivel_numerico: 2 }, update: {}, create: { nombre: 'NORMAL',       nivel_numerico: 2, descripcion: 'Uso interno' } }),
    prisma.clasificacionSeguridad.upsert({ where: { nivel_numerico: 3 }, update: {}, create: { nombre: 'CONFIDENCIAL', nivel_numerico: 3, descripcion: 'Acceso restringido' } }),
    prisma.clasificacionSeguridad.upsert({ where: { nivel_numerico: 4 }, update: {}, create: { nombre: 'TOP_SECRET',   nivel_numerico: 4, descripcion: 'Máxima reserva' } }),
  ])

  // ── Usuarios ─────────────────────────────────────────────────────────────────
  const admin = await prisma.usuario.upsert({
    where: { nombre_usuario: 'admin' },
    update: {},
    create: {
      nombre_usuario: 'admin',
      password_hash:  await bcrypt.hash('Admin1234!', 12),
      rol_id:                 rolAdmin.id,
      nivel_clasificacion_id: clTopSecret.id,
      activo: true,
    },
  })

  const gestor = await prisma.usuario.upsert({
    where: { nombre_usuario: 'gestor' },
    update: {},
    create: {
      nombre_usuario: 'gestor',
      password_hash:  await bcrypt.hash('Gestor1234!', 12),
      rol_id:                 rolGestor.id,
      nivel_clasificacion_id: clConfidencial.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { nombre_usuario: 'analista' },
    update: {},
    create: {
      nombre_usuario: 'analista',
      password_hash:  await bcrypt.hash('Analista1234!', 12),
      rol_id:                 rolAnalista.id,
      nivel_clasificacion_id: clNormal.id,
      activo: true,
    },
  })

  // ── Proyecto / compartimento de ejemplo ──────────────────────────────────────
  const proyecto = await prisma.proyecto.upsert({
    where: { id: 'proj-demo' },
    update: {},
    create: {
      id: 'proj-demo',
      nombre_proyecto: 'Operación Centinela',
      descripcion: 'Compartimento de demostración',
      nivel_clasificacion_minimo_id: clNormal.id,
    },
  })

  // ── Need-to-Know: el gestor queda autorizado en el proyecto demo ─────────────
  await prisma.necesidadSaber.upsert({
    where: { usuario_id_proyecto_id: { usuario_id: gestor.id, proyecto_id: proyecto.id } },
    update: {},
    create: { usuario_id: gestor.id, proyecto_id: proyecto.id, autorizado_por: admin.id },
  })

  console.log('Seed completo.')
  console.log('Credenciales de acceso:')
  console.log('  Admin    → admin    / Admin1234!     (TOP_SECRET)')
  console.log('  Gestor   → gestor   / Gestor1234!    (CONFIDENCIAL, autorizado en "Operación Centinela")')
  console.log('  Analista → analista / Analista1234!  (NORMAL, sin necesidad de saber aún)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
