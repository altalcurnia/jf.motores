export type StageKey = "a" | "b" | "c" | "x" | "d" | "e";
export const STAGES: { key: StageKey; from: number; to: number }[];
export const STOP_AT: number;
export const STOP_END: number;
export function stageAt(p: number): { key: StageKey; from: number; to: number };
