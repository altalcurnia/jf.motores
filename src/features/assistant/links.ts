/** Para canales sin formato (Telegram): [texto](url) → "texto: url" y sin **negritas**. */
export function plainLinks(text: string): string {
  return text.replace(/\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2").replace(/\*\*([^*\n]+)\*\*/g, "$1");
}
