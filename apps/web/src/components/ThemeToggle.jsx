// apps/web/src/components/ThemeToggle.jsx
import { useThemeStore } from "@/store/useThemeStore";

export default function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const Btn = ({ value, label }) => (
    <button
      onClick={() => setTheme(value)}
      className={[
        "px-2 py-1 rounded-lg text-xs border transition",
        theme === value
          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700",
      ].join(" ")}
      aria-pressed={theme === value}
    >
      {label}
    </button>
  );

  // oculto en móvil: hidden md:flex
  return (
    <div className="hidden md:flex items-center gap-1">
      <Btn value="system" label="Auto" />
      <Btn value="light"  label="Claro" />
      <Btn value="dark"   label="Oscuro" />
    </div>
  );
}
