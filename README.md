# VocaIA — Frontend

Frontend oficial de VocaIA, un agente conversacional de orientación vocacional. Proyecto final de Ingeniería en Sistemas de Información de la UTN FRSF.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS

## Requisitos

- Node.js 20 o superior
- npm

## Instalación y ejecución

```sh
npm install
npm run dev
```

La aplicación se levanta en `http://localhost:5173` por defecto.

## Backend

El backend es un servicio Python con FastAPI que vive en un repositorio aparte y se conectará a través de `src/api/`.
