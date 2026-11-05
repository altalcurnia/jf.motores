<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reglas del proyecto JF Motores

- Lee `docs/01_REQUISITOS.md` y `docs/02_ARQUITECTURA.md` antes de cambiar funcionalidad.
- Todo texto visible va en `src/i18n/dictionaries/{es,en,pt}.json` (mismas claves en los tres; hay una prueba que lo verifica).
- Toda tabla nueva en Supabase lleva RLS y se crea con una migración en `supabase/migrations/`.
- La clave secreta de Supabase solo se usa en `src/lib/supabase/server.ts` (servidor).
- No publicar servicios o datos que la empresa no tenga (p. ej. "soporte 24/7").
- Antes de cerrar un cambio: `npm run lint && npm run typecheck && npm test && npm run build`.
