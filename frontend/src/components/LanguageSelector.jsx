import { Languages } from "lucide-react";

import { useLanguage } from "../hooks/useLanguage";

export function LanguageSelector({ align = "left", compact = false }) {
  const { isSpanish, language, setLanguage } = useLanguage();
  const copy = isSpanish
    ? {
        label: "Idioma",
        help: "Elegí cómo querés ver la interfaz.",
      }
    : {
        label: "Language",
        help: "Choose how you want the interface to look.",
      };

  const alignmentClass = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={`flex flex-col gap-3 ${alignmentClass}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
        <Languages className="h-4 w-4 text-primary" />
        {copy.label}
      </div>
      {compact ? null : <p className="text-sm text-textMuted">{copy.help}</p>}
      <div className="inline-grid grid-cols-2 rounded-2xl bg-background/60 p-1">
        {[
          ["es", "Español"],
          ["en", "English"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              language === value ? "bg-primary text-background" : "text-textMuted hover:text-textPrimary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
