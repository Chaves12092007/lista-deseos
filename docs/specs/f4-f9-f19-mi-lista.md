# F4–F9 + F19 · Mi lista: agregar, ver, editar, eliminar, marcar comprado, prioridad y ordenar

- **Estado:** Aprobada
- **Rol(es):** Usuario (todo); Público (solo es redirigido a `/ingresar`)
- **Contrato afectado:** `app/features/wishes/schema.ts` (nuevo). `app/shared/schema.ts` no cambia. Cambia el comportamiento de Cuentas (ver «Cambios a la spec de Cuentas»).

## Objetivo

Una persona con sesión guarda sus deseos (nombre, enlace de la tienda y precio en COP), los ve en `/mi-lista` con el total de lo pendiente, los edita, los elimina, los marca como comprados y los ordena por prioridad o por precio.

## Reglas de negocio

### Modelo del deseo (F4, F9)

1. Un deseo tiene (todo en `snake_case`, también en el cable):

   | Campo        | Regla                                                                                       |
   | ------------ | ------------------------------------------------------------------------------------------- |
   | `id`         | texto que asigna el servidor; la persona nunca lo elige                                     |
   | `name`       | texto de 1 a 100 caracteres **después** de recortar los espacios de los extremos            |
   | `store_url`  | URL con esquema `http:` o `https:`, de 1 a 2048 caracteres después de recortar; ver regla 3 |
   | `price_cop`  | número entero de 0 a 1 000 000 000 (pesos colombianos, sin decimales)                       |
   | `priority`   | `"alta"`, `"media"` o `"baja"`; por defecto `"media"`                                       |
   | `purchased`  | booleano; por defecto `false`                                                               |
   | `created_at` | fecha ISO 8601 que pone el servidor al crear; no cambia nunca                               |
   | `updated_at` | fecha ISO 8601 que pone el servidor al crear y en cada edición                              |

2. `name` se recorta antes de validar y se guarda recortado. Un nombre vacío o de solo espacios es inválido.
3. `store_url` se recorta y se guarda tal cual (sin normalizar). Debe poder leerse con `new URL()`, su `protocol` debe ser `http:` o `https:` y debe tener host. Cualquier otro esquema (`javascript:`, `data:`, `ftp:`, `file:`…) es inválido.
4. `price_cop` debe llegar como **número JSON entero**. Un texto (`"100"`), un decimal (`10.5`), un negativo, `NaN`, un valor sobre 1 000 000 000 o ausente en la creación es inválido. `0` es válido.
5. Los deseos se pueden repetir: no hay regla de unicidad por `name` ni por `store_url`.
6. Cuerpos con campos desconocidos (por ejemplo `uid`, `id`, `created_at`) se **rechazan** con 400 `VALIDATION` en lugar de ignorarlos.

### Dueño y límite (F4)

7. El dueño de un deseo es el `uid` de la sesión (`getSession()` de F0). Nunca se lee del cuerpo, de la URL ni de un encabezado.
8. Cada persona ve, edita y elimina **solo** sus deseos. Un `id` que no existe o que es de otra persona responde igual: 404 `NOT_FOUND` «No encontramos ese deseo.» (no se distingue, para no revelar que existe).
9. Cada persona puede tener como máximo **100** deseos. Agregar el 101 → 409 `CONFLICT` «Llegaste al máximo de 100 deseos. Elimina alguno para agregar otro.» El conteo y la creación son **atómicos** (una transacción), de modo que dos peticiones a la vez no pasan de 100. Eliminar uno libera un cupo.
10. El servicio es dueño del número 100 y de todas las reglas de esta spec. El repositorio solo guarda y busca; el puerto ofrece una operación de creación atómica que recibe el tope y avisa si se alcanzó.

### Agregar (F4)

11. `POST /api/wishes` con `{ name, store_url, price_cop, priority?, purchased? }`. Crea el deseo y responde **201** con el deseo completo (regla 1). `priority` por defecto `"media"`; `purchased` por defecto `false`.

### Ver y total (F5)

