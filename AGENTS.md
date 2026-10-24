# Reglas de trabajo para Palma GO

Estas reglas aplican a cualquier cambio realizado en este repositorio.

## Contexto del proyecto

- Palma GO es una aplicación web para gestionar pedidos de un comedor.
- `client/` contiene el frontend construido con React, Vite, TypeScript y MUI.
- `server/` contiene el backend construido con Express, TypeScript, Prisma y SQLite.
- El backend organiza la lógica por rutas, controladores y servicios, y utiliza el esquema y las migraciones de `server/prisma/`.

## Reglas obligatorias

1. Leer y entender la estructura y el código existente antes de realizar cualquier cambio.
2. Preservar la arquitectura actual, las convenciones de nombres, el estilo de código y la organización por capas y dominios.
3. Realizar cambios pequeños, enfocados y fáciles de revisar.
4. No modificar archivos que no estén relacionados con la tarea solicitada.
5. No agregar ni actualizar dependencias, ni modificar archivos de bloqueo, salvo autorización explícita.
6. No modificar archivos fuera de este repositorio.
7. No crear entornos virtuales ni carpetas de dependencias fuera del proyecto.
8. Nunca modificar directamente la rama main. Antes de realizar cambios de código, confirmar que se está trabajando en una rama de trabajo. No crear ni cambiar de rama salvo que el usuario lo solicite explícitamente.
9. No hacer commit, push, merge ni crear Pull Requests salvo que el usuario lo solicite explícitamente.
10. Consultar al usuario antes de realizar cambios arquitectónicos importantes.
11. No ejecutar operaciones destructivas sobre la base de datos, como borrar datos, reiniciar migraciones o eliminar la base SQLite, sin autorización explícita.
12. Nunca exponer secretos, claves API, contraseñas, credenciales ni archivos `.env` en respuestas, logs, commits o Pull Requests.
13. Preservar el estilo visual existente y reutilizar los componentes actuales antes de crear componentes nuevos.
14. Después de realizar cambios, ejecutar las pruebas, el lint, el typecheck y el build relevantes cuando estén disponibles.
15. No modificar pruebas únicamente para hacer que pasen; si una prueba falla, corregir la implementación o reportar claramente el problema.
16. Informar al finalizar qué archivos fueron modificados y qué verificaciones fueron ejecutadas, incluyendo sus resultados.
17. Antes de ejecutar comandos de configuración, instalación, migración o inicialización, revisar primero el README.md y la documentación existente del proyecto.

## Flujo de colaboración

- Mantener los cambios acotados para facilitar el trabajo de las dos personas del proyecto mediante branches, Issues y Pull Requests.
- Revisar el diff antes de entregar el trabajo y confirmar que no se incluyeron cambios no relacionados.
- Si falta contexto o una decisión puede cambiar significativamente el resultado, preguntar antes de asumir.
