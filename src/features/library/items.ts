/**
 * Biblioteca técnica gratuita (Guías). Los documentos públicos se sirven desde la página;
 * los manuales de marcas abren la página oficial del fabricante (sus derechos son del fabricante).
 * Los textos visibles están en los diccionarios: guides.library.items[id].
 */
export type LibraryGroup = "manuales" | "diagnostico" | "seguridad";
export type LibraryItem = {
  id: string;
  group: LibraryGroup;
  source: string;
  /** Archivo en content/biblioteca (documento público alojado) */
  file?: string;
  /** Página o PDF oficial del fabricante o de la entidad */
  url?: string;
  lang: "es" | "en";
};

export const libraryItems: LibraryItem[] = [
  { id: "mq62tdd-operacion", group: "manuales", source: "Multiquip", url: "https://service.multiquip.com/", lang: "en" },
  { id: "mq62tdd-partes", group: "manuales", source: "Multiquip", url: "https://service.multiquip.com/", lang: "en" },
  {
    id: "bba-ba",
    group: "manuales",
    source: "BBA Pumps",
    url: "https://www.bbapumps.com/content/files/BBA-Pumps/Support/User_manuals/Manual%20de%20Usuario%20BA%20serie%20ES.pdf",
    lang: "es",
  },
  { id: "perkins-400", group: "manuales", source: "Perkins", url: "https://www.perkins.com/en_GB/aftermarket/operation-maintenance-manuals.html", lang: "en" },
  { id: "godwin-cd", group: "manuales", source: "Xylem · Godwin", url: "https://www.xylem.com/en-us/support/resources-reference-materials/", lang: "en" },
  { id: "global-motor", group: "diagnostico", source: "Global Pump", url: "https://www.globalpump.com/support.php", lang: "en" },
  { id: "global-bomba", group: "diagnostico", source: "Global Pump", url: "https://www.globalpump.com/support.php", lang: "en" },
  { id: "global-cebado", group: "diagnostico", source: "Global Pump", url: "https://www.globalpump.com/support.php", lang: "en" },
  { id: "fleetguard-combustible", group: "diagnostico", source: "Fleetguard (Atmus)", url: "https://www.atmus.com/", lang: "en" },
  { id: "fleetguard-filtros", group: "diagnostico", source: "Fleetguard (Atmus)", url: "https://www.atmus.com/", lang: "en" },
  { id: "msha-toolbox", group: "seguridad", source: "MSHA (EE. UU.)", file: "msha-diesel-toolbox.pdf", lang: "en" },
  { id: "wa-diesel-subterraneo", group: "seguridad", source: "Gobierno de Australia Occidental", file: "wa-equipo-diesel-subterraneo.pdf", lang: "en" },
  { id: "anm-metano", group: "seguridad", source: "Agencia Nacional de Minería (Colombia)", url: "https://www.anm.gov.co/sites/default/files/guia_prevencion_mitigacion.pdf", lang: "es" },
];

export const libraryGroups: LibraryGroup[] = ["manuales", "diagnostico", "seguridad"];

export function findLibraryItem(id: string): LibraryItem | undefined {
  return libraryItems.find((i) => i.id === id);
}

/** Videos recomendados (YouTube se muestra incrustado; otros sitios abren aparte). Textos en guides.videos.items[id]. */
export type VideoItem = { id: string; source: string; youtube?: string; url?: string; lang: "es" | "en" };
export const videoItems: VideoItem[] = [
  { id: "mq-sello", source: "Multiquip", youtube: "WkK9M1lbsiA", lang: "en" },
  { id: "mq-instalacion", source: "Multiquip", youtube: "CGNkMTchbh0", lang: "en" },
  { id: "mq-impulsor", source: "Multiquip", youtube: "LR58pCoCQQA", lang: "en" },
  {
    id: "godwin-cebado",
    source: "Xylem · Godwin",
    url: "https://www.xylem.com/en-us/products--services/rental/xylem-rental-solutions-videos/godwin-dri-prime-pumps-troubleshooting-priming-issues/",
    lang: "en",
  },
  { id: "cummins-consejos", source: "Cummins", youtube: "hyv5tsZc1a0", lang: "en" },
  { id: "cummins-regular", source: "Cummins", youtube: "AD0XtQ7xKOY", lang: "en" },
  { id: "filtros-diesel", source: "YouTube", youtube: "bLGmCatDCtQ", lang: "es" },
  { id: "filtro-combustible", source: "YouTube", youtube: "o6lEnhEIDwY", lang: "es" },
];
