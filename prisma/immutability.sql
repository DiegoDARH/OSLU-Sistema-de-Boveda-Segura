-- ============================================================================
-- INMUTABILIDAD DE LA BITÁCORA — logs_acceso_inmutable
-- ============================================================================
-- Prisma no puede expresar reglas (RULE) en su schema, así que se aplican aquí.
-- Idempotente: puede ejecutarse tantas veces como se quiera sin error.
--
-- Aplicar después de cada `prisma migrate dev` / `prisma migrate deploy`:
--     npm run db:harden
-- o directamente:
--     npx prisma db execute --file prisma/immutability.sql --schema prisma/schema.prisma
--
-- Efecto: la tabla sólo admite INSERT. Todo UPDATE o DELETE se descarta en
-- silencio (DO INSTEAD NOTHING), cumpliendo "NO se permiten UPDATE ni DELETE".
-- ============================================================================

DROP RULE IF EXISTS "logs_no_update" ON "logs_acceso_inmutable";
DROP RULE IF EXISTS "logs_no_delete" ON "logs_acceso_inmutable";

CREATE RULE "logs_no_update" AS
    ON UPDATE TO "logs_acceso_inmutable"
    DO INSTEAD NOTHING;

CREATE RULE "logs_no_delete" AS
    ON DELETE TO "logs_acceso_inmutable"
    DO INSTEAD NOTHING;
