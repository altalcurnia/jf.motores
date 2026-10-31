# Correos de acceso (Supabase Auth)

Se pegan en Supabase → Authentication → Emails → Templates. El idioma sale de
`locale`, que el sitio guarda al registrar al cliente (es por defecto).

| Plantilla en Supabase | Archivo | Asunto |
|---|---|---|
| Confirm sign up | `confirmar-cuenta.html` | `Confirma tu cuenta de JF Motores` |
| Magic link | `enlace-de-acceso.html` | `Tu enlace para entrar a JF Motores` |
| Reset password | `recuperar-contrasena.html` | `Crea una nueva contraseña · JF Motores` |

## Enlace de los botones

Los botones usan `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…&redirect_to={{ .RedirectTo }}`
(no `{{ .ConfirmationURL }}`), para que funcionen aunque el correo se abra en otro
navegador o en el celular. Requiere que **Site URL** en Supabase sea el dominio del sitio.
