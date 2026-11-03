import { describe, expect, it } from "vitest";
import { cleanBranchCopy, cleanProductCopy } from "@/features/branches/clean-copy";

describe("filtro antirredundancia de copia para sedes", () => {
  it("conserva la especialidad técnica, servicios y cobertura sin alteraciones", () => {
    const raw = "Taller principal de ensamble, banco de pruebas hidráulicas y despacho inmediato de motobombas y repuestos para el Bajo Cauca.";
    expect(cleanBranchCopy(raw)).toBe(raw);
  });

  it("elimina frases de horarios redundantes", () => {
    const textWithSchedule = "Punto de ensamble y entrega de repuestos diésel. Horario de atención de lunes a viernes de 7:30 a 17:30.";
    expect(cleanBranchCopy(textWithSchedule)).toBe("Punto de ensamble y entrega de repuestos diésel.");
  });

  it("elimina oraciones con teléfonos redundantes", () => {
    const textWithPhone = "Bodega de repuestos y banco de pruebas. Teléfono: 3123456789. Despacho nacional inmediato.";
    expect(cleanBranchCopy(textWithPhone)).toBe("Bodega de repuestos y banco de pruebas. Despacho nacional inmediato.");
  });

  it("elimina oraciones con direcciones redundantes", () => {
    const textWithAddress = "Ubicados en Cra. 52 # 12-40. Centro de ensamble y pruebas de motobombas.";
    expect(cleanBranchCopy(textWithAddress)).toBe("Centro de ensamble y pruebas de motobombas.");
  });
});

describe("filtro antirredundancia de copia para productos", () => {
  it("conserva la descripción técnica y de aplicación sin alteraciones", () => {
    const raw = "Motobomba diésel de alta presión diseñada para bombeo continuo en minería de aluvión y canteras. Su chasis reforzado garantiza máxima confiabilidad en campo.";
    expect(cleanProductCopy(raw)).toBe(raw);
  });

  it("elimina oraciones que repiten la garantía", () => {
    const textWithWarranty = "Equipo robusto para faenas pesadas. Cuenta con garantía de 12 meses. Fácil mantenimiento en terreno.";
    expect(cleanProductCopy(textWithWarranty)).toBe("Equipo robusto para faenas pesadas. Fácil mantenimiento en terreno.");
  });

  it("elimina oraciones que repiten el precio o costo", () => {
    const textWithPrice = "Motor diésel 4 cilindros para trabajo pesado. Tiene un precio de $28.000.000 COP con entrega inmediata. Excelente rendimiento de combustible.";
    expect(cleanProductCopy(textWithPrice)).toBe("Motor diésel 4 cilindros para trabajo pesado. Excelente rendimiento de combustible.");
  });
});
