# JF Motores — sitio web

Sitio de ventas de motobombas, motores y repuestos para minería.
Next.js 16 · TypeScript · Supabase · Vercel · Español / English / Português.

Documentación del proyecto en [`docs/`](docs/): requisitos, arquitectura y plan.

## Requisitos

- Node.js 20.9 o superior (recomendado 22)
- Trabaja **fuera de OneDrive** (p. ej. `C:\dev\jf-motores`)

## Primer uso

```bash
git clone https://github.com/altalcurnia/jf.motores.git C:\dev\jf-motores
cd C:\dev\jf-motores
npm install
copy .env.example .env.local   # en Mac/Linux: cp .env.example .env.local
npm run dev                    # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run lint` / `npm run typecheck` | Revisión de código y tipos |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Pruebas en navegador (Playwright; la primera vez: `npx playwright install chromium`) |

## Flujo de trabajo

1. Crea una rama, haz tus cambios y abre un Pull Request.
2. GitHub Actions corre las pruebas y Vercel publica una vista previa.
3. Si todo está bien, se fusiona a `main` → producción.

## Estructura

```text
src/app/[lang]/        páginas públicas por idioma (es, en, pt)
src/i18n/              idiomas y textos (dictionaries/*.json)
src/features/          lógica por módulo (whatsapp, catálogo, precios, 3D…)
src/lib/supabase/      clientes de base de datos
supabase/migrations/   esquema SQL versionado
legacy/                sitio original de referencia (no se publica)
tests/                 unit/ y e2e/
```