12. La página `/mi-lista` lee la lista a través del servicio (`listWishes(uid, orden)`); no hay `GET /api/wishes`.
13. Cada deseo muestra: nombre, enlace a la tienda, precio, prioridad y estado («Pendiente» o «Comprado»).
14. El enlace a la tienda lleva como texto el **host** de la URL (por ejemplo `tienda.com`), `href` igual a `store_url`, `target="_blank"` y `rel="noopener noreferrer"`.
15. El precio se muestra con `new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })`.
16. Se muestra «Total pendiente: <precio>», que es la suma de `price_cop` de los deseos con `purchased === false`. Con 0 deseos o sin pendientes, el total es `0` (formateado). El total lo calcula el servicio (`total_pending_cop`), no la interfaz.
17. Sin ningún deseo se muestra «Aún no tienes deseos. Agrega el primero.» junto al formulario.

### Orden y prioridad (F9)

18. `?orden=` admite `prioridad` (por defecto), `precio-asc` y `precio-desc`. Cualquier otro valor, repetido o vacío se trata como `prioridad`, sin error.
19. Criterios (el orden lo calcula el servicio):
    - `prioridad`: `alta`, `media`, `baja`.
    - `precio-asc`: `price_cop` de menor a mayor.
    - `precio-desc`: `price_cop` de mayor a menor.
    - Empate en cualquiera de ellos: `created_at` ascendente (el más antiguo primero) y, si aún empata, `id` ascendente.
20. Los deseos **comprados van siempre al final**, tachados y con el estado «Comprado», y dentro de ese bloque se ordenan con el mismo criterio. Los pendientes van arriba.
21. La interfaz ofrece el orden con tres enlaces («Prioridad», «Precio: menor a mayor», «Precio: mayor a menor») que cambian `?orden`; el activo lleva `aria-current="true"`.
22. La prioridad se cambia al editar el deseo (regla 23); no hay otra pantalla para eso.

### Editar y marcar comprado (F6, F8)

23. `PATCH /api/wishes/[id]` con cualquier subconjunto **no vacío** de `{ name, store_url, price_cop, priority, purchased }`. Cada campo enviado se valida con las reglas 2–4 y las de `priority` y `purchased`; los no enviados no cambian. Un cuerpo `{}` → 400. Responde **200** con el deseo completo y `updated_at` nuevo. `created_at` e `id` no se pueden cambiar (regla 6).
24. Marcar o desmarcar comprado es un `PATCH` con `{ purchased: true | false }`. Es idempotente: repetirlo responde 200 igual. El botón dice «Marcar como comprado» o «Marcar como pendiente» según el estado.
25. Editar un deseo ajeno o inexistente → 404 (regla 8). Editar **no** vuelve a contar el límite de 100.

### Eliminar (F7)

26. `DELETE /api/wishes/[id]` responde **204**. Un `id` ajeno o inexistente → 404 (regla 8). Eliminar dos veces: la segunda da 404.
27. La interfaz pide confirmación con un `<dialog>` propio: «¿Eliminar «<nombre>»? No se puede deshacer.» con los botones «Eliminar» y «Cancelar». Solo «Eliminar» llama a la ruta. «Cancelar», `Escape` o cerrar el diálogo no hacen nada.

### Persistencia

28. Firestore, colección `users/{uid}/wishes/{id}` (en desarrollo, solo con el emulador, nunca claves reales). Cada documento guarda los campos de la regla 1 menos `id` (que es el id del documento).
29. El repositorio de Firestore valida cada documento leído con el esquema Zod (ADR-0003); un documento corrupto es un error interno (500 genérico), no un dato a mostrar.
30. Hay un repositorio en memoria para las pruebas con la misma interfaz. Nada de las pruebas toca la red.
31. El navegador nunca habla con Firestore. Las reglas de Firestore del proyecto niegan toda lectura y escritura desde clientes.

### Página `/mi-lista` y navegación (F19, F18)

