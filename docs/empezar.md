# Empezar

## 1. Entorno (una sola vez)

Se trabaja en **WSL2 con Ubuntu 24.04**: el sandbox de Claude Code no existe en Windows nativo.

1. Ubuntu con: `git`, `bubblewrap`, `socat`, Java 21 (`openjdk-21-jre-headless`, para el emulador), Node 24 (con nvm), `gh` y Claude Code.
2. En Ubuntu 24.04, revisa AppArmor: `sysctl kernel.apparmor_restrict_unprivileged_userns`. Si devuelve `1`, crea el perfil de `bwrap` que indica la documentación de sandbox de Claude Code y recarga AppArmor.
3. Firebase CLI: `npm install -g firebase-tools`.
4. VS Code en Windows con la extensión **WSL**; el proyecto vive en `~/proyectos/lista-deseos` (dentro de Ubuntu, nunca en `/mnt/c`). Ábrelo con `code ~/proyectos/lista-deseos`.

## 2. Línea base

```bash
npm install
npm run prepare           # hooks de git
cp env.example .env.local
npm run check             # debe quedar en verde
```

`.env.local` lleva solo valores falsos y del emulador. **No hay claves reales en este disco**; producción vive solo en Vercel.

## 3. Emulador de Firebase

```bash
npm run emulators         # Auth en 9099, Firestore en 8080, interfaz en http://127.0.0.1:4000
```

## 4. Claude Code

Ábrelo **siempre en la raíz del repo** (`cd ~/proyectos/lista-deseos && claude`). Antes de trabajar:

1. `/sandbox` → no debe aparecer la pestaña _Dependencies_.
2. `/permissions` → revisa que estén las reglas `deny` y `ask`.
3. Arranca en modo plan (ya es el predeterminado): la IA lee y propone; tú apruebas antes de que edite.

## 5. Cómo se construye cada feature

1. La IA escribe la especificación con la skill `write-spec` y te hace las preguntas abiertas. Las decisiones son tuyas.
2. Tú la cambias a _Aprobada_. Sin eso, nadie escribe código.
3. Primero la prueba que falla; luego el código; `npm run check:full` en verde.
4. `security` revisa en solo lectura.
5. Revisas el diff completo, un commit convencional por cambio, y anotas en `ia/BITACORA.md`.

Primer mensaje sugerido:

> Lee `AGENTS.md`, `docs/architecture.md` y `docs/features.md`. Empieza por F0: usa la skill `write-spec` para escribir su especificación, hazme las preguntas abiertas una por una (con tu propuesta) y no implementes nada hasta que yo la apruebe.
