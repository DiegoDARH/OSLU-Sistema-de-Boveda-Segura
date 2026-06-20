-- ============================================================
-- ESQUEMA SQL PURO — Sistema de Bóveda Segura (v2)
-- Compatible con PostgreSQL 14+
-- Equivalente de referencia a prisma/schema.prisma
-- ============================================================

CREATE TYPE "EstadoArchivo" AS ENUM ('ACTIVO', 'ARCHIVADO', 'ELIMINADO');

-- ─── Roles ───────────────────────────────────────────────────────────────────
CREATE TABLE "roles" (
    "id"             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nombre_rol"     VARCHAR(50) NOT NULL UNIQUE,
    "nivel_numerico" INTEGER     NOT NULL DEFAULT 1,
    "descripcion"    TEXT
);

-- ─── Clasificación de seguridad ──────────────────────────────────────────────
CREATE TABLE "clasificacion_seguridad" (
    "id"             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nombre"         VARCHAR(50) NOT NULL UNIQUE,
    "nivel_numerico" INTEGER     NOT NULL UNIQUE,
    "descripcion"    TEXT
);

-- ─── Usuarios ────────────────────────────────────────────────────────────────
CREATE TABLE "usuarios" (
    "id"                     TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nombre_usuario"         VARCHAR(120) NOT NULL UNIQUE,
    "password_hash"          TEXT         NOT NULL,
    "activo"                 BOOLEAN      NOT NULL DEFAULT TRUE,
    "fecha_creacion"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "fecha_actualizacion"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "rol_id"                 TEXT         NOT NULL REFERENCES "roles"("id")                  ON DELETE RESTRICT,
    "nivel_clasificacion_id" TEXT         NOT NULL REFERENCES "clasificacion_seguridad"("id") ON DELETE RESTRICT
);
CREATE INDEX "usuarios_nombre_usuario_idx" ON "usuarios" ("nombre_usuario");
CREATE INDEX "usuarios_rol_id_idx"         ON "usuarios" ("rol_id");

-- ─── Proyectos / compartimentos ──────────────────────────────────────────────
CREATE TABLE "proyectos" (
    "id"                            TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nombre_proyecto"               VARCHAR(150) NOT NULL,
    "descripcion"                   TEXT,
    "fecha_creacion"                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "nivel_clasificacion_minimo_id" TEXT         NOT NULL REFERENCES "clasificacion_seguridad"("id") ON DELETE RESTRICT
);
CREATE INDEX "proyectos_nivel_idx" ON "proyectos" ("nivel_clasificacion_minimo_id");

-- ─── Necesidad de saber ──────────────────────────────────────────────────────
CREATE TABLE "necesidad_saber" (
    "id"              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "usuario_id"      TEXT        NOT NULL REFERENCES "usuarios"("id")  ON DELETE CASCADE,
    "proyecto_id"     TEXT        NOT NULL REFERENCES "proyectos"("id") ON DELETE CASCADE,
    "autorizado_por"  TEXT        NOT NULL REFERENCES "usuarios"("id")  ON DELETE RESTRICT,
    "fecha_concesion" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("usuario_id", "proyecto_id")
);
CREATE INDEX "necesidad_saber_usuario_idx"  ON "necesidad_saber" ("usuario_id");
CREATE INDEX "necesidad_saber_proyecto_idx" ON "necesidad_saber" ("proyecto_id");

