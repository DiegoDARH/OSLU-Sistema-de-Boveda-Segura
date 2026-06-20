# Guía de Contribución — Sistema de Bóveda Segura

Este documento define el flujo de trabajo (GitFlow), el estándar de ramas y el
formato de commits. **Es de cumplimiento obligatorio**: el robot de CI y la regla
de protección de `main` lo hacen verificable.

## 1. Modelo de ramas (GitFlow adaptado)

| Rama | Propósito | Se fusiona en |
|---|---|---|
| `main` | Código de producción. **Protegida.** | — |
| `develop` | Integración de funcionalidades terminadas. | `main` (vía release) |
| `feature/*` | Una funcionalidad o tarea nueva. | `develop` |
| `fix/*` | Corrección de un bug. | `develop` |
| `hotfix/*` | Corrección urgente sobre producción. | `main` y `develop` |
| `docs/*` | Cambios sólo de documentación. | `develop` |

### Nombramiento de ramas

```
<tipo>/<id-tarea>-<descripcion-corta-en-kebab-case>
```

Ejemplos:

```
feature/12-cifrado-aes-archivos
fix/27-validacion-need-to-know
hotfix/31-fuga-ruta-cifrada
docs/05-diagramas-mermaid
```

El `id-tarea` referencia el identificador del plan de desarrollo.

## 2. Rama `main` protegida

`main` no acepta `push` directo. Para integrar cambios:

1. Abrir un **Pull Request** hacia `develop` (o `main` para hotfix).
2. El **pipeline de CI** debe quedar en verde (lint + test + build).
3. Al menos **un compañero** debe revisar y aprobar (Peer Review).
4. Recién entonces se permite el **merge**.

## 3. Conventional Commits

Todos los commits siguen el estándar
[Conventional Commits](https://www.conventionalcommits.org/) e **incluyen la
referencia a la tarea** del plan.

```
<tipo>(<alcance opcional>): <descripción> (Tarea #<id>)
```

Tipos permitidos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `style`.

Ejemplos:

```
feat(boveda): implementar cifrado local AES-256-GCM de archivos (Tarea #12)
fix(auth): corregir propagación del nivel de clasificación en el JWT (Tarea #27)
test(crypto): añadir pruebas de roundtrip y detección de manipulación (Tarea #18)
ci: agregar pipeline de lint, test y build (Tarea #03)
```

## 4. Definition of Done (DoD)

Una tarea se considera terminada **sólo si**:

1. Pasa el linter sin errores (`npm run lint`).
2. Pasa las pruebas unitarias en GitHub Actions (pipeline en verde).
3. Fue revisada y aprobada por otro compañero en un Pull Request.
4. Está documentada con comentarios internos (JSDoc en funciones clave).
5. Funciona en un entorno limpio usando sólo `.env` (a partir de `.env.example`).

## 5. Puesta en marcha local

```bash
npm install
cp .env.example .env.local        # completar DATABASE_URL, JWT_SECRET, MASTER_KEY, HMAC_SECRET
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Verificación rápida antes de abrir un PR:

```bash
npm run lint && npm test && npm run build
```
