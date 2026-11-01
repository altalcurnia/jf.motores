"use client";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CatalogType } from "@/features/catalog/shared";
import { registerSale } from "./actions";

type ProductOption = { id: string; label: string; catalog: CatalogType; price: number | null };
type Customer = { id: string; full_name: string | null; email: string; phone: string | null; country: string | null; purchases: number };

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Registrar una venta: producto, serie y la cuenta del cliente (obligatoria). */
export function SaleForm({ products, initialProductId, registerUrl }: { products: ProductOption[]; initialProductId: string | null; registerUrl: string }) {
  const router = useRouter();
  const initial = products.find((p) => p.id === initialProductId) ?? null;
  const [productId, setProductId] = useState(initial?.id ?? "");
  const [serial, setSerial] = useState("");
  const [email, setEmail] = useState("");
  const [customer, setCustomer] = useState<Customer | null | "none">(null);
  const [price, setPrice] = useState<number | null>(initial?.price ?? null);
  const [channel, setChannel] = useState("presencial");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [markSold, setMarkSold] = useState(initial ? initial.catalog !== "repuesto" : true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const product = products.find((p) => p.id === productId);
  const needsSerial = product && product.catalog !== "repuesto";

  useEffect(() => {
    if (customer !== "none" || qr) return;
    QRCode.toDataURL(registerUrl, { margin: 1, width: 220, color: { dark: "#0b0d10", light: "#ffffff" } }).then(setQr);
  }, [customer, qr, registerUrl]);

  function chooseProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setPrice(p?.price ?? null);
    setMarkSold(p ? p.catalog !== "repuesto" : true);
  }

  async function findCustomer() {
    if (!email.includes("@")) return setMsg({ ok: false, text: "Escribe el correo completo del cliente." });
    setBusy("find");
    setMsg(null);
    const { data, error } = await createSupabaseBrowserClient().rpc("find_customer", { customer_email: email });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: error.message });
    setCustomer(data?.[0] ?? "none");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return setMsg({ ok: false, text: "Elige el producto vendido." });
    if (!customer || customer === "none") return setMsg({ ok: false, text: "Busca primero la cuenta del cliente." });
    setBusy("save");
    setMsg(null);
    const res = await registerSale({
      product: product.id,
      customerEmail: customer.email,
      serial: serial || null,
      priceCop: price,
      channel,
      soldOn: date,
      notes: notes || null,
      markSold,
    });
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    const who = customer.full_name || customer.email;
    const mailText =
      res.email === "sent"
        ? ` Le enviamos un correo a ${customer.email}.`
        : res.email === "not_configured"
          ? " No se envió el correo: falta configurar el envío de correos (RESEND_API_KEY en Vercel)."
          : ` No se pudo enviar el correo (${res.emailDetail ?? "error"}); puedes reenviarlo desde el historial.`;
    setMsg({ ok: true, text: `Venta registrada: ${product.label} quedó a nombre de ${who}.${mailText}` });
    setSerial("");
    setNotes("");
    setEmail("");
    setCustomer(null);
    router.refresh();
  }

  return (
    <form className="panel sale-form" onSubmit={submit}>
      <h2>Registrar venta</h2>
      <div className="sale-grid">
        <label className="span2">
          Producto vendido
          <select required value={productId} onChange={(e) => chooseProduct(e.target.value)}>
            <option value="">Elige el producto…</option>
            {(["motobomba", "motor", "repuesto"] as const).map((c) => (
              <optgroup key={c} label={c === "motobomba" ? "Motobombas" : c === "motor" ? "Motores" : "Repuestos"}>
                {products
                  .filter((p) => p.catalog === c)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          <span>
            Número de serie {needsSerial ? <span className="req">obligatorio</span> : <span className="hint">(opcional)</span>}
          </span>
          <input value={serial} required={!!needsSerial} maxLength={60} onChange={(e) => setSerial(e.target.value.toUpperCase())} placeholder="Ej. JF-M25-0042" />
        </label>

        <label className="span2">
          Correo del cliente
          <div className="find-row">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setCustomer(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), findCustomer())}
              placeholder="correo@cliente.com"
            />
            <button type="button" className="btn-ghost" onClick={findCustomer} disabled={busy === "find"}>
              {busy === "find" ? "Buscando…" : "Buscar cuenta"}
            </button>
          </div>
        </label>
        <div className="customer-box">
          {customer && customer !== "none" && (
            <div className="customer ok">
              <b>✓ {customer.full_name || "Sin nombre"}</b>
              <span>{customer.email}</span>
              <span className="muted small">
                {[customer.phone, customer.country].filter(Boolean).join(" · ") || "Sin teléfono"} · {customer.purchases} compra(s) antes
              </span>
            </div>
          )}
          {!customer && <span className="muted small">Busca la cuenta del cliente por su correo.</span>}
        </div>

        {customer === "none" && (
          <div className="no-account span3">
            <div>
              <b>Ese correo no tiene cuenta.</b>
              <p className="muted">
                Para registrar la venta, el cliente debe crear su cuenta en la página (con Google tarda menos de un minuto). Que escanee este código
                con su celular o envíale el enlace, y luego vuelve a buscar su correo.
              </p>
              <p>
                <a href={registerUrl} target="_blank" rel="noopener">
                  {registerUrl}
                </a>{" "}
                <button type="button" className="link" onClick={() => navigator.clipboard?.writeText(registerUrl)}>
                  Copiar
                </button>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el navegador */}
            {qr && <img src={qr} alt="Código QR para crear la cuenta" width={160} height={160} />}
          </div>
        )}

        <label>
          Precio de venta (COP)
          <input
            inputMode="numeric"
            value={price == null ? "" : price.toLocaleString("es-CO")}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              setPrice(d ? Number(d) : null);
            }}
            placeholder="Opcional"
          />
        </label>
        <label>
          Canal
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="presencial">En persona</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="web">Página web</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label>
          Fecha
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="span3">
          <span>
            Notas <span className="hint">(opcional: garantía, forma de pago, entrega…)</span>
          </span>
          <input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="check span3">
          <input type="checkbox" checked={markSold} onChange={(e) => setMarkSold(e.target.checked)} />
          <span>
            Marcar el producto como <b>Vendido</b> en el catálogo <span className="hint">(desmárcalo si tienes más unidades iguales)</span>
          </span>
        </label>
      </div>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <div className="sale-actions">
        <button className="btn-primary" disabled={busy === "save" || !customer || customer === "none"}>
          {busy === "save" ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </form>
  );
}
