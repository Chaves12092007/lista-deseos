# ADR-0003 · Firebase (Authentication y Firestore)

- **Estado:** Aceptada
- **Fecha:** 2026-10-24
- **Quién decide:** la persona (profesor del curso)

## Contexto

La aplicación necesita identidades con correo y contraseña, y persistencia de datos (los deseos, sus enlaces y precios). Se quiere usar solo planes gratuitos. Las imágenes de los productos se guardan como **enlaces externos** (la URL de la imagen en la tienda), así que no hace falta almacenamiento de archivos; si una feature lo llega a necesitar, se decide en un ADR nuevo. Regla 6 de `AGENTS.md`: este ADR es la justificación escrita de las dependencias que nombra.

## Decisión

| Necesidad              | Servicio                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Credenciales y correos | **Firebase Authentication** (correo y contraseña, plan Spark). La app **nunca** guarda ni ve una contraseña. |
| Datos                  | **Firestore** (plan Spark)                                                                                   |

Reglas de uso:

- **Todo acceso a datos pasa por el servidor.** Firestore se usa con el SDK de administración (`firebase-admin`) y `firestore.rules` niega toda lectura y escritura directa del cliente (`allow read, write: if false`). El SDK de cliente (`firebase`) se usa solo para lo que debe ocurrir en el navegador (ingreso con Authentication).
- **La identidad sale de la sesión verificada en el servidor**, nunca de lo que mande el cliente (regla 4 de `AGENTS.md`).
- **Repositorios:** cada feature mantiene `repository.ts` (puertos asíncronos), `repository.memory.ts` (pruebas) y `repository.firestore.ts` (real). Las pruebas usan las implementaciones en memoria y no tocan la red ni el proyecto real de Firebase.
- **Dependencias:** `firebase-admin` (servidor), `firebase` (cliente, solo Authentication).
- **Secretos y variables:** los crea la persona en el archivo de entorno de la raíz; los agentes no lo leen ni lo crean. `env.example` lista los nombres. La clave de la cuenta de servicio nunca se sube a git ni se pega en un documento.

## Desarrollo sin secretos reales (actualización 2026-11-11)

- En desarrollo se usa **Firebase Emulator Suite** (Auth y Firestore) con el proyecto `demo-lista-deseos`. Un proyecto con prefijo `demo-` no existe en la nube y no necesita credenciales: **no hay claves reales en el disco**.
- `npm run emulators` arranca el emulador y guarda sus datos en `data/emulator/` (ignorado por git y prohibido para la IA).
- Las variables reales de producción viven **solo** en Vercel. `vercel env pull` está prohibido.
- `firebase-tools` se instala globalmente (`npm i -g firebase-tools`), no como dependencia del proyecto.
- Si una clave real se filtra, se **rota** (se borra en Google Cloud y se crea otra); borrarla del archivo no basta.

## Consecuencias

- Las contraseñas, el hash y el envío de correos salen del código de la app.
- Firestore no tiene restricciones únicas ni `CHECK`: la unicidad y los valores válidos se garantizan en el servicio, con transacciones y con los esquemas Zod; los repositorios de Firestore deben leer y validar cada documento con Zod antes de devolverlo.
- Spark apaga el producto el resto del mes al pasar la cuota diaria de Firestore.
- El plan Hobby de Vercel es para uso no comercial, suficiente para un proyecto de clase.
- Las consultas de Firestore son más limitadas que SQL (`LIKE`, uniones): lo que no se pueda consultar se resuelve filtrando en el servidor y, si el volumen crece, con otro ADR.
