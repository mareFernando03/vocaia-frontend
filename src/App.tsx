export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">VocaIA — frontend</h1>
        {/* `text-muted-foreground` y no `text-gray-600`: en los componentes se
            nombra lo que la cosa es, no el color que tiene. Ver styles.css. */}
        <p className="text-muted-foreground mt-2 text-sm">
          Proyecto inicializado. Todavía no tiene interfaz.
        </p>
      </div>
    </main>
  );
}
