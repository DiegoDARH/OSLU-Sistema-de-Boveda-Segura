import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '@/lib/utils'
import { generateFileKey, encryptBuffer, hashContent, wrapKey } from '@/lib/crypto'
import { registrarEvento, extraerOrigen } from '@/lib/audit'
import { proyectosVisibles } from '@/lib/access'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './storage/vault'

// ─── GET: listar archivos visibles para el usuario ────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  const sp        = req.nextUrl.searchParams
  const page      = Math.max(1, Number(sp.get('page') ?? 1))
  const limit     = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)))
  const proyectoId = sp.get('proyectoId')
  const search    = sp.get('q') ?? ''

  // Need-to-Know: sólo proyectos a los que el usuario tiene acceso efectivo.
  const visibles = await proyectosVisibles(session.sub)
  if (visibles.length === 0) {
    return NextResponse.json({ ok: true, data: { items: [], total: 0, page, limit, pages: 0 } })
  }

  const where = {
    estado: 'ACTIVO' as const,
    proyecto_id: proyectoId && visibles.includes(proyectoId) ? proyectoId : { in: visibles },
    // No mostrar archivos por encima de la acreditación del usuario.
    nivel_clasificacion: { nivel_numerico: { lte: session.nivel } },
    ...(search && { nombre_archivo: { contains: search, mode: 'insensitive' as const } }),
  }

  const [items, total] = await Promise.all([
    prisma.archivo.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { fecha_subida: 'desc' },
      select: {
        id: true, nombre_archivo: true, hash_original: true, tamanio: true,
        mime_type: true, descripcion: true, estado: true, fecha_subida: true,
        usuario_id: true, nivel_clasificacion_id: true, proyecto_id: true,
        usuario:             { select: { id: true, nombre_usuario: true } },
        nivel_clasificacion: { select: { id: true, nombre: true, nivel_numerico: true } },
        proyecto:            { select: { id: true, nombre_proyecto: true } },
        // ruta_cifrada NUNCA se selecciona hacia el cliente.
      },
    }),
    prisma.archivo.count({ where }),
  ])

  return NextResponse.json({
    ok: true,
    data: {
      items: items.map((a) => ({ ...a, fecha_subida: a.fecha_subida.toISOString() })),
      total, page, limit, pages: Math.ceil(total / limit),
    },
  })
}

// ─── POST: subir y cifrar un archivo ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  // Subir requiere al menos Gestor.
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para subir' }, { status: 403 })
  }

  const origen = extraerOrigen(req)

  try {
    const form        = await req.formData()
    const file        = form.get('file') as File | null
    const proyectoId  = form.get('proyectoId') as string | null
    const nivelId     = form.get('nivelClasificacionId') as string | null
    const descripcion = (form.get('descripcion') as string | null) ?? null

    if (!file)       return NextResponse.json({ ok: false, error: 'No se recibió archivo' }, { status: 400 })
    if (!proyectoId) return NextResponse.json({ ok: false, error: 'Proyecto requerido' }, { status: 400 })
    if (!nivelId)    return NextResponse.json({ ok: false, error: 'Nivel de clasificación requerido' }, { status: 400 })

    const ext = extname(file.name).slice(1).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ ok: false, error: `Extensión .${ext} no permitida` }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: 'Archivo excede el límite permitido' }, { status: 400 })
    }

    // Validaciones de seguridad: proyecto válido + acreditación + need-to-know.
    const [proyecto, nivel] = await Promise.all([
      prisma.proyecto.findUnique({ where: { id: proyectoId }, include: { nivel_clasificacion_minimo: true } }),
      prisma.clasificacionSeguridad.findUnique({ where: { id: nivelId } }),
    ])
    if (!proyecto || !nivel) {
      return NextResponse.json({ ok: false, error: 'Proyecto o nivel inexistente' }, { status: 400 })
    }
    // No se puede clasificar un archivo por encima de la acreditación propia.
    if (nivel.nivel_numerico > session.nivel) {
      return NextResponse.json({ ok: false, error: 'No puede clasificar por encima de su acreditación' }, { status: 403 })
    }
    // El archivo no puede tener menor nivel que el mínimo del compartimento.
    if (nivel.nivel_numerico < proyecto.nivel_clasificacion_minimo.nivel_numerico) {
      return NextResponse.json({ ok: false, error: 'El nivel es inferior al mínimo del proyecto' }, { status: 400 })
    }

    // ── Cifrado: hash → data key → AES-256-GCM → envelope de la clave ──────────
    const original = Buffer.from(await file.arrayBuffer())
    const hash      = hashContent(original)
    const fileKey   = generateFileKey()
    const encrypted = encryptBuffer(original, fileKey)
    const claveCifrada = wrapKey(fileKey)

    await mkdir(join(process.cwd(), UPLOAD_DIR), { recursive: true })
    const storedName = `${randomUUID()}.enc`
    const rutaCifrada = join(UPLOAD_DIR, storedName)
    await writeFile(join(process.cwd(), rutaCifrada), encrypted)

    // ── Persistir archivo + clave en una transacción ──────────────────────────
    const archivo = await prisma.archivo.create({
      data: {
        nombre_archivo:         file.name,
        ruta_cifrada:           rutaCifrada,
        hash_original:          hash,
        tamanio:                file.size,
        mime_type:              file.type || null,
        descripcion,
        usuario_id:             session.sub,
        nivel_clasificacion_id: nivelId,
        proyecto_id:            proyectoId,
        clave: { create: { clave_cifrada: claveCifrada } },
      },
      select: {
        id: true, nombre_archivo: true, tamanio: true, fecha_subida: true,
        nivel_clasificacion: { select: { nombre: true, nivel_numerico: true } },
        proyecto:            { select: { id: true, nombre_proyecto: true } },
      },
    })

    await registrarEvento({
      usuarioId: session.sub,
      evento: 'UPLOAD',
      detalle: `Subió "${file.name}" (${file.size} bytes, SHA-256 ${hash.slice(0, 12)}…) al proyecto ${proyecto.nombre_proyecto}`,
      ...origen,
    })

    return NextResponse.json(
      { ok: true, data: { ...archivo, fecha_subida: archivo.fecha_subida.toISOString() } },
      { status: 201 },
    )
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] [UPLOAD]`, err)
    return NextResponse.json({ ok: false, error: 'Error al procesar el archivo' }, { status: 500 })
  }
}
