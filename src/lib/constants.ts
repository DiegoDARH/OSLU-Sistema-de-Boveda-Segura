// Constantes compartidas entre Edge Runtime (middleware) y Node.js runtime.
// Este archivo NO debe importar nada con dependencias de Node.js.

export const TOKEN_COOKIE = 'boveda_token'

// Cookie temporal entre el paso de contraseña y el paso facial (MFA).
// Vive pocos minutos y NO concede acceso al sistema por sí sola.
export const PREAUTH_COOKIE = 'boveda_preauth'
