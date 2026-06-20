-- CreateEnum
CREATE TYPE "EstadoArchivo" AS ENUM ('ACTIVO', 'ARCHIVADO', 'ELIMINADO');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nombre_rol" VARCHAR(50) NOT NULL,
    "nivel_numerico" INTEGER NOT NULL DEFAULT 1,
    "descripcion" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clasificacion_seguridad" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "nivel_numerico" INTEGER NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "clasificacion_seguridad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre_usuario" VARCHAR(120) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "rol_id" TEXT NOT NULL,
    "nivel_clasificacion_id" TEXT NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" TEXT NOT NULL,
    "nombre_proyecto" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nivel_clasificacion_minimo_id" TEXT NOT NULL,

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "necesidad_saber" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "autorizado_por" TEXT NOT NULL,
    "fecha_concesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "necesidad_saber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" TEXT NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_cifrada" TEXT NOT NULL,
    "hash_original" VARCHAR(64) NOT NULL,
    "tamanio" INTEGER NOT NULL,
    "mime_type" VARCHAR(100),
    "descripcion" TEXT,
    "estado" "EstadoArchivo" NOT NULL DEFAULT 'ACTIVO',
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nivel_clasificacion_id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gestion_claves" (
    "id" TEXT NOT NULL,
    "archivo_id" TEXT NOT NULL,
    "clave_cifrada" TEXT NOT NULL,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_rotacion_programada" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gestion_claves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_acceso_inmutable" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "evento" VARCHAR(80) NOT NULL,
    "detalle" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash_anterior" VARCHAR(64) NOT NULL,
    "firma_digital" VARCHAR(64) NOT NULL,

    CONSTRAINT "logs_acceso_inmutable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo_biometria" VARCHAR(40) NOT NULL,
    "hash_template" VARCHAR(128) NOT NULL,
    "sal_template" VARCHAR(64) NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_mfa" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo_factor" VARCHAR(40) NOT NULL,
    "resultado" VARCHAR(20) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalles" TEXT,

    CONSTRAINT "eventos_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_rol_key" ON "roles"("nombre_rol");

-- CreateIndex
CREATE UNIQUE INDEX "clasificacion_seguridad_nombre_key" ON "clasificacion_seguridad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clasificacion_seguridad_nivel_numerico_key" ON "clasificacion_seguridad"("nivel_numerico");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_usuario_key" ON "usuarios"("nombre_usuario");

-- CreateIndex
CREATE INDEX "usuarios_nombre_usuario_idx" ON "usuarios"("nombre_usuario");

-- CreateIndex
CREATE INDEX "usuarios_rol_id_idx" ON "usuarios"("rol_id");

-- CreateIndex
CREATE INDEX "proyectos_nivel_clasificacion_minimo_id_idx" ON "proyectos"("nivel_clasificacion_minimo_id");

-- CreateIndex
CREATE INDEX "necesidad_saber_usuario_id_idx" ON "necesidad_saber"("usuario_id");

-- CreateIndex
CREATE INDEX "necesidad_saber_proyecto_id_idx" ON "necesidad_saber"("proyecto_id");

-- CreateIndex
CREATE UNIQUE INDEX "necesidad_saber_usuario_id_proyecto_id_key" ON "necesidad_saber"("usuario_id", "proyecto_id");

-- CreateIndex
CREATE INDEX "archivos_usuario_id_idx" ON "archivos"("usuario_id");

-- CreateIndex
CREATE INDEX "archivos_proyecto_id_idx" ON "archivos"("proyecto_id");

-- CreateIndex
CREATE INDEX "archivos_nivel_clasificacion_id_idx" ON "archivos"("nivel_clasificacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "gestion_claves_archivo_id_key" ON "gestion_claves"("archivo_id");

-- CreateIndex
CREATE INDEX "logs_acceso_inmutable_usuario_id_idx" ON "logs_acceso_inmutable"("usuario_id");

-- CreateIndex
CREATE INDEX "logs_acceso_inmutable_timestamp_idx" ON "logs_acceso_inmutable"("timestamp");

-- CreateIndex
CREATE INDEX "biometria_usuario_id_idx" ON "biometria"("usuario_id");

-- CreateIndex
CREATE INDEX "eventos_mfa_usuario_id_idx" ON "eventos_mfa"("usuario_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nivel_clasificacion_id_fkey" FOREIGN KEY ("nivel_clasificacion_id") REFERENCES "clasificacion_seguridad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_nivel_clasificacion_minimo_id_fkey" FOREIGN KEY ("nivel_clasificacion_minimo_id") REFERENCES "clasificacion_seguridad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidad_saber" ADD CONSTRAINT "necesidad_saber_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidad_saber" ADD CONSTRAINT "necesidad_saber_autorizado_por_fkey" FOREIGN KEY ("autorizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidad_saber" ADD CONSTRAINT "necesidad_saber_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_nivel_clasificacion_id_fkey" FOREIGN KEY ("nivel_clasificacion_id") REFERENCES "clasificacion_seguridad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gestion_claves" ADD CONSTRAINT "gestion_claves_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_acceso_inmutable" ADD CONSTRAINT "logs_acceso_inmutable_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometria" ADD CONSTRAINT "biometria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_mfa" ADD CONSTRAINT "eventos_mfa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Inmutabilidad de la bitácora (NO UPDATE / NO DELETE) ────────────────────
-- Prisma no expresa RULEs en el datamodel; se incluyen aquí para que la tabla
-- logs_acceso_inmutable sólo admita INSERT.
CREATE RULE "logs_no_update" AS ON UPDATE TO "logs_acceso_inmutable" DO INSTEAD NOTHING;
CREATE RULE "logs_no_delete" AS ON DELETE TO "logs_acceso_inmutable" DO INSTEAD NOTHING;