32. `/mi-lista` exige sesión. Sin sesión (o con una cookie inválida) → `redirect("/ingresar")`. La página **no** borra la cookie (R2 de F0).
33. `<title>`: «Mi lista · Lista de deseos». Un solo `<h1>`: «Mi lista».
34. Estructura: formulario «Agregar un deseo» arriba, luego el total, los enlaces de orden y la lista de deseos. Editar abre **el mismo formulario** con los datos del deseo, en la misma página (sin otra ruta), con los botones «Guardar cambios» y «Cancelar».
35. Formulario: `<label>` visible en cada campo (`name`, `store_url`, `price_cop`, `priority` como `<select>` con alta/media/baja), errores por campo con `role="alert"` y `aria-describedby`, error general arriba del botón. El campo de precio es texto con `inputmode="numeric"`; la interfaz lo convierte a número entero antes de enviar y, si no son solo dígitos, muestra el error del precio sin llamar al servidor. Mientras se envía, el botón queda deshabilitado y dice «Guardando…».
36. Tras un éxito (agregar, editar, marcar, eliminar) la página se refresca (`router.refresh()`) y el formulario se limpia o se cierra.
37. Las lecturas de sesión y de `searchParams` van dentro de `<Suspense>` (Cache Components). La estructura y el título se prerenderizan.
38. Se cumple `docs/frontend-rules.md` completo: paleta, contraste, foco, objetivos de 44 px, y revisión a 360, 768 y 1024 px. A 360 px la lista no desborda horizontalmente.

### Cambios a la spec de Cuentas (decididos por la persona)

39. Después de ingresar o de registrarse, la navegación va a **`/mi-lista`** (antes `/`). Esto reemplaza la regla 9 (la parte de «va a `/`»), la 12 y la 26 de `docs/specs/f1-f2-f18-cuentas.md`. El respaldo de la regla 9 (si el ingreso automático falla → `/ingresar?cuenta=creada`) no cambia.
40. Con sesión, abrir `/registro` o `/ingresar` redirige a **`/mi-lista`** (antes `/`). _(Lo propongo yo para ser coherente; ver decisiones mías.)_
41. La barra con sesión suma el enlace «Mi lista» → `/mi-lista`, antes del correo y de «Cerrar sesión». Sin sesión no aparece.
42. El inicio con sesión mantiene «Hola, <correo>» y reemplaza «Pronto podrás agregar tus deseos aquí.» por un enlace «Ver mi lista» → `/mi-lista`. Cerrar sesión sigue yendo a `/`.
43. Las pruebas de Cuentas que fijaban esos destinos y textos se actualizan **por esta spec**; no se cambia ninguna otra.

### Seguridad transversal

44. `POST`, `PATCH` y `DELETE` revisan `Origin` (F0, regla 6) antes de llamar al servicio → 403 si falta o es distinto. Sin sesión → 401 `UNAUTHENTICATED` (la ruta no llama al servicio). Un JSON roto → 400 (`rejectInvalidJson`).
45. Los textos del usuario (`name`, `store_url`) se pintan siempre como texto de React, nunca como HTML. Un `store_url` solo llega al `href` si pasó la regla 3.
46. Los errores 500 son genéricos (F0, regla 3): nunca incluyen datos del deseo, rutas ni mensajes de Firebase.

## Entradas y salidas

| Entrada                          | Tipo / restricción                                                            |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `POST /api/wishes` `name`        | texto; recortado; 1–100; obligatorio                                          |
| `POST /api/wishes` `store_url`   | texto; recortado; 1–2048; `http`/`https` con host; obligatorio                |
| `POST /api/wishes` `price_cop`   | número entero JSON 0–1 000 000 000; obligatorio                               |
| `POST /api/wishes` `priority`    | `"alta"` \| `"media"` \| `"baja"`; opcional (def. `"media"`)                  |
| `POST /api/wishes` `purchased`   | booleano; opcional (def. `false`)                                             |
| `PATCH /api/wishes/[id]`         | subconjunto no vacío de los cinco campos de arriba                            |
| `[id]` en la ruta                | texto de 1 a 128 caracteres sin `/`; si no cumple → 404 (no 400)              |
| `DELETE /api/wishes/[id]`        | sin cuerpo                                                                    |
| `/mi-lista?orden=`               | `prioridad` \| `precio-asc` \| `precio-desc`; otro valor → `prioridad`        |
| Todas las rutas de `/api/wishes` | sesión válida (`uid` de la cookie) y `Origin` igual al de la petición         |
| Cualquier cuerpo                 | solo los campos listados (los demás → 400, regla 6); JSON válido (si no, 400) |

