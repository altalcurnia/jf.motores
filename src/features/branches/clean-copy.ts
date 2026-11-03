/**
 * Limpia el texto de descripción de una sede para evitar que repita datos que ya tienen
 * sus propios bloques destacados (dirección física, teléfono o días/horas de atención).
 */
export function cleanBranchCopy(text: string): string {
  if (!text) return "";

  // Protegemos abreviaturas comunes de nomenclatura para que no rompan la división en oraciones
  const protectedText = text
    .replace(/\b(Cra|Cll|Cl|Av|Diag|Transv|No|Num)\.\s+/gi, "$1_ABBR_ ")
    .replace(/\b(a\.m|p\.m)\.\s+/gi, "$1_ABBR_ ");

  const sentences = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/_ABBR_\s+/g, ". ").trim())
    .filter(Boolean);

  const filtered = sentences.filter((s) => {
    // Si la oración menciona horarios o días de atención
    if (/(?:atenci[oó]n|horario|abierto|hours|open|atendimento)\b.*\d{1,2}(?::\d{2})?/i.test(s)) {
      return false;
    }
    if (/\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b.*\d{1,2}(?::\d{2})?/i.test(s)) {
      return false;
    }
    // Si la oración menciona teléfonos o whatsapp
    if (/(?:tel[eé]fono|celular|whatsapp|ll[aá]manos|phone|contato|wa\.me)\b.*\d{7,}/i.test(s)) {
      return false;
    }
    // Si la oración menciona ubicación física o dirección
    if (/(?:ubicados?\s+en|vis[ií]tanos\s+en|direcci[oó]n:?|located\s+at|localizados?\s+em)\b/i.test(s)) {
      return false;
    }
    if (/\b(?:cra|carrera|cll|calle|av|avenida|cl\.)\s*\.?\s*\d+/i.test(s)) {
      return false;
    }
    return true;
  });

  return filtered.join(" ").trim();
}
