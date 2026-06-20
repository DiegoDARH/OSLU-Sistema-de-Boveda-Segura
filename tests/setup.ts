/**
 * Variables de entorno deterministas para las pruebas.
 * Claves fijas de 32 bytes (64 hex) para que el cifrado y la firma sean
 * reproducibles. NO usar estos valores en producción.
 */
process.env.MASTER_KEY ??= 'a'.repeat(64)
process.env.HMAC_SECRET ??= 'b'.repeat(64)
process.env.JWT_SECRET ??= 'test-jwt-secret-de-pruebas-suficientemente-largo'
