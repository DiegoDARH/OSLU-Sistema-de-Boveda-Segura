# 🔐 Sistema de Bóveda Segura

Repositorio documental de alta seguridad construido con **Next.js 15** (App Router),
**Prisma** y **PostgreSQL**. Implementa cifrado de archivos en reposo
(AES‑256‑GCM), control de acceso por **rol + clasificación + necesidad de saber**
y una **bitácora de auditoría inmutable** encadenada por firma HMAC.

---

## ✨ Características de seguridad

- **Cifrado en reposo** — cada archivo se cifra con su propia clave AES‑256‑GCM;
  esa clave se guarda *envuelta* (envelope encryption) con la `MASTER_KEY` del
  servidor en la tabla `gestion_claves`.
- **Integridad** — se almacena el SHA‑256 del contenido original y se reverifica
  en cada descarga.
- **Control de acceso multicapa** — clasificación (Bell‑LaPadula "no read up") +
  necesidad de saber por compartimento.
- **Bitácora inmutable** — cadena de firmas HMAC‑SHA256 (estilo libro mayor) y
  reglas SQL que bloquean `UPDATE`/`DELETE`.
- **Separación de runtimes** — verificación JWT en el Edge (Web Crypto API) y
  lógica Node.js en los route handlers.

---

## 🏛️ Arquitectura

```mermaid
flowchart TB
    subgraph Cliente
        UI["Next.js App Router<br/>(React Server + Client Components)"]
    end

    subgraph Edge["Edge Runtime"]
        MW["middleware.ts<br/>Verifica JWT (Web Crypto)<br/>Inyecta x-user-* headers"]
    end

    subgraph Node["Node.js Runtime"]
        API["API Route Handlers<br/>/api/archivos · /api/usuarios · /api/proyectos"]
        AUTH["lib/auth.ts<br/>bcrypt · JWT"]
        CRYPTO["lib/crypto.ts<br/>AES-256-GCM · SHA-256"]
        ACCESS["lib/access.ts<br/>clasificación + need-to-know"]
        AUDIT["lib/audit.ts<br/>bitácora inmutable HMAC"]
    end

    subgraph Datos
        DB[("PostgreSQL<br/>vía Prisma")]
        VAULT["storage/vault/*.enc<br/>(archivos cifrados)"]
    end

    UI -->|"cookie httpOnly"| MW
    MW --> API
    API --> AUTH
    API --> CRYPTO
    API --> ACCESS
    API --> AUDIT
    AUTH --> DB
    ACCESS --> DB
    AUDIT --> DB
    CRYPTO --> VAULT
    API --> DB
```

---

## 🗃️ Modelo de datos

```mermaid
erDiagram
    Rol ||--o{ Usuario : tiene
    ClasificacionSeguridad ||--o{ Usuario : acredita
    ClasificacionSeguridad ||--o{ Archivo : clasifica
    ClasificacionSeguridad ||--o{ Proyecto : "nivel mínimo"
    Usuario ||--o{ Archivo : sube
    Usuario ||--o{ NecesidadSaber : autorizado
    Proyecto ||--o{ NecesidadSaber : alcance
    Proyecto ||--o{ Archivo : contiene
    Archivo ||--|| GestionClave : "clave AES"
    Usuario ||--o{ LogAcceso : genera
    Usuario ||--o{ Biometria : registra
    Usuario ||--o{ EventoMFA : registra

    Usuario {
        string id PK
        string nombre_usuario UK
        string password_hash
        boolean activo
        string rol_id FK
        string nivel_clasificacion_id FK
    }
    Archivo {
        string id PK
        string nombre_archivo
        string ruta_cifrada
        string hash_original "SHA-256"
        string proyecto_id FK
        string nivel_clasificacion_id FK
    }
    GestionClave {
        string id PK
        string archivo_id FK
        string clave_cifrada "envelope AES"
    }
    LogAcceso {
        string id PK
        string evento
        string hash_anterior
        string firma_digital "HMAC-SHA256"
    }
    NecesidadSaber {
        string id PK
        string usuario_id FK
        string proyecto_id FK
        string autorizado_por
    }
```

---

## 🔓 Flujo de acceso a un archivo

```mermaid
sequenceDiagram
    actor U as Usuario
    participant MW as middleware (Edge)
    participant API as /api/archivos/[id]/download
    participant AC as lib/access
    participant CR as lib/crypto
    participant AU as lib/audit

    U->>MW: GET /api/archivos/123/download (cookie JWT)
    MW->>MW: verifica JWT, inyecta x-user-*
    MW->>API: request autenticada
    API->>AC: puedeAccederArchivo(user, archivo)
    AC-->>API: clasificación OK + need-to-know OK
    API->>CR: unwrapKey() + decryptBuffer()
    CR->>CR: verifica authTag GCM
    API->>CR: hashContent == hash_original ?
    CR-->>API: integridad OK
    API->>AU: registrarEvento(DOWNLOAD)
    API-->>U: archivo descifrado (stream)
```

> Si cualquier barrera falla, se responde `403/409` y se registra un evento
> `ACCESS_DENIED` en la bitácora inmutable.

---

## 🚀 Puesta en marcha

```bash
npm install
cp .env.example .env.local          # completar credenciales reales
npm run db:setup                    # generate + migrate + harden (reglas inmutables) + seed
npm run dev
```

> `db:setup` encadena todo. Equivale a: `prisma generate` →
> `prisma migrate dev` → `npm run db:harden` (aplica `prisma/immutability.sql`)
> → `npm run db:seed`.

Generar las claves de cifrado y firma:

```bash
node -e "console.log('MASTER_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('HMAC_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Credenciales tras el seed

| Usuario | Contraseña | Rol | Acreditación |
|---|---|---|---|
| `admin` | `Admin1234!` | Administrador | TOP_SECRET |
| `gestor` | `Gestor1234!` | Gestor | CONFIDENCIAL |
| `analista` | `Analista1234!` | Analista | NORMAL |

---

## 🧪 Comandos

```bash
npm run dev        # servidor de desarrollo (Turbopack)
npm run build      # build de producción
npm run lint       # ESLint
npm test           # pruebas unitarias (Vitest)
npm run test:watch # pruebas en modo watch

npx prisma studio  # explorador visual de la BD
npx prisma migrate dev --name <nombre>   # nueva migración
```

> ⚠️ Tras cada `prisma migrate`, ejecutar `npm run db:harden` para reaplicar las
> reglas de inmutabilidad de la bitácora (`prisma/immutability.sql`, idempotente),
> ya que Prisma no genera reglas `RULE` automáticamente.

---

## 📦 Stack

- **Next.js 15** · App Router · React 19
- **Prisma 5** + **PostgreSQL**
- **bcryptjs** (hash de contraseñas) · **jsonwebtoken** (sesión)
- **Node.js crypto** (AES‑256‑GCM, SHA‑256, HMAC)
- **Tailwind CSS** · **Vitest**

Detalles de arquitectura interna y convenciones en
[`CLAUDE.md`](CLAUDE.md) y [`CONTRIBUTING.md`](CONTRIBUTING.md).
