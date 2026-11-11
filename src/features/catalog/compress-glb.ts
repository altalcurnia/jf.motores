/**
 * Comprime un modelo .glb en el navegador antes de subirlo (no necesita servidor):
 * - Texturas: se reducen a 2048 px como máximo (o 1024 si hace falta) y pasan a WebP.
 * - Geometría: une vértices repetidos y la comprime con meshopt (EXT_meshopt_compression),
 *   que el visor (model-viewer) descomprime solo. Si aún pesa mucho, simplifica la malla.
 * Un modelo de 30–80 MB con texturas suele quedar entre 2 y 8 MB sin pérdida visible.
 */
import { WebIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  meshopt,
  prune,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";

export type CompressResult = {
  glb: Uint8Array;
  before: number;
  after: number;
  textures: number;
  steps: string[];
};

/** Intentos de menor a mayor compresión; se queda con el primero que cabe en el límite. */
const PLANS = [
  { texture: 2048, simplify: 0 },
  { texture: 1024, simplify: 0 },
  { texture: 1024, simplify: 0.5 },
  { texture: 512, simplify: 0.25 },
];

async function io() {
  await Promise.all([
    MeshoptDecoder.ready,
    MeshoptEncoder.ready,
    MeshoptSimplifier.ready,
  ]);
  return new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
}

async function optimize(doc: Document, plan: (typeof PLANS)[number]) {
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    ...(plan.simplify
      ? [
          simplify({
            simplifier: MeshoptSimplifier,
            ratio: plan.simplify,
            error: 0.001,
          }),
        ]
      : []),
    textureCompress({
      targetFormat: "webp",
      resize: [plan.texture, plan.texture],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
}

export async function compressGlb(
  input: ArrayBuffer,
  opts: { maxBytes: number; onStep?: (text: string) => void },
): Promise<CompressResult> {
  const reader = await io();
  const bytes = new Uint8Array(input);
  const steps: string[] = [];
  let best: Uint8Array | null = null;
  let textures = 0;
  for (const plan of PLANS) {
    opts.onStep?.(
      `Comprimiendo: texturas a ${plan.texture} px${plan.simplify ? `, malla al ${Math.round(plan.simplify * 100)} %` : ""}…`,
    );
    // Se parte siempre del original para no acumular pérdidas entre intentos
    const doc = await reader.readBinary(bytes);
    textures = doc.getRoot().listTextures().length;
    await optimize(doc, plan);
    const out = await reader.writeBinary(doc);
    steps.push(
      `${plan.texture} px${plan.simplify ? ` · malla ${Math.round(plan.simplify * 100)} %` : ""}: ${(out.byteLength / 1048576).toFixed(1)} MB`,
    );
    if (!best || out.byteLength < best.byteLength) best = out;
    if (out.byteLength <= opts.maxBytes) break;
  }
  return {
    glb: best!,
    before: bytes.byteLength,
    after: best!.byteLength,
    textures,
    steps,
  };
}
