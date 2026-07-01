import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { LanguageSelector } from "../components/LanguageSelector";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

const loginSchema = z.object({
  username: z.string().min(3, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginDemo, loading, user } = useAuth();
  const { isSpanish } = useLanguage();
  const copy = isSpanish
    ? {
        title: "Ingresa a tu panel de recuperacion",
        username: "Usuario",
        password: "Contrasena",
        button: "Ingresar",
        loading: "Ingresando...",
        loginLoading: "Ingresando...",
        loginSuccess: "Bienvenido otra vez.",
        loginError: "No pudimos iniciar sesion.",
        demoButton: "Entrar a la demo",
        demoLoading: "Abriendo demo...",
        demoSuccess: "Sesion demo lista.",
        demoError: "No pudimos abrir la demo.",
        demoHint: "Prefieres mirar primero? Entra a la demo sin crear cuenta.",
        createPrefix: "No tienes cuenta?",
        createLink: "Crear una cuenta",
      }
    : {
        title: "Sign in to your recovery dashboard",
        username: "Username",
        password: "Password",
        button: "Sign In",
        loading: "Signing in...",
        loginLoading: "Logging you in...",
        loginSuccess: "Welcome back.",
        loginError: "Login failed.",
        demoButton: "Enter Demo",
        demoLoading: "Opening demo...",
        demoSuccess: "Demo session ready.",
        demoError: "We could not open the demo.",
        demoHint: "Want to explore first? Enter the demo without creating an account.",
        createPrefix: "New here?",
        createLink: "Create an account",
      };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, navigate, user]);

  const onSubmit = async (values) => {
    const redirectPath = location.state?.from?.pathname || "/dashboard";
    try {
      await toast.promise(login(values), {
        loading: copy.loginLoading,
        success: copy.loginSuccess,
        error: (error) => error.response?.data?.message || copy.loginError,
      });
      navigate(redirectPath, { replace: true });
    } catch {
      return;
    }
  };

  const handleDemo = async () => {
    const redirectPath = location.state?.from?.pathname || "/dashboard";
    try {
      await toast.promise(loginDemo(), {
        loading: copy.demoLoading,
        success: copy.demoSuccess,
        error: (error) => error.response?.data?.message || copy.demoError,
      });
      navigate(redirectPath, { replace: true });
    } catch {
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md rounded-[32px] p-8"
      >
        <div className="mb-6 flex justify-end">
          <LanguageSelector compact />
        </div>
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">NutriPost</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{copy.title}</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm text-textMuted">{copy.username}</label>
            <input
              {...register("username")}
              className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-textPrimary placeholder:text-textMuted"
              placeholder="demo"
            />
            {errors.username ? <p className="mt-2 text-sm text-rose-400">{errors.username.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm text-textMuted">{copy.password}</label>
            <input
              type="password"
              {...register("password")}
              className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-textPrimary placeholder:text-textMuted"
              placeholder="••••••••"
            />
            {errors.password ? <p className="mt-2 text-sm text-rose-400">{errors.password.message}</p> : null}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary/90 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? copy.loading : copy.button}
          </button>
          <button
            type="button"
            onClick={handleDemo}
            className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 font-semibold text-textPrimary transition hover:border-secondary/40 hover:bg-secondary/10"
          >
            {copy.demoButton}
          </button>
        </form>

        <p className="mt-4 text-sm text-textMuted">{copy.demoHint}</p>
        <p className="mt-6 text-sm text-textMuted">
          {copy.createPrefix}{" "}
          <Link className="font-semibold text-primary" to="/auth/register">
            {copy.createLink}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