Deseo en el cable: `{ id, name, store_url, price_cop, priority, purchased, created_at, updated_at }`.

Salidas exitosas: `POST` → 201 deseo; `PATCH` → 200 deseo; `DELETE` → 204. La lista que arma el servicio: `{ wishes: Wish[], total_pending_cop: number }`.

Errores esperados:

- `ValidationError`/`ZodError` → 400 `VALIDATION` con `fields` (`name`, `store_url`, `price_cop`, `priority`, `purchased`). Un campo desconocido o un cuerpo `{}` en `PATCH` → 400 con mensaje general y sin `fields`.
- `UnauthenticatedError` → 401: sin sesión o cookie inválida.
- `ForbiddenError` → 403: `Origin` ausente o distinto.
- `NotFoundError` → 404 «No encontramos ese deseo.»: `id` inexistente, ajeno o mal formado.
- `ConflictError` → 409 «Llegaste al máximo de 100 deseos. Elimina alguno para agregar otro.»: crear el deseo 101.
- Otro error → 500 genérico.

Mensajes de campo (los usa el servidor y la interfaz):

| Campo       | Caso                                    | Mensaje                                                        |
| ----------- | --------------------------------------- | -------------------------------------------------------------- |
| `name`      | vacío o solo espacios                   | «Escribe el nombre del deseo.»                                 |
| `name`      | más de 100                              | «El nombre puede tener hasta 100 caracteres.»                  |
| `store_url` | vacío o solo espacios                   | «Escribe el enlace de la tienda.»                              |
| `store_url` | no es URL o el esquema no es http/https | «Escribe un enlace válido que empiece con http:// o https://.» |
| `store_url` | más de 2048                             | «El enlace puede tener hasta 2048 caracteres.»                 |
| `price_cop` | ausente o vacío                         | «Escribe el precio.»                                           |
| `price_cop` | no es entero (texto, decimal, `NaN`)    | «El precio debe ser un número entero de pesos, sin decimales.» |
| `price_cop` | negativo                                | «El precio no puede ser negativo.»                             |
| `price_cop` | sobre 1 000 000 000                     | «El precio puede ser hasta 1.000.000.000.»                     |
| `priority`  | valor fuera de la lista                 | «Elige la prioridad: alta, media o baja.»                      |
| `purchased` | no es booleano                          | «El estado comprado debe ser verdadero o falso.»               |

Mensajes de la interfaz: «Aún no tienes deseos. Agrega el primero.», «Total pendiente: <precio>», «No pudimos guardar el deseo. Intenta de nuevo.», «No pudimos eliminar el deseo. Intenta de nuevo.», «No pudimos actualizar el deseo. Intenta de nuevo.» (cualquier respuesta no esperada o error de red).

## Autorización

- **SÍ pueden:** las personas con sesión válida, solo sobre sus propios deseos.
- **NO pueden:** ver, editar ni eliminar deseos de otra persona (404); elegir el dueño de un deseo; superar 100 deseos; cambiar `id`, `created_at` ni el dueño.
- **Sin sesión:** `/mi-lista` → redirige a `/ingresar`; las rutas `/api/wishes` → 401. Con una cookie inválida se trata como sin sesión y no se borra.
- La autorización vive en el servicio y en el repositorio: todas las consultas van acotadas a `users/{uid}/wishes`, así que un `id` ajeno simplemente no existe para esa persona.

## Criterios de aceptación

### Validación y creación

