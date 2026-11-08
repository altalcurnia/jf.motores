# Sube a Supabase Auth las plantillas de correo de JF Motores (carpeta supabase/templates)
# y activa el aviso de «tu contraseña cambió».
#
# Las plantillas no viven en la base de datos (no se pueden cambiar con SQL): se guardan en la
# configuración de Supabase Auth. Este script usa la API de administración de Supabase.
#
# Uso (PowerShell, desde la carpeta del proyecto):
#   cd C:\dev\jf-motores
#   git pull
#   powershell -ExecutionPolicy Bypass -File .\scripts\supabase-plantillas.ps1
#
# Te pedirá un token personal de Supabase: créalo en https://supabase.com/dashboard/account/tokens
# (no se guarda en ningún lado; bórralo cuando termines si quieres).

$ErrorActionPreference = "Stop"
$ProjectRef = "lsrjrwpxxqlgobablyyc"
$Dir = Join-Path $PSScriptRoot "..\supabase\templates"

function Leer($archivo) {
  $ruta = Join-Path $Dir $archivo
  if (-not (Test-Path $ruta)) { throw "No encuentro $ruta. ¿Hiciste git pull?" }
  return [System.IO.File]::ReadAllText((Resolve-Path $ruta), [System.Text.Encoding]::UTF8)
}

$secure = Read-Host "Pega tu token personal de Supabase (sbp_...)" -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if (-not $token.StartsWith("sbp_")) { throw "El token debe empezar con sbp_" }

$body = [ordered]@{
  mailer_subjects_confirmation                          = "Confirma tu cuenta de JF Motores"
  mailer_templates_confirmation_content                 = Leer "confirmar-cuenta.html"
  mailer_subjects_magic_link                            = "Tu enlace para entrar a JF Motores"
  mailer_templates_magic_link_content                   = Leer "enlace-de-acceso.html"
  mailer_subjects_recovery                              = "Crea una nueva contraseña · JF Motores"
  mailer_templates_recovery_content                     = Leer "recuperar-contrasena.html"
  mailer_notifications_password_changed_enabled         = $true
  mailer_subjects_password_changed_notification         = "Tu contraseña de JF Motores cambió"
  mailer_templates_password_changed_notification_content = Leer "contrasena-cambiada.html"
}
$json = $body | ConvertTo-Json -Depth 3
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "Subiendo plantillas a Supabase..."
$res = Invoke-RestMethod -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes

Write-Host ""
Write-Host "Listo. Asuntos guardados:"
Write-Host "  Confirmar cuenta:     $($res.mailer_subjects_confirmation)"
Write-Host "  Enlace de acceso:     $($res.mailer_subjects_magic_link)"
Write-Host "  Recuperar contraseña: $($res.mailer_subjects_recovery)"
Write-Host "  Contraseña cambiada:  $($res.mailer_subjects_password_changed_notification) (activo: $($res.mailer_notifications_password_changed_enabled))"