-- ─── Archivos cifrados ───────────────────────────────────────────────────────
CREATE TABLE "archivos" (
    "id"                     TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nombre_archivo"         VARCHAR(255)    NOT NULL,
    "ruta_cifrada"           TEXT            NOT NULL,
    "hash_original"          VARCHAR(64)     NOT NULL,      -- SHA-256 hex
    "tamanio"                INTEGER         NOT NULL,
    "mime_type"              VARCHAR(100),
    "descripcion"            TEXT,
    "estado"                 "EstadoArchivo" NOT NULL DEFAULT 'ACTIVO',
    "fecha_subida"           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "fecha_actualizacion"    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "usuario_id"             TEXT            NOT NULL REFERENCES "usuarios"("id")                ON DELETE RESTRICT,
    "nivel_clasificacion_id" TEXT            NOT NULL REFERENCES "clasificacion_seguridad"("id") ON DELETE RESTRICT,
    "proyecto_id"            TEXT            NOT NULL REFERENCES "proyectos"("id")               ON DELETE RESTRICT
);
CREATE INDEX "archivos_usuario_idx"  ON "archivos" ("usuario_id");
CREATE INDEX "archivos_proyecto_idx" ON "archivos" ("proyecto_id");
CREATE INDEX "archivos_nivel_idx"    ON "archivos" ("nivel_clasificacion_id");

-- ─── Gestión de claves (envelope encryption) ─────────────────────────────────
CREATE TABLE "gestion_claves" (
    "id"                        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "archivo_id"                TEXT        NOT NULL UNIQUE REFERENCES "archivos"("id") ON DELETE CASCADE,
    "clave_cifrada"             TEXT        NOT NULL,       -- iv:authTag:claveCifrada (hex)
    "fecha_generacion"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "fecha_rotacion_programada" TIMESTAMPTZ,
    "activo"                    BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ─── Bitácora inmutable (cadena de hashes) ───────────────────────────────────
CREATE TABLE "logs_acceso_inmutable" (
    "id"            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "usuario_id"    TEXT        REFERENCES "usuarios"("id") ON DELETE SET NULL,
    "evento"        VARCHAR(80) NOT NULL,
    "detalle"       TEXT,
    "ip_address"    VARCHAR(45),
    "user_agent"    TEXT,
    "timestamp"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "hash_anterior" VARCHAR(64) NOT NULL,       -- SHA-256 del log previo o 'GENESIS'
    "firma_digital" VARCHAR(64) NOT NULL        -- HMAC-SHA256 de esta entrada
);
CREATE INDEX "logs_usuario_idx"   ON "logs_acceso_inmutable" ("usuario_id");
CREATE INDEX "logs_timestamp_idx" ON "logs_acceso_inmutable" ("timestamp");

-- INMUTABILIDAD: descartar silenciosamente cualquier UPDATE o DELETE.
-- Sólo se permite INSERT. Esto cumple "NO se permiten UPDATE ni DELETE".
CREATE RULE "logs_no_update" AS ON UPDATE TO "logs_acceso_inmutable" DO INSTEAD NOTHING;
CREATE RULE "logs_no_delete" AS ON DELETE TO "logs_acceso_inmutable" DO INSTEAD NOTHING;

-- ─── Biometría (estructura — lógica diferida) ────────────────────────────────
CREATE TABLE "biometria" (
    "id"             TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "usuario_id"     TEXT         NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "tipo_biometria" VARCHAR(40)  NOT NULL,
    "hash_template"  VARCHAR(128) NOT NULL,      -- SHA-512 hex
    "sal_template"   VARCHAR(64)  NOT NULL,
    "fecha_registro" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "biometria_usuario_idx" ON "biometria" ("usuario_id");

-- ─── Eventos MFA (estructura — lógica diferida) ──────────────────────────────
CREATE TABLE "eventos_mfa" (
    "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "usuario_id"  TEXT        NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "tipo_factor" VARCHAR(40) NOT NULL,
    "resultado"   VARCHAR(20) NOT NULL,
    "timestamp"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "detalles"    TEXT
);
CREATE INDEX "eventos_mfa_usuario_idx" ON "eventos_mfa" ("usuario_id");

-- ─── Trigger: auto-update de fecha_actualizacion ─────────────────────────────
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW."fecha_actualizacion" = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER "usuarios_updated_at"
    BEFORE UPDATE ON "usuarios"
    FOR EACH ROW EXECUTE FUNCTION update_fecha_actualizacion();

CREATE TRIGGER "archivos_updated_at"
    BEFORE UPDATE ON "archivos"
    FOR EACH ROW EXECUTE FUNCTION update_fecha_actualizacion();
