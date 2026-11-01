/**
 * Biblioteca técnica gratuita (Guías), dividida por idioma. Solo material de entidades públicas
 * (SENA, Agencia Nacional de Minería, MSHA, Australia Occidental): no se enlazan manuales de marcas.
 * Los documentos de dominio público se sirven desde la página; los del SENA (licencia CC BY-NC-SA o
 * derechos reservados) y el de la ANM se abren en el repositorio oficial de la entidad.
 * Los textos visibles están en los diccionarios: guides.library.items[id].
 */
export type LibraryLang = "es" | "en";
export type LibraryGroup = "motor" | "bombas" | "mantenimiento" | "seguridad";
export type LibraryItem = {
  id: string;
  group: LibraryGroup;
  source: string;
  /** Archivo en content/biblioteca (documento público alojado) */
  file?: string;
  /** Página oficial de la entidad que publica el documento */
  url?: string;
  lang: LibraryLang;
};

const SENA = "https://repositorio.sena.edu.co/handle/11404/";

export const libraryItems: LibraryItem[] = [
  // En español: cursos del SENA, en el orden de estudio recomendado
  {
    id: "sena-motor-diesel",
    group: "motor",
    source: "SENA",
    url: `${SENA}5032`,
    lang: "es",
  },
  {
    id: "sena-bombas-centrifugas",
    group: "bombas",
    source: "SENA",
    url: `${SENA}762`,
    lang: "es",
  },
  {
    id: "sena-alimentacion-combustible",
    group: "motor",
    source: "SENA",
    url: `${SENA}5660`,
    lang: "es",
  },
  {
    id: "sena-mantenimiento-motor",
    group: "mantenimiento",
    source: "SENA",
    url: `${SENA}5661`,
    lang: "es",
  },
  {
    id: "sena-filtros-aceite",
    group: "mantenimiento",
    source: "SENA",
    url: `${SENA}5654`,
    lang: "es",
  },
  {
    id: "sena-talleres-diesel",
    group: "mantenimiento",
    source: "SENA",
    url: `${SENA}3157`,
    lang: "es",
  },
  {
    id: "sena-reparador-diesel",
    group: "motor",
    source: "SENA",
    url: `${SENA}4033`,
    lang: "es",
  },
  {
    id: "anm-metano",
    group: "seguridad",
    source: "Agencia Nacional de Minería",
    url: "https://www.anm.gov.co/sites/default/files/guia_prevencion_mitigacion.pdf",
    lang: "es",
  },
  // En inglés: guías públicas de seguridad minera
  {
    id: "msha-toolbox",
    group: "seguridad",
    source: "MSHA (EE. UU.)",
    file: "msha-diesel-toolbox.pdf",
    lang: "en",
  },
  {
    id: "wa-diesel-subterraneo",
    group: "seguridad",
    source: "Gobierno de Australia Occidental",
    file: "wa-equipo-diesel-subterraneo.pdf",
    lang: "en",
  },
];

/** Orden de los idiomas: primero el del visitante. */
export function libraryLangs(locale: string): LibraryLang[] {
  return locale === "en" ? ["en", "es"] : ["es", "en"];
}

export function findLibraryItem(id: string): LibraryItem | undefined {
  return libraryItems.find((i) => i.id === id);
}

/** Videos recomendados (YouTube se muestra incrustado). Sin videos de marcas. Textos en guides.videos.items[id]. */
export type VideoItem = {
  id: string;
  source: string;
  youtube?: string;
  url?: string;
  lang: LibraryLang;
};
export const videoItems: VideoItem[] = [
  {
    id: "diesel-cuatro-tiempos",
    source: "YouTube",
    youtube: "qQopuo60SuI",
    lang: "es",
  },
  {
    id: "diesel-lubricacion",
    source: "YouTube",
    youtube: "yMbSIdF5MTg",
    lang: "es",
  },
  {
    id: "bomba-centrifuga-motor",
    source: "YouTube",
    youtube: "rZQ2qkpBdtA",
    lang: "es",
  },
  {
    id: "sello-mecanico",
    source: "YouTube",
    youtube: "bBSX1pEuYEQ",
    lang: "es",
  },
  {
    id: "motobomba-preventivo",
    source: "YouTube",
    youtube: "gKeXVxyVEjY",
    lang: "es",
  },
  {
    id: "motobomba-guia-rapida",
    source: "YouTube",
    youtube: "Im9vazmCKC4",
    lang: "es",
  },
  {
    id: "filtro-combustible",
    source: "YouTube",
    youtube: "o6lEnhEIDwY",
    lang: "es",
  },
  {
    id: "filtros-diesel",
    source: "YouTube",
    youtube: "bLGmCatDCtQ",
    lang: "es",
  },
];
