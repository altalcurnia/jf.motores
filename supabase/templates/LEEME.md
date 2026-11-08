# Correos de acceso (Supabase Auth)

Se pegan en Supabase → Authentication → Emails → Templates. El idioma sale de
`locale`, que el sitio guarda al registrar al cliente (es por defecto).

| Plantilla en Supabase | Archivo | Asunto |
|---|---|---|
| Confirm sign up | `confirmar-cuenta.html` | `Confirma tu cuenta de JF Motores` |
| Magic link | `enlace-de-acceso.html` | `Tu enlace para entrar a JF Motores` |
| Reset password | `recuperar-contrasena.html` | `Crea una nueva contraseña · JF Motores` |
| Password changed (notificación de seguridad) | `contrasena-cambiada.html` | `Tu contraseña de JF Motores cambió` |

**Forma rápida:** `powershell -ExecutionPolicy Bypass -File .\scripts\supabase-plantillas.ps1` sube las cuatro
y activa el aviso de contraseña cambiada (pide un token personal de Supabase). Las plantillas no se pueden
cambiar con SQL: viven en la configuración de Supabase Auth, no en la base de datos.

El correo de **bienvenida** (cuenta confirmada) no es de Supabase: lo envía el sitio desde `/auth/confirm`
(`src/features/account/welcome-email.ts`).

## Enlace de los botones

Los botones usan `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…&redirect_to={{ .RedirectTo }}`
(no `{{ .ConfirmationURL }}`), para que funcionen aunque el correo se abra en otro
navegador o en el celular. Requiere que **Site URL** en Supabase sea el dominio del sitio.
