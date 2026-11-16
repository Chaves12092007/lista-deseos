## Entrega: orquestador · F4–F9 + F19 Mi lista

**Estado:** Aprobado con observaciones (`security`, una sola ronda, 2026-11-16). Sin hallazgos Alta ni Media; los dos Bajos quedan anotados abajo, sin corregir (regla de la persona).

**Hecho:**

- Spec `docs/specs/f4-f9-f19-mi-lista.md` (aprobada). Nota en la spec de Cuentas sobre los destinos que cambian.
- TDD: las pruebas se escribieron primero y dieron rojo (5 archivos sin módulos y 2 pruebas de Cuentas que seguían yendo a `/`). Después se escribió el código sin cambiar ninguna prueba (solo se renombraron variables `snake_case` a `camelCase` por el lint).
- Contrato `app/features/wishes/schema.ts` (snake_case, `strictObject`, mensajes en español).
- Backend:
  - servicio `wish-service.ts` (tope de 100, orden, total, 404 indistinguible);
  - puerto, repositorio en memoria y repositorio de Firestore (`users/{uid}/wishes/{id}`, creación en transacción);
  - contenedor `getWishService()`;
  - rutas `POST /api/wishes`, `PATCH` y `DELETE /api/wishes/[id]`, con `parse-body.ts` (cuerpo inválido o `PATCH {}` → 400 sin `fields`).
- Frontend: `/mi-lista` (formulario, total, orden con enlaces, tarjetas, edición en el mismo formulario, `<dialog>` modal para eliminar), más `app/_components/my-wishes.tsx`.
- Cuentas: tras ingresar o registrarse y con sesión en `/registro` e `/ingresar` se va a `/mi-lista`; la barra tiene «Mi lista»; el inicio enlaza «Ver mi lista».
- Compartido: `TextField` acepta `defaultValue` e `inputMode`; `styles.ts` suma dos botones de peligro.

**Verificación (hecha):**

- `npm run typecheck`, `npm run lint`, `npm test` (563 pruebas; cobertura 95 % en líneas) y `npm run test:hooks` (12 de 12): en verde.
- `npx prettier --check app docs tests scripts`: en verde.
- `npx next build --webpack`: compila; `/mi-lista` sale como Partial Prerender y `/api/wishes` y `/api/wishes/[id]` como dinámicas.

**Decisiones mías (revisar):**

- Sin `GET /api/wishes`: la página lee por el servicio.
- Ids con la forma `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`; cualquier otro → 404.
- Textos: «Cargando tu lista…», «Guardando…», «Eliminando…», «Editar deseo», «Guardar cambios», «Agregar deseo», «Tus deseos», «Marcar como pendiente»; el enlace de la tienda lleva `aria-label` con «(se abre en una pestaña nueva)».
- En el 400/409 de la interfaz se muestra el texto del servidor; cualquier otro fallo da el mensaje genérico (también un 404 al editar o eliminar).
- El PATCH del formulario de edición nunca envía `purchased`.

**Pendiente / bloqueos (de la persona):**

- **Revisión en el navegador** (no se pudo dentro del sandbox), con `npm run emulators` y `npm run dev`:
  - `/mi-lista` a 360, 768 y 1024 px, sin scroll horizontal y con botones de 44 px;
  - agregar, editar, marcar/desmarcar, eliminar (Cancelar, `Escape`, Eliminar y foco), los tres órdenes, el estado vacío y el tope de 100;
  - sin sesión → `/ingresar`; tras ingresar o registrarse → `/mi-lista`;
  - consola sin errores.
- **`npm run build` (Turbopack)** falla en el sandbox porque no puede leer `.vscode`/`.idea` (permiso denegado); con `--webpack` compila. Correrlo fuera del sandbox, junto con `npm run check` completo (`format:check` falla por lo mismo).
- **Firestore real:** el repositorio de Firestore no tiene pruebas (la spec deja fuera el emulador). Conviene probar a mano la creación en paralelo con 99 deseos.

**Observaciones de `security` (aceptadas, sin corregir):**

- **B1 (Baja):** `isHttpUrl` acepta `https:example.com` y `https:/example.com` (el analizador los normaliza); el enlace se guarda tal cual y queda roto. Arreglo: exigir además `/^https?:\/\//i`. Cambia el contrato (`schema.ts`).
- **B2 (Baja):** se aceptan URLs con credenciales (`https://u:p@x.com`) y con tabuladores internos. Arreglo: rechazar `username`/`password` y caracteres de control.
- **I1:** la atomicidad del tope de 100 no se probó contra el emulador.
- **I2:** sin límite de peticiones ni tope de tamaño del cuerpo propio (riesgo ya aceptado en Cuentas).

**Dudas de la especificación:** ninguna abierta.
