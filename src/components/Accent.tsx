/**
 * Texto con énfasis por marcas simples:
 *   *texto*  → acento positivo (amarillo de la marca)
 *   !texto!  → alerta: el problema que resolvemos (rojo solo en la versión de marca con rojo)
 * Sin marcas devuelve el texto tal cual (la versión clásica no usa marcas).
 */
export function Accent({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*|![^!]+!)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <em key={i} className="acc">
            {p.slice(1, -1)}
          </em>
        ) : p.startsWith("!") && p.endsWith("!") && p.length > 2 ? (
          <em key={i} className="alert">
            {p.slice(1, -1)}
          </em>
        ) : (
          p
        ),
      )}
    </>
  );
}
