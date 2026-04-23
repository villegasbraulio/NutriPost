import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { LanguageSelector } from "../components/LanguageSelector";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  weight_kg: z.coerce.number().min(30),
  height_cm: z.coerce.number().min(120),
  age: z.coerce.number().min(13),
  gender: z.enum(["male", "female", "other"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "reduce_fat", "maintain", "gain"]),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, loading, user } = useAuth();
  const { isSpanish } = useLanguage();
  const copy = isSpanish
    ? {
        title: "Crea tu perfil de rendimiento",
        username: "Usuario",
        email: "Email",
        password: "Contrasena",
        firstName: "Nombre",
        lastName: "Apellido",
        weight: "Peso (kg)",
        height: "Altura (cm)",
        age: "Edad",
        gender: "Genero",
        genderMale: "Masculino",
        genderFemale: "Femenino",
        genderOther: "Otro",
        activityLevel: "Nivel de actividad",
        activitySedentary: "Sedentario",
        activityLight: "Ligero",
        activityModerate: "Moderado",
        activityActive: "Activo",
        activityVeryActive: "Muy activo",
        goal: "Objetivo",
        create: "Crear cuenta",
        creating: "Creando cuenta...",
        registerLoading: "Creando tu perfil de NutriPost...",
        registerSuccess: "Cuenta creada.",
        registerError: "No pudimos completar el registro.",
        loginPrefix: "Ya tienes cuenta?",
        loginLink: "Ingresar",
      }
    : {
        title: "Create your performance profile",
        username: "Username",
        email: "Email",
        password: "Password",
        firstName: "First name",
        lastName: "Last name",
        weight: "Weight (kg)",
        height: "Height (cm)",
        age: "Age",
        gender: "Gender",
        genderMale: "Male",
        genderFemale: "Female",
        genderOther: "Other",
        activityLevel: "Activity level",
        activitySedentary: "Sedentary",
        activityLight: "Light",
        activityModerate: "Moderate",
        activityActive: "Active",
        activityVeryActive: "Very active",
        goal: "Goal",
        create: "Create Account",
        creating: "Creating account...",
        registerLoading: "Creating your NutriPost profile...",
        registerSuccess: "Account created.",
        registerError: "Registration failed.",
        loginPrefix: "Already have an account?",
        loginLink: "Sign in",
      };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      weight_kg: 70,
      height_cm: 170,
      age: 30,
      gender: "other",
      activity_level: "moderate",
      goal: "maintain",
    },
  });

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, navigate, user]);

  const onSubmit = async (values) => {
    await toast.promise(registerUser(values), {
      loading: copy.registerLoading,
      success: copy.registerSuccess,
      error: (error) => error.response?.data?.message || copy.registerError,
    });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-3xl rounded-[32px] p-8"
      >
        <div className="mb-6 flex justify-end">
          <LanguageSelector compact />
        </div>
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">NutriPost</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{copy.title}</h1>
        </div>

        <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          {[
            ["username", copy.username, "text"],
            ["email", copy.email, "email"],
            ["password", copy.password, "password"],
            ["first_name", copy.firstName, "text"],
            ["last_name", copy.lastName, "text"],
            ["weight_kg", copy.weight, "number"],
            ["height_cm", copy.height, "number"],
            ["age", copy.age, "number"],
          ].map(([name, label, type]) => (
            <div key={name} className={name === "password" ? "sm:col-span-2" : ""}>
              <label className="mb-2 block text-sm text-textMuted">{label}</label>
              <input
                type={type}
                step={type === "number" ? "0.1" : undefined}
                {...register(name)}
                className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
              />
              {errors[name] ? <p className="mt-2 text-sm text-rose-400">{errors[name].message}</p> : null}
            </div>
          ))}

          <div>
            <label className="mb-2 block text-sm text-textMuted">{copy.gender}</label>
            <select {...register("gender")} className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <option value="male">{copy.genderMale}</option>
              <option value="female">{copy.genderFemale}</option>
              <option value="other">{copy.genderOther}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-textMuted">{copy.activityLevel}</label>
            <select {...register("activity_level")} className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <option value="sedentary">{copy.activitySedentary}</option>
              <option value="light">{copy.activityLight}</option>
              <option value="moderate">{copy.activityModerate}</option>
              <option value="active">{copy.activityActive}</option>
              <option value="very_active">{copy.activityVeryActive}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm text-textMuted">{copy.goal}</label>
            <select {...register("goal")} className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <option value="lose">{isSpanish ? "Perder peso" : "Lose weight"}</option>
              <option value="reduce_fat">{isSpanish ? "Disminuir grasa" : "Reduce fat"}</option>
              <option value="maintain">{isSpanish ? "Mantenimiento" : "Maintain"}</option>
              <option value="gain">{isSpanish ? "Ganar masa muscular" : "Gain muscle"}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary/90 disabled:opacity-60 sm:col-span-2"
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? copy.creating : copy.create}
          </button>
        </form>

        <p className="mt-6 text-sm text-textMuted">
          {copy.loginPrefix}{" "}
          <Link className="font-semibold text-primary" to="/auth/login">
            {copy.loginLink}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
