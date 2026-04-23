import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { HelpCircle, LogOut, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { LanguageSelector } from "../components/LanguageSelector";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

const profileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  weight_kg: z.coerce.number().min(30),
  height_cm: z.coerce.number().min(120),
  age: z.coerce.number().min(13),
  gender: z.enum(["male", "female", "other"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "reduce_fat", "maintain", "gain"]),
});

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const { isSpanish } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [activeHelp, setActiveHelp] = useState(null);
  const copy = isSpanish
    ? {
        sectionTag: "Perfil",
        title: "Ajusta tu perfil de recuperacion",
        saveLoading: "Guardando perfil...",
        saveSuccess: "Perfil actualizado.",
        saveError: "No pudimos guardar tu perfil.",
        firstName: "Nombre",
        lastName: "Apellido",
        email: "Email",
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
        save: "Guardar perfil",
        saving: "Guardando...",
        saved: "Cambios guardados y objetivos recalculados.",
        settingsTitle: "Cuenta e idioma",
        settingsText: "Administra el idioma de la interfaz y cierra sesion desde aca.",
        logout: "Cerrar sesion",
        logoutSuccess: "Sesion cerrada.",
        logoutError: "No pudimos cerrar sesion.",
        targetsTitle: "Objetivos diarios actualizados",
        targetsText: "Se refrescan cada vez que guardas el perfil.",
        targetsEmpty: "Guarda tu perfil para ver objetivos recalculados.",
        helpLabel: (label) => `Ayuda sobre ${label}`,
        bmrHelp:
          "Tu metabolismo basal: calorias que tu cuerpo usa en reposo para vivir, sin contar actividad ni entrenamiento.",
        tdeeHelp: "Tu gasto total diario estimado: BMR multiplicado por tu nivel de actividad.",
        objectiveHelp:
          "Las calorias recomendadas para tu meta: TDEE ajustado para perder peso, disminuir grasa, mantener o ganar masa muscular.",
      }
    : {
        sectionTag: "Profile",
        title: "Fine-tune your recovery profile",
        saveLoading: "Saving profile...",
        saveSuccess: "Profile updated.",
        saveError: "Could not save your profile.",
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
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
        save: "Save Profile",
        saving: "Saving...",
        saved: "Changes saved and TDEE recalculated.",
        settingsTitle: "Account and language",
        settingsText: "Manage your interface language and sign out from here.",
        logout: "Logout",
        logoutSuccess: "Logged out.",
        logoutError: "Could not log out.",
        targetsTitle: "Updated daily targets",
        targetsText: "These refresh after every profile save.",
        targetsEmpty: "Save your profile to see recalculated targets.",
        helpLabel: (label) => `Help about ${label}`,
        bmrHelp:
          "Your basal metabolic rate: calories your body uses at rest to stay alive, before activity or training.",
        tdeeHelp: "Your total daily energy expenditure: BMR multiplied by your activity level.",
        objectiveHelp:
          "The recommended calories for your goal: TDEE adjusted to lose weight, reduce fat, maintain, or gain muscle.",
      };
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: user,
  });

  useEffect(() => {
    if (user) {
      reset(user);
    }
  }, [reset, user]);

  const onSubmit = async (values) => {
    const updatedUser = await toast.promise(updateProfile(values), {
      loading: copy.saveLoading,
      success: copy.saveSuccess,
      error: (error) => error.response?.data?.message || copy.saveError,
    });
    reset(updatedUser);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await toast.promise(logout(), {
      loading: copy.logout,
      success: copy.logoutSuccess,
      error: (error) => error.response?.data?.message || copy.logoutError,
    });
    navigate("/auth/login", { replace: true });
  };

  const preview = watch();
  const targets = user?.daily_goal_preview || preview?.daily_goal_preview;
  const targetCards = targets
    ? [
        {
          key: "bmr",
          label: "BMR",
          value: Math.round(targets.bmr || 0),
          helper: copy.bmrHelp,
        },
        {
          key: "tdee",
          label: "TDEE",
          value: Math.round(targets.tdee || 0),
          helper: copy.tdeeHelp,
        },
        {
          key: "objective",
          label: isSpanish ? "Objetivo" : "Goal",
          value: Math.round(targets.calorias_objetivo || targets.calories_goal || 0),
          meta: isSpanish
            ? `${Number(targets.goal_adjustment_calories || 0) > 0 ? "+" : ""}${Math.round(
                targets.goal_adjustment_calories || 0
              )} kcal por objetivo`
            : `${Number(targets.goal_adjustment_calories || 0) > 0 ? "+" : ""}${Math.round(
                targets.goal_adjustment_calories || 0
              )} kcal goal adjustment`,
          helper: copy.objectiveHelp,
        },
      ]
    : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">{copy.sectionTag}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{copy.title}</h1>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          {[
            ["first_name", copy.firstName, "text"],
            ["last_name", copy.lastName, "text"],
            ["email", copy.email, "email"],
            ["weight_kg", copy.weight, "number"],
            ["height_cm", copy.height, "number"],
            ["age", copy.age, "number"],
          ].map(([name, label, type]) => (
            <div key={name}>
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
            <Save className="h-4 w-4" />
            {isSubmitting ? copy.saving : copy.save}
          </button>
        </form>

        {saved ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {copy.saved}
          </motion.div>
        ) : null}
      </section>

      <div className="space-y-6">
        <section className="glass-panel rounded-[32px] p-6">
          <h2 className="text-2xl font-semibold">{copy.settingsTitle}</h2>
          <p className="mt-2 text-sm text-textMuted">{copy.settingsText}</p>
          <div className="mt-6 rounded-3xl bg-background/60 p-5">
            <LanguageSelector />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-semibold text-textMuted transition hover:border-white/20 hover:text-textPrimary"
          >
            <LogOut className="h-4 w-4" />
            {copy.logout}
          </button>
        </section>

        <section className="glass-panel rounded-[32px] p-6">
          <h2 className="text-2xl font-semibold">{copy.targetsTitle}</h2>
          <p className="mt-2 text-sm text-textMuted">{copy.targetsText}</p>
          <div className="mt-6 grid gap-4">
            {targets ? (
              <>
                <div className="grid gap-4">
                  {targetCards.map((card) => {
                    const isOpen = activeHelp === card.key;
                    return (
                      <div key={card.key} className="rounded-3xl bg-background/60 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-textMuted">{card.label}</p>
                            <p className="mt-2 text-3xl font-bold">{card.value} kcal</p>
                            {card.meta ? <p className="mt-1 text-xs text-textMuted">{card.meta}</p> : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveHelp(isOpen ? null : card.key)}
                            className="rounded-full border border-white/10 bg-surface/70 p-2 text-textMuted transition hover:border-primary/40 hover:text-primary"
                            aria-label={copy.helpLabel(card.label)}
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </div>
                        {isOpen ? (
                          <motion.p
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-relaxed text-textMuted"
                          >
                            {card.helper}
                          </motion.p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    [isSpanish ? "Proteina" : "Protein", targets.protein_goal_g],
                    [isSpanish ? "Carbohidratos" : "Carbs", targets.carbs_goal_g],
                    [isSpanish ? "Grasas" : "Fat", targets.fat_goal_g],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-3xl bg-background/60 p-5">
                      <p className="text-sm text-textMuted">{label}</p>
                      <p className="mt-2 text-2xl font-bold">{Math.round(value || 0)} g</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-textMuted">{copy.targetsEmpty}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