- **Dado** `{ name: "  Audífonos  ", store_url: "https://tienda.com/a", price_cop: 120000 }` **cuando** se hace `POST /api/wishes` **entonces** 201 con `name: "Audífonos"`, `priority: "media"`, `purchased: false`, `created_at` y `updated_at` iguales, y un `id`.
- **Dado** `name` de 1, 100 y 101 caracteres **cuando** se crea **entonces** 201, 201 y 400 con `fields.name`; con `"   "` o `""` → 400 «Escribe el nombre del deseo.»
- **Dado** `store_url` `https://x.co`, `http://x.co` **cuando** se crea **entonces** 201; con `javascript:alert(1)`, `ftp://x.co`, `data:text/html,x`, `tienda.com` o `"https://"` → 400 con `fields.store_url`.
- **Dado** `store_url` de 2048 caracteres (URL válida) **cuando** se crea **entonces** 201; con 2049 → 400 «El enlace puede tener hasta 2048 caracteres.»
- **Dado** `price_cop` 0 y 1 000 000 000 **cuando** se crea **entonces** 201; con -1, 1 000 000 001, `10.5`, `"100"`, `null` y ausente → 400 con `fields.price_cop`.
- **Dado** `priority` `"urgente"` **cuando** se crea o edita **entonces** 400 con `fields.priority`.
- **Dado** un cuerpo con `uid`, `id`, `created_at` o `foo` **cuando** se crea o edita **entonces** 400 y no se guarda nada.
- **Dado** dos peticiones iguales **cuando** se crean **entonces** se crean dos deseos distintos (regla 5).

### Dueño y límite

- **Dado** que Ana tiene 99 deseos **cuando** crea uno **entonces** 201 y tiene 100; **cuando** crea otro **entonces** 409 y sigue con 100.
- **Dado** que Ana tiene 100 y elimina uno **cuando** crea otro **entonces** 201.
- **Dado** que Ana tiene 100 y Beto tiene 0 **cuando** Beto crea uno **entonces** 201 (el tope es por persona).
- **Dado** 100 peticiones de crear en paralelo con 99 existentes **cuando** terminan **entonces** exactamente una da 201 y las demás 409.
- **Dado** un deseo de Ana **cuando** Beto hace `PATCH` o `DELETE` con ese `id` **entonces** 404 «No encontramos ese deseo.» (idéntico a un id inexistente) y el deseo de Ana no cambia.
- **Dado** un cuerpo con `uid: "otro"` **cuando** se crea **entonces** 400 (el dueño siempre es el de la sesión).
- **Dado** un `[id]` de 129 caracteres, vacío o con `/` **cuando** se hace `PATCH` o `DELETE` **entonces** 404.

### Ver, total y orden

- **Dado** Ana con 3 pendientes de 10 000, 20 000 y 0 y uno comprado de 500 000 **cuando** abre `/mi-lista` **entonces** el total muestra 30 000 formateado en COP.
- **Dado** que Ana no tiene deseos **cuando** abre `/mi-lista` **entonces** ve «Aún no tienes deseos. Agrega el primero.» y el total es 0.
- **Dado** que todos sus deseos están comprados **cuando** abre `/mi-lista` **entonces** el total es 0.
- **Dado** deseos baja, alta, media y alta (el segundo alta más nuevo) **cuando** `?orden` falta o es `prioridad` **entonces** salen alta (antiguo), alta (nuevo), media, baja.
- **Dado** `?orden=precio-asc` **cuando** hay precios 30, 10, 20, 10 **entonces** salen 10 (antiguo), 10 (nuevo), 20, 30; con `precio-desc` salen 30, 20, 10 (antiguo), 10 (nuevo).
- **Dado** `?orden=xyz`, `?orden=` o `?orden=a&orden=b` **cuando** se abre la página **entonces** se ordena por prioridad y no hay error.
- **Dado** un deseo comprado y uno pendiente de menor prioridad **cuando** se lista con cualquier orden **entonces** el pendiente va primero y el comprado al final, tachado.
- **Dado** `price_cop: 1234567` **cuando** se muestra **entonces** el texto es el que produce el `Intl.NumberFormat` de la regla 15 (las pruebas usan el mismo formateador, no una cadena fija).
- **Dado** un deseo con `store_url` `https://www.tienda.com/p?id=1` **cuando** se muestra **entonces** el enlace dice `www.tienda.com`, abre en nueva pestaña y tiene `rel="noopener noreferrer"`.
- **Dado** `name` `<script>alert(1)</script>` **cuando** se muestra **entonces** aparece como texto, sin ejecutarse.

### Editar, comprar y eliminar

