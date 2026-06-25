# Checklist de seguridad · Supabase

Estos ajustes **no son código**: se activan con toggles en tu panel de Supabase
(o ejecutando un SQL). Cierran el frente de seguridad 🟡 (auth y slug).
Tiempo estimado: ~5 minutos.

---

## 1. Protección de contraseñas filtradas
Impide registrar/usar contraseñas que aparecen en filtraciones conocidas
(HaveIBeenPwned).

- **Dashboard → Authentication → Policies** (o **Auth → Settings → Password**).
- Activa **"Leaked password protection"** / "Check against HaveIBeenPwned".

## 2. Longitud mínima de contraseña
- **Auth → Settings → Password** → **Minimum password length: 8** (o más).
- El frontend ya pide mínimo 8; esto lo hace cumplir también en el servidor.

## 3. Confirmación de email
Evita registros con emails que no son del usuario.

- **Authentication → Providers → Email**.
- Activa **"Confirm email"** (los nuevos negocios deben confirmar su correo
  antes de poder entrar).
- Revisa que la plantilla de email de confirmación esté configurada.

## 4. Sesiones / JWT
- **Auth → Settings → Sessions / Tokens**.
- **JWT expiry**: 3600 s (1 h) es razonable.
- Activa **"Refresh token rotation"** y **"Reuse detection"** si están disponibles.
- Opcional: define un **tiempo de inactividad** de sesión.

## 5. Saneado del slug (SQL)
Ejecuta una vez en **SQL Editor** el archivo:

```
supabase/migrations/0002_slug_hardening.sql
```

Añade un trigger que normaliza el slug del negocio en la base de datos (solo
minúsculas, números y guiones; lo regenera si llega vacío o inválido) y un
índice único para que no haya dos negocios con el mismo slug. Es additivo: no
toca tu trigger de alta actual.

---

## Cómo verificar
- **Contraseñas**: intenta registrarte con `123456` o `password` → debe rechazarlo.
- **Email**: registra una cuenta nueva → no debería poder entrar hasta confirmar.
- **Slug**: tras ejecutar el SQL, los slugs nuevos siempre saldrán limpios.
