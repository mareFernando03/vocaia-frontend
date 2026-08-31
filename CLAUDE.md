# VocaIA — frontend

Interfaz web de VocaIA, un agente conversacional de orientación vocacional.
Proyecto final de Ingeniería en Sistemas de Información, UTN.

React 19 + TypeScript + Vite + Tailwind 4. El `README.md` explica cómo
levantarlo. Este archivo son las reglas que no se deducen leyendo el código.

**`AGENTS.md` lo escribe Lovable y no se edita a mano.**

---

## Las tres que no se negocian

**1. El cliente HTTP se genera, no se escribe.** Vive en `src/api/generado/` y
sale del esquema OpenAPI del backend. Nadie escribe un `fetch` a mano contra la
API ni define a mano el tipo de una respuesta. Si falta un endpoint, el que
está atrasado es el esquema.

**2. Ningún color literal en un componente.** Todos los colores son tokens
semánticos definidos en `src/styles.css`, nombrados por lo que la cosa **es**
(`text-muted-foreground`) y no por el color que tiene (`text-gray-500`). Un
cambio de paleta tiene que ser un cambio en ese archivo, no una búsqueda por
todo el proyecto. Los valores están en OKLCH porque su primer número es la
luminosidad percibida, que es lo que permite oscurecer un color hasta cumplir
contraste sin que cambie de tono.

**3. La accesibilidad se verifica, no se declara.** `npm run verificar-contraste`
comprueba los pares de color contra WCAG. Todo lo navegable tiene que
funcionar con teclado. Es criterio de aceptación de HU-08, no una mejora
opcional.

## Cómo se escribe acá

- **Todo en español**: componentes, funciones, variables, carpetas y ramas. Por
  eso `src/componentes/` y `src/paginas/` y no `components/` y `pages/`.
- La excepción es `src/api/generado/`, que sale de una herramienta y refleja
  los nombres del backend.
- Los comentarios explican el porqué, no el qué.

## Lovable

El repositorio está conectado a Lovable, que sincroniza de forma bidireccional
contra la rama `lovable`. De ahí se promueve a `main` por pull request revisado
(ADR-008 §4).

**No reescribir historia publicada** —nada de force push, rebase, amend ni
squash sobre commits ya empujados—. Lovable reconstruye el historial del
proyecto desde el repositorio, y reescribirlo le hace perder el suyo.

## El contrato con el backend

El backend es la fuente de verdad. Publica `openapi.json` como artefacto
versionado y su CI falla si el archivo commiteado no coincide con la
aplicación.

De este lado la regla es simétrica: **quien consume un cambio del contrato
regenera el cliente en el mismo pull request**, y el cliente regenerado se
commitea. Se commitea a propósito: con dos repositorios no hay forma de
compartir tipos en tiempo de compilación, y commitearlo hace que el desajuste
entre front y back aparezca como un diff revisable en vez de como un error en
tiempo de ejecución durante la demo.

## Verificar antes de abrir un pull request

```sh
npx prettier --check .
npm run lint
npm test
npm run build
npm run verificar-contraste
```

`npm test` llega con el pipeline de CI (VOCAIA-49) y `verificar-contraste` con
el sistema de diseño (VOCAIA-59). Hasta que esas dos ramas entren a `main`, los
scripts no existen todavía.

## Ramas, commits y tablero

- Rama por historia, nombrada con la card: `feature/VOCAIA-NN-descripcion`. Si
  el trabajo no tiene card, no inventar un número: `chore/` o `fix/` a secas.
- _Conventional commits_, en español.
- `main` está protegida: todo entra por pull request con un revisor.

**El tablero de Jira lo leen los otros dos integrantes y es evidencia ante la
cátedra.** Antes de cualquier escritura —transición, comentario,
reasignación— hay que confirmarlo con la persona. Las reglas completas de cómo
se comenta una card están en el repositorio académico.

## Los otros dos repositorios

`vocaia-backend` es el servicio FastAPI. El repositorio académico
(`proyecto-final/`) tiene las decisiones, los ADR, el backlog y las reglas de
gestión: ahí está el porqué de casi todo lo que acá aparece como un hecho.

Para tenerlos en la misma sesión, cada integrante los agrega con
`/add-dir <su ruta local>` — las rutas cambian según la máquina, por eso no
están escritas acá. Es lo que permite generar el cliente leyendo el
`openapi.json` del backend sin copiar y pegar.

Lo más consultado del repositorio académico:

| Qué                                        | Dónde                                                             |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Topología de repos y contrato OpenAPI      | `ejecucion/adr/ADR-008-topologia-de-repositorios.md`              |
| Backlog y criterios de aceptación          | `ejecucion/backlog-producto.md` · `ejecucion/backlog-sprint-1.md` |
| Reglas de Jira, bitácora de esfuerzo y ADR | `CLAUDE.md` del repositorio académico                             |

## Registro de esfuerzo — también acá

El trabajo en este repositorio se imputa igual que el del repositorio académico. Al cerrar,
**proponer el registro de trabajo (worklog) en la tarjeta de Jira**: hora de inicio, duración,
y el **tipo de tarea como primera palabra del comentario** —`andamiaje` · `redaccion` ·
`procesamiento` · `diseno` · `ceremonia` · `terceros`—. El código es casi siempre `andamiaje`.

Se cuenta el tiempo dedicado, y el tramo en que el agente ejecuta y la persona supervisa
cuenta como trabajo. La persona carga y corrige lo que quiera, cuando quiera; **el agente
propone y no escribe horas que nadie confirmó**. El detalle está en `proyecto-final/CLAUDE.md`
del repositorio académico.

## Revisar un Pull Request

`.claude/skills/revisar-pr/` corre cinco revisores en paralelo sobre el diff:
corrección, lenguaje, accesibilidad, datos personales y definición de terminado.
Se pide en lenguaje natural —«revisá este PR»— y no hace falta invocarlo por nombre.

**Corre el portón automático primero y no repite lo que él ya mira.** Los cinco están
para lo que compila, pasa las pruebas y aun así está mal: viven en `.claude/agents/` y
cada uno declara qué busca. El de accesibilidad mira, entre otras cosas, el par de
colores que nadie declaró en el verificador, que es donde su verde no significa nada.
Ninguno escribe código ni comenta en GitHub: proponen, y la persona decide qué entra.