- **Dado** un deseo **cuando** se hace `PATCH { price_cop: 5 }` **entonces** 200, solo cambian `price_cop` y `updated_at`; `created_at` queda igual.
- **Dado** `PATCH {}` **entonces** 400. **Dado** `PATCH { name: "  " }` **entonces** 400 «Escribe el nombre del deseo.»
- **Dado** un deseo pendiente **cuando** se hace `PATCH { purchased: true }` dos veces **entonces** 200 las dos y queda comprado; el total baja por su precio.
- **Dado** un deseo comprado **cuando** se hace `PATCH { purchased: false }` **entonces** vuelve a pendiente y su precio vuelve al total.
- **Dado** un deseo **cuando** se hace `DELETE` **entonces** 204 y deja de aparecer; un segundo `DELETE` → 404.
- **Dado** el diálogo de eliminar abierto **cuando** se pulsa «Cancelar» o `Escape` **entonces** no se llama a la ruta y el deseo sigue en la lista; con «Eliminar» se llama a `DELETE` una sola vez.

### Autorización y seguridad

- **Dado** que no hay sesión **cuando** se abre `/mi-lista` **entonces** redirige a `/ingresar`; **dado** una cookie inválida **entonces** igual, y la cookie no se borra.
- **Dado** que no hay sesión **cuando** se llama a `POST`, `PATCH` o `DELETE` **entonces** 401 y no se llama al servicio.
- **Dado** `POST`/`PATCH`/`DELETE` sin `Origin` o con otro origen **cuando** llega **entonces** 403 y no se llama al servicio.
- **Dado** un JSON roto **cuando** se hace `POST` o `PATCH` **entonces** 400.
- **Dado** que el repositorio lanza un error inesperado **cuando** se responde **entonces** 500 genérico sin datos del deseo.
- **Dado** un documento de Firestore con forma inválida **cuando** se lee **entonces** error interno (500), no se muestra.

### Navegación (cambios a Cuentas)

- **Dado** un registro o ingreso correcto **cuando** termina **entonces** el navegador va a `/mi-lista`.
- **Dado** una sesión **cuando** se abre `/registro` o `/ingresar` **entonces** redirige a `/mi-lista`.
- **Dado** una sesión **cuando** se carga cualquier página **entonces** la barra tiene «Mi lista» → `/mi-lista`; sin sesión no la tiene.
- **Dado** una sesión **cuando** se carga el inicio **entonces** muestra «Hola, <correo>» y un enlace «Ver mi lista» → `/mi-lista`, y ya no el texto «Pronto podrás agregar tus deseos aquí.»
- **Dado** un ancho de 360 px **cuando** se abre `/mi-lista` **entonces** no hay scroll horizontal y todos los botones miden al menos 44 px.

## Bordes

- `name` de 0, 1, 100 y 101 caracteres; solo espacios; con espacios en los extremos.
- `store_url` de 2048 y 2049 caracteres; esquemas `http`, `https`, `javascript`, `ftp`, `data`; sin esquema; vacío.
- `price_cop` de -1, 0, 1, 1 000 000 000 y 1 000 000 001; decimal; texto; `null`.
- 0, 1, 99, 100 y 101 deseos por persona; crear en paralelo en el límite.
- Lista vacía; todos comprados; ninguno comprado; precios y fechas iguales (desempate).
- `?orden` ausente, vacío, repetido o desconocido.
- `PATCH` con `{}`; con un solo campo; con un campo desconocido.
- `[id]` vacío, de 129 caracteres, con `/`, inexistente, ajeno.
- Marcar comprado dos veces; eliminar dos veces.

## Fuera de alcance

Listas o categorías (F13, F14), historial y cambios de precio (F10, F11), validar el dominio de la tienda (F12), pantalla propia de lo comprado (F20), meta de ahorro (F16), compartir (F15), panel (F17), otras monedas, imágenes o descripción del deseo, paginación (el tope de 100 la hace innecesaria), buscar o filtrar, deshacer un borrado, edición en lote, reordenar a mano, límite de peticiones (sigue como el riesgo aceptado de Cuentas) y pruebas contra el emulador.

## Diseño técnico sugerido (lo detalla la interfaz del orquestador)

