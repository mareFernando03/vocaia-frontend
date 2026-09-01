---
name: revisar-pr
description: "Revisa los cambios de una rama o Pull Request con cinco revisores especializados en paralelo. Usar cuando alguien pide revisar un PR, mirar los cambios de una rama, o antes de pedirle la revisión a otro integrante."
argument-hint: "[numero de PR | rama | nada para la rama actual]"
allowed-tools: Bash, Read, Glob, Grep, Task
user-invocable: true
---

# Revisar un Pull Request

Cinco revisores especializados sobre el mismo diff, en paralelo, y una lista
consolidada al final. Objetivo: que abrir el PR y recibir la primera devolución
no sean dos días distintos.

**Es la variante de frontend.** Comparte la forma con la del backend y no los
revisores: acá no hay puertos ni capas, y sí hay una persona del otro lado de
la pantalla.

**Se corre antes de sacar el PR de borrador**, no después de pedir la revisión.
Así la persona que revisa recibe un PR con lo de máquina ya atendido y le quedan
las cuatro cosas que ninguna máquina puede juzgar: si esto es lo que la tarjeta
pide, las decisiones de diseño, si la deuda declarada es aceptable, y los
hallazgos que quedaron como sospecha. Es `equipo/acuerdos.md` §1.3.

## Antes que nada: el portón automático

**No gastes un revisor en lo que la máquina ya mira.** Corré esto primero y, si
algo falla, informalo y no sigas.

```
npx prettier --check .
npm run lint
npm run verificar-contraste
npm test
npm run build
```

Cada comando solo. **`verificar-contraste` no es opcional**: la accesibilidad
acá se verifica y no se declara, y es criterio de aceptación de HU-08.

## Qué se revisa

```
git fetch -q origin
git diff origin/main...HEAD
```

Con un número de PR, `gh pr diff <n>`. Sin argumento, la rama actual.

## Los cinco revisores

Lanzalos **en paralelo, en un solo mensaje**, con el diff y su encargo. Ninguno
escribe código: reportan.

| Revisor                    | Qué busca                                                       |
| -------------------------- | --------------------------------------------------------------- |
| `revisor-correccion`       | Estado, efectos, carreras, y el camino de error que nadie probó |
| `revisor-lenguaje`         | Que la pantalla no hable en el vocabulario del sistema          |
| `revisor-accesibilidad`    | Teclado, foco, lectores de pantalla, contraste                  |
| `revisor-datos-personales` | Qué guarda el navegador y qué se lleva al cerrar sesión         |
| `revisor-dod`              | Pruebas del criterio, cliente generado, tokens de color         |

**Si el diff no toca el área de un revisor, contesta «nada que observar».** Un
revisor que siempre encuentra algo enseña a ignorarlo.

> **Si no podés lanzar subagentes**, no hagas la revisión de un solo hilo y
> sigas como si nada: **decilo en el informe, en la primera línea**. Cinco
> miradas independientes y una sola pasada leyendo el mismo diff no son lo
> mismo, y esta skill degradaría sin fallar —que es la forma más cara de
> romperse—. Quien lee la revisión tiene que saber cuál de las dos recibió.

## Cómo se consolida

Una lista ordenada por gravedad. Por hallazgo: qué está mal, dónde, qué pasa si
no se arregla —el escenario concreto— y si bloquea. Bloquea lo que rompe algo,
lo que deja una pantalla inusable con teclado o lector, y lo que incumple la
DoD. El resto se dice y no frena el merge.

**Separá lo que verificaste de lo que sospechás.** Si algo se comprueba abriendo
la pantalla, comprobalo.

## Después de la revisión

- Con cada hallazgo se hace una de dos cosas, y no hay una tercera: **se arregla,
  o se declara en el cuerpo del PR** (`equipo/acuerdos.md` §1.3 del repositorio
  académico). Un incumplimiento declarado es una decisión que el equipo puede
  discutir; uno silencioso es un hallazgo del cierre del sprint.
- Los hallazgos se le **proponen a la persona**, no se aplican solos.
- Podés dejarlos como **comentario del PR, firmado como agente**, para que
  queden a la vista de los tres. Lo que no hacés es **aprobar, mergear, mover el
  tablero ni cerrar una conversación que abrió otro**.
