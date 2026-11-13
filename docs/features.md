# Lista de features (FDD)

Esta es la lista de lo que se va a construir, en el orden sugerido. **Aquí no hay reglas de negocio**: cada una se decide con la persona al escribir la especificación de su feature (skill `write-spec`, carpeta `docs/specs/`). Para empezar, ver `docs/empezar.md`; para saber por dónde vamos, `docs/progreso.md`.

Una feature = **acción + resultado + objeto**, pequeña y con valor visible («Agregar un deseo con su enlace y su precio»). Se construyen una por una y la persona aprueba la especificación **antes** de delegar. Las reglas de código están en `AGENTS.md`.

## Qué es el proyecto

Una lista de deseos: cada persona guarda los productos que quiere comprar, con el **enlace de la tienda** y el **precio**, los organiza en listas, ve cuánto suma todo y marca lo que ya compró.

## Roles

- **Usuario** = persona con cuenta; es dueña de sus deseos y de sus listas.
- **Público** = quien no ha ingresado (puede registrarse y, si se construye F15, ver una lista compartida).
- Qué ve y qué puede hacer cada uno, la moneda, los límites (cuántos deseos, largo de los textos, precios válidos) y qué pasa con los datos de otra persona **se decide en cada spec**. Nada de esto está decidido de antemano.

## Features

Ola = orden de construcción sugerido (cada ola es entregable por sí sola). Quién: quién la usa.

| Id           | Feature                                                                                             | Quién             | Ola          |
| ------------ | --------------------------------------------------------------------------------------------------- | ----------------- | ------------ |
| **Base**     |                                                                                                     |                   |              |
| F0           | Base del proyecto: errores y HTTP, sesión, Firebase, entorno, datos de ejemplo y puertas de calidad | Sistema           | 1            |
| **Cuentas**  |                                                                                                     |                   |              |
| F1           | Registrarse con correo y contraseña                                                                 | Público           | 1            |
| F2           | Ingresar y cerrar sesión                                                                            | Usuario           | 1            |
| F3           | Cambiar mi contraseña                                                                               | Usuario           | 4 (opcional) |
| **Deseos**   |                                                                                                     |                   |              |
| F4           | Agregar un deseo con nombre, enlace de la tienda y precio                                           | Usuario           | 1            |
| F5           | Ver mi lista de deseos con el total                                                                 | Usuario           | 1            |
| F6           | Editar un deseo                                                                                     | Usuario           | 1            |
| F7           | Eliminar un deseo                                                                                   | Usuario           | 1            |
| F8           | Marcar un deseo como comprado y ver lo comprado                                                     | Usuario           | 2            |
| F9           | Asignar prioridad a un deseo y ordenar por precio o prioridad                                       | Usuario           | 2            |
| F10          | Actualizar el precio de un deseo y guardar su historial                                             | Usuario           | 3            |
| F11          | Ver si el precio de un deseo subió o bajó                                                           | Usuario           | 3            |
| F12          | Validar el enlace de la tienda y mostrar su dominio                                                 | Sistema           | 3            |
| **Listas**   |                                                                                                     |                   |              |
| F13          | Crear, renombrar y eliminar listas (categorías)                                                     | Usuario           | 2            |
| F14          | Mover un deseo a una lista y filtrar por lista                                                      | Usuario           | 2            |
| F15          | Compartir una lista por enlace de solo lectura                                                      | Usuario · Público | 4 (opcional) |
| F16          | Definir una meta de ahorro y ver qué deseos me alcanzan                                             | Usuario           | 3            |
| F17          | Panel: total por lista y por prioridad                                                              | Usuario           | 4 (opcional) |
| **Interfaz** |                                                                                                     |                   |              |
| F18          | Barra de navegación con sesión y las pantallas base (inicio, registro, ingreso)                     | Todos             | 1            |
| F19          | Pantalla «Mi lista» con el formulario para agregar y editar deseos                                  | Usuario           | 1            |
| F20          | Pantalla de listas y de lo comprado                                                                 | Usuario           | 2            |

## Áreas y carpetas

Cada área agrupa features y tiene su carpeta en `app/features/` (ver `docs/architecture.md`).

| Área        | Carpeta                         | Features     |
| ----------- | ------------------------------- | ------------ |
| Cuentas     | `app/features/accounts`         | F1–F3        |
| Deseos      | `app/features/wishes`           | F4–F12, F19  |
| Listas      | `app/features/lists`            | F13–F17, F20 |
| Transversal | `app/` (páginas), `app/shared/` | F0, F18      |

## F0 · Alcance de la base

F0 es la capa que usan todas las demás: no tiene pantallas. Su especificación debe decidir, con la persona, al menos: cómo se representan y traducen los errores a HTTP, cómo se valida el origen de las peticiones, cómo se guarda y se verifica la sesión, cómo se conecta el servidor con Firebase, cómo se validan las variables de entorno (y un comando `npm run check:env` que muestre estados, nunca valores), qué datos de ejemplo crea el `seed` y cómo se prueba todo sin tocar la red. Las puertas de calidad (`npm run check`) ya existen: F0 no las reescribe.