- `app/features/wishes/schema.ts` (orquestador): `WishSchema`, `CreateWishInputSchema` y `UpdateWishInputSchema` (ambos `.strict()`), `WishOrderSchema` (con `.catch("prioridad")` para el orden), `ListWishesOutputSchema { wishes, total_pending_cop }`.
- `app/features/wishes/server/`:
  - `repository.ts`: puerto `WishRepository { createIfUnderLimit(uid, data, max), findById(uid, id), listByOwner(uid), update(uid, id, patch), remove(uid, id) }` y el tipo de registro.
  - `repository.memory.ts` y `repository.firestore.ts` (con validación Zod por documento y transacción en la creación).
  - `wish-service.ts`: `createWishService({ repository, now, newId? })` con `create`, `list`, `update`, `remove`. Aquí viven el tope, el orden, el total y los 404.
- `app/features/container.ts`: agrega `getWishService()`.
- Rutas: `app/api/wishes/route.ts` (`POST`) y `app/api/wishes/[id]/route.ts` (`PATCH`, `DELETE`). Usan `assertSameOrigin`, `rejectInvalidJson`, `toErrorResponse` y `getSession`.
- UI: `app/features/wishes/ui/` (formulario, tarjeta/fila del deseo, diálogo de eliminar, enlaces de orden, formato de precio y host). Página: `app/mi-lista/page.tsx`.
- Cambios en Cuentas: `accounts/ui/register-form.tsx`, `login-form.tsx` y `sign-in.ts` (destino), `app/registro/page.tsx`, `app/ingresar/page.tsx`, `app/page.tsx`, `accounts/ui/home-welcome.tsx` y `accounts/ui/site-nav.tsx`.
- Reglas de Firestore: archivo de reglas que niega todo a clientes (`firestore.rules`), si aún no existe.
- Antes de programar, leer `node_modules/next/dist/docs/` (rutas dinámicas con `params`, `searchParams`, Suspense y Cache Components).

## Preguntas abiertas

Respondidas por la persona el 2026-11-16:

1. ¿Dónde van los deseos comprados y cómo afectan el orden? → Al final de la lista, tachados; los pendientes se ordenan según `?orden`; el total suma solo pendientes.
2. ¿Se permiten deseos duplicados? → Sí, sin regla de unicidad.
3. ¿Qué pasa al llegar a 100? → 409 `CONFLICT` con el mensaje de la regla 9, con conteo atómico.
4. ¿Cómo se confirma eliminar? → `<dialog>` propio en la página con «Eliminar» y «Cancelar».

Decididas por la persona en su mensaje (no eran preguntas): campos y límites del deseo, dueño por sesión con 404 para ids ajenos, máximo 100, `/mi-lista` con redirección a `/ingresar`, enlace en nueva pestaña con `rel`, `Intl.NumberFormat`, total de pendientes, `?orden` y su valor por defecto, formulario de agregar y editar, botón de comprado, destinos tras ingresar o registrarse, enlaces de la portada y la barra, Firestore con repositorio en memoria.

Decisiones que tomé yo (sin preguntar) y que debes revisar antes de aprobar:

- Los textos exactos de errores de campo, del 404, del 409, del diálogo, del estado vacío, del total y de los botones; el título «Mi lista · Lista de deseos».
- **No hay `GET /api/wishes`:** la página lee por el servicio (regla 12). Solo hay `POST`, `PATCH` y `DELETE`.
- Cuerpos con campos desconocidos → 400 (en vez de ignorarlos); `PATCH {}` → 400.
- Editar y marcar comprado usan el mismo `PATCH` parcial; devuelve 200 con el deseo completo.
- `price_cop` debe ser número JSON (un texto `"100"` se rechaza).
- `store_url` se guarda tal cual, sin normalizar, y se muestra con su host como texto del enlace.
- Desempate: `created_at` ascendente (el más antiguo primero) y luego `id`; los comprados al final con el mismo criterio.
- Un `[id]` mal formado responde 404, no 400.
- `created_at` no cambia nunca; `updated_at` cambia en cada edición, también al marcar comprado.
- Con sesión, `/registro` e `/ingresar` redirigen a `/mi-lista` (regla 40), no a `/`.
- Editar abre el mismo formulario en la misma página; no hay ruta de edición.
- La ruta de la API es `/api/wishes` (en inglés, como `/api/accounts`); el archivo de la spec es `f4-f9-f19-mi-lista.md`.
- Las reglas de Firestore niegan a los clientes todo acceso (regla 31).
