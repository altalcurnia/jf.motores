import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseIncoming, verifySignature } from "@/features/whatsapp/cloud";

describe("WhatsApp Cloud API", () => {
  it("acepta solo llamadas firmadas con la clave secreta de la app", () => {
    const body = JSON.stringify({ hello: "world" });
    const sig = `sha256=${createHmac("sha256", "secreto").update(body).digest("hex")}`;
    expect(verifySignature(body, sig, "secreto")).toBe(true);
    expect(verifySignature(body, sig, "otra")).toBe(false);
    expect(verifySignature(`${body} `, sig, "secreto")).toBe(false);
    expect(verifySignature(body, null, "secreto")).toBe(false);
    expect(verifySignature(body, "sha256=abc", "secreto")).toBe(false);
  });

  it("extrae solo los mensajes de texto, con el nombre del contacto", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "111" },
                contacts: [{ wa_id: "573001112233", profile: { name: "Ana" } }],
                messages: [
                  { id: "m1", from: "573001112233", type: "text", text: { body: " ¿Tienen motobomba de 3 pulgadas? " } },
                  { id: "m2", from: "573001112233", type: "image" },
                ],
              },
            },
            { value: { statuses: [{ id: "x", status: "delivered" }] } },
          ],
        },
      ],
    };
    expect(parseIncoming(payload)).toEqual([
      { id: "m1", from: "573001112233", text: "¿Tienen motobomba de 3 pulgadas?", name: "Ana", phoneNumberId: "111" },
    ]);
    expect(parseIncoming(null)).toEqual([]);
  });
});
