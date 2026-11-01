import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Linkified } from "@/components/Linkified";

describe("enlaces clicables del chat", () => {
  it("convierte URL sueltas y enlaces markdown en vínculos, sin la puntuación final", () => {
    const html = renderToStaticMarkup(
      <Linkified text="Ve la ficha: https://jfmotores.altalcurnia.com/es/motobombas/jf-m25. O [Soporte](https://jfmotores.altalcurnia.com/es/soporte) y **cotiza**." />,
    );
    expect(html).toContain('href="https://jfmotores.altalcurnia.com/es/motobombas/jf-m25"');
    expect(html).toContain(">jfmotores.altalcurnia.com/es/motobombas/jf-m25</a>.");
    expect(html).toContain('href="https://jfmotores.altalcurnia.com/es/soporte"');
    expect(html).toContain(">Soporte</a>");
    expect(html).toContain("<b>cotiza</b>");
  });
});
