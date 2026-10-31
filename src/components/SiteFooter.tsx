import Image from "next/image";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/lib/site";

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer>
      <div className="fbrand">
        <Image src="/logo.png" alt="" width={34} height={34} />
        JF <em style={{ color: "var(--yellow)" }}>MOTORES</em>
      </div>
      <p>
        © {site.name} — Medellín, Colombia · <em>{dict.footer.slogan}</em>
        <br />
        <small className="price-notice">{dict.footer.priceNotice}</small>
      </p>
    </footer>
  );
}
