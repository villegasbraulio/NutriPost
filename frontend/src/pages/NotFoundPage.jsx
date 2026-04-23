import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { useLanguage } from "../hooks/useLanguage";

export function NotFoundPage() {
  const { isSpanish } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-xl rounded-[32px] p-10 text-center"
      >
        <p className="text-sm uppercase tracking-[0.24em] text-primary">404</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          {isSpanish ? "Esta pagina se salio de la ruta." : "This page sprinted off the route."}
        </h1>
        <p className="mt-4 text-textMuted">
          {isSpanish
            ? "Se perdio el rastro, pero tu panel sigue justo donde lo dejaste."
            : "The trail went cold, but your dashboard is still right where you left it."}
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex rounded-2xl bg-primary px-5 py-3 font-semibold text-background"
        >
          {isSpanish ? "Volver al inicio" : "Back to Dashboard"}
        </Link>
      </motion.div>
    </div>
  );
}
