# 🔐 OSLU — Sistema de Bóveda Segura

**OSLU** es una bóveda documental para información sensible: cada archivo se
cifra individualmente, cada acceso pasa por tres barreras de seguridad
(usuario activo, clasificación y necesidad de saber) y cada acción —subida,
descarga, login, borrado— queda registrada en una bitácora que no se puede
alterar ni borrar, ni siquiera por un administrador con acceso directo a la
base de datos.

Construido con **Next.js 15** (App Router) y **PostgreSQL** vía **Prisma**.
El login es de dos pasos: contraseña y, obligatoriamente, **reconocimiento
facial** como segundo factor. El cifrado es **AES‑256‑GCM** con clave por
archivo envuelta en una clave maestra del servidor (envelope encryption), y el
control de acceso sigue el modelo **Bell‑LaPadula** ("no leer hacia arriba")
combinado con autorizaciones explícitas por proyecto.

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

## 📸 Capturas del sistema

**Login** — autenticación en dos pasos (contraseña + MFA facial)
![Login](public/screenshots/login.png)

**Dashboard** — vista general, estado de la bóveda y accesos rápidos
![Dashboard](public/screenshots/dashboard.png)

**Bóveda** — proyectos (compartimentos) y archivos cifrados
![Bóveda](public/screenshots/boveda.png)

**Gestión de usuarios** — roles y niveles de acreditación
![Usuarios](public/screenshots/usuarios.png)

**Auditoría** — bitácora inmutable con verificación de integridad de la cadena
![Auditoría](public/screenshots/auditoria.png)

**Información** — propósito del sistema y características de seguridad
![Información](public/screenshots/informacion.png)

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

Detalles de arquitectura interna y convenciones de contribución en
[`CONTRIBUTING.md`](CONTRIBUTING.md).
