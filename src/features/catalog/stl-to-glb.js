// Convierte un archivo STL (CAD / impresión 3D) a GLB, que es el formato que muestra el visor.
// Se hace en el navegador al subirlo desde el panel; no requiere servidor.
import { Mesh, MeshStandardMaterial } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * @param {ArrayBuffer} buffer contenido del .stl (binario o ASCII)
 * @returns {Promise<{ glb: ArrayBuffer, triangles: number }>}
 */
export async function stlToGlb(buffer) {
  let geometry = new STLLoader().parse(buffer);
  const triangles = geometry.attributes.position.count / 3;
  if (!triangles) throw new Error("El STL está vacío");
  const hasColors = !!geometry.hasColors;

  // Une vértices repetidos (el STL los repite por triángulo): el archivo pesa mucho menos.
  // Sin normales, el visor sombrea cada cara plana, que es lo correcto para piezas mecánicas.
  if (!hasColors) {
    geometry.deleteAttribute("normal");
    geometry = BufferGeometryUtils.mergeVertices(geometry);
  }
  // Los programas CAD usan Z hacia arriba; el visor usa Y.
  geometry.rotateX(-Math.PI / 2);
  geometry.center();

  const material = new MeshStandardMaterial({
    color: hasColors ? 0xffffff : 0x9aa3ad,
    vertexColors: hasColors,
    metalness: 0.55,
    roughness: 0.45,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "modelo";

  const glb = await new Promise((resolve, reject) => {
    try {
      new GLTFExporter().parse(mesh, resolve, { binary: true });
    } catch (e) {
      reject(e);
    }
  });
  geometry.dispose();
  material.dispose();
  return { glb, triangles };
}
