---
name: revisar-pr
description: "Revisa los cambios de una rama o Pull Request con los revisores especializados que el diff necesita, en paralelo. Usar cuando alguien pide revisar un PR, mirar los cambios de una rama, o antes de pedirle la revisión a otro integrante."
argument-hint: "[numero de PR | rama | nada para la rama actual]"
allowed-tools: Bash, Read, Glob, Grep, Task
user-invocable: true
---

# Revisar un Pull Request

Los revisores especializados que el diff necesita, en paralelo, y una lista
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

## A quién se lanza

Primero el mapa del diff, que es lo que decide:

```
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
```

**Cada revisor cuesta lo mismo encuentre algo o no**, así que no se lanza a quien
el diff no le da trabajo:

| Revisor                    | Se lanza si el diff…                                                                                                            | Qué busca                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `revisor-correccion`       | cambia un `.ts` o `.tsx` con lógica: estado, efectos, llamadas                                                                  | Estado, efectos, carreras, y el camino de error que nadie probó |
| `revisor-dod`              | cambia código de `src/` o el cliente generado                                                                                   | Pruebas del criterio, cliente generado, tokens de color         |
| `revisor-accesibilidad`    | cambia algo que se ve: `src/componentes/`, `src/paginas/`, un `.tsx` que renderiza, estilos o colores                           | Teclado, foco, lectores de pantalla, contraste                  |
| `revisor-lenguaje`         | agrega o cambia texto visible: `src/contenido/` o cadenas en un `.tsx`                                                          | Que la pantalla no hable en el vocabulario del sistema          |
| `revisor-datos-personales` | toca `src/auth/`, `src/api/`, el almacenamiento del navegador (`localStorage`, `sessionStorage`, cookies) o el cierre de sesión | Qué guarda el navegador y qué se lleva al cerrar sesión         |

**Un diff chico no necesita subagentes.** Si toca dos archivos o menos y agrega
unas cuarenta líneas o menos, hacé vos una sola pasada con los encargos de los
revisores que correspondan.

**En la duda, se lanza.** El criterio existe para no gastar en lo obvio, no para
ahorrar en lo dudoso: un revisor salteado que habría encontrado algo es el
único error caro de esta tabla.

Lanzá los elegidos **en paralelo, en un solo mensaje**. **No le pegues el diff
entero a cada uno**: a los que tienen `Bash` dales el comando con los archivos
de su área, y a los que no, pegales sólo esa parte. El diff entero en cada
encargo se paga una vez por revisor.

```
git diff origin/main...HEAD -- <archivos de su área>
```

Ninguno escribe código: reportan.

> **Si no podés lanzar subagentes**, no hagas la revisión de un solo hilo y
> sigas como si nada: **decilo en el informe, en la primera línea**. Cinco
> miradas independientes y una sola pasada leyendo el mismo diff no son lo
> mismo, y esta skill degradaría sin fallar —que es la forma más cara de
> romperse—. Quien lee la revisión tiene que saber cuál de las dos recibió.

## Cómo se consolida

**La primera línea dice qué revisión hubo**: qué revisores corrieron, cuáles se
saltearon y por qué, o que fue una sola pasada por ser un diff chico. Quien lee
la revisión tiene que saber qué miradas recibió el PR.

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

## Una segunda vuelta, después de arreglar

**No se repite la revisión entera.** Se revisa sólo lo que cambió desde la
primera, y sólo con los revisores cuya área tocan los arreglos:

```
git diff <commit revisado>..HEAD
```

El _commit_ revisado es el `HEAD` de la primera vuelta; anotalo en el informe.
Si el arreglo cambió algo grande, vale la tabla de «A quién se lanza» sobre ese
diff, como si fuera uno nuevo.
