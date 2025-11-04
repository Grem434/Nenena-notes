import { useState } from 'react'
import { Plus, Moon, Sun } from 'lucide-react'

export function App() {
  const [dark, setDark] = useState(false)
  return (
    <div className={"min-h-screen transition"} data-theme={dark ? 'dark' : 'light'}>
      <header className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src="/logo-nenena.png" alt="Nenena" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Nenena Notes</h1>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setDark(!dark)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {dark ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            <a href="#" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600">
              <Plus size={16}/> Nueva nota
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <article key={i} className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ejemplo #{i}</h3>
              <p className="text-sm text-slate-700 dark:text-slate-200">Nota de prueba. Cuando conectemos con la API, aquí verás tus notas.</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
