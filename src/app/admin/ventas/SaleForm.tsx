"use client";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { CatalogType } from "@/features/catalog/shared";
import { registerSale } from "./actions";
import { CustomerPicker, type Customer } from "./CustomerPicker";

type ProductOption = { id: string; label: string; catalog: CatalogType; price: number | null; warranty: number | null };

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Registrar una venta: producto, serie y la cuenta del cliente (obligatoria). */
export function SaleForm({ products, initialProductId, registerUrl }: { products: ProductOption[]; initialProductId: string | null; registerUrl: string }) {
  const router = useRouter();
  const initial = products.find((p) => p.id === initialProductId) ?? null;
  const [productId, setProductId] = useState(initial?.id ?? "");
  const [serial, setSerial] = useState("");
  const [typed, setTyped] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [warranty, setWarranty] = useState<number | null>(initial?.warranty ?? null);
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

  // Escribió un correo completo que no corresponde a ninguna cuenta
  const noAccount = !customer && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(typed.trim());

  useEffect(() => {
    if (!noAccount || qr) return;
    QRCode.toDataURL(registerUrl, { margin: 1, width: 220, color: { dark: "#0b0d10", light: "#ffffff" } }).then(setQr);
  }, [noAccount, qr, registerUrl]);

  function chooseProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setPrice(p?.price ?? null);
    setWarranty(p?.warranty ?? null);
    setMarkSold(p ? p.catalog !== "repuesto" : true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return setMsg({ ok: false, text: "Elige el producto vendido." });
    if (!customer) return setMsg({ ok: false, text: "Elige la cuenta del cliente en la lista." });
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
      warrantyMonths: warranty,
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
    setTyped("");
    setCustomer(null);
    setPickerKey((k) => k + 1);
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

        <div className="span2 field">
          <span className="field-label">Cliente (correo de su cuenta)</span>
          <CustomerPicker
            key={pickerKey}
            value={customer}
            onChange={(c, text) => {
              setCustomer(c);
              setTyped(text);
            }}
          />
        </div>
        <div className="customer-box">
          {customer ? (
            <div className="customer ok">
              <b>✓ Cuenta verificada</b>
              <span>{customer.full_name || "Sin nombre"}</span>
              <span className="muted small">
                {customer.phone || "Sin teléfono"} · {customer.purchases} compra(s) antes
              </span>
            </div>
          ) : (
            <span className="muted small">Elige el correo del cliente en la lista.</span>
          )}
        </div>

        {noAccount && (
          <div className="no-account span3">
            <div>
              <b>Ese correo no tiene cuenta.</b>
              <p className="muted">
                Para registrar la venta, el cliente debe crear su cuenta en la página (con Google tarda menos de un minuto). Que escanee este código
                con su celular o envíale el enlace; cuando la cree, vuelve a tocar el campo y aparecerá en la lista.
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
        <label>
          <span>
            Garantía <span className="hint">(meses; vacío = sin garantía)</span>
          </span>
          <input
            inputMode="numeric"
            value={warranty ?? ""}
            placeholder="Sin garantía"
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 3);
              setWarranty(d ? Math.min(Number(d), 120) : null);
            }}
          />
        </label>
        <label className="span2">
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
        <button className="btn-primary" disabled={busy === "save" || !customer}>
          {busy === "save" ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </form>
  );
}
