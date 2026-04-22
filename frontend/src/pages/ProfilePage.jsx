import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { HelpCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "../hooks/useAuth";

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
  const { user, updateProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [activeHelp, setActiveHelp] = useState(null);
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
      loading: "Saving profile...",
      success: "Profile updated.",
      error: (error) => error.response?.data?.message || "Could not save your profile.",
    });
    reset(updatedUser);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const preview = watch();
  const targets = user?.daily_goal_preview || preview?.daily_goal_preview;
  const targetCards = targets
    ? [
        {
          key: "bmr",
          label: "BMR",
          value: Math.round(targets.bmr || 0),
          helper: "Tu metabolismo basal: calorías que tu cuerpo usa en reposo para vivir, sin contar actividad ni entrenamiento.",
        },
        {
          key: "tdee",
          label: "TDEE",
          value: Math.round(targets.tdee || 0),
          helper: "Tu gasto total diario estimado: BMR multiplicado por tu nivel de actividad.",
        },
        {
          key: "objective",
          label: "Objetivo",
          value: Math.round(targets.calorias_objetivo || targets.calories_goal || 0),
          meta: `${Number(targets.goal_adjustment_calories || 0) > 0 ? "+" : ""}${Math.round(
            targets.goal_adjustment_calories || 0
          )} kcal por objetivo`,
          helper: "Las calorías recomendadas para tu meta: TDEE ajustado para perder peso, disminuir grasa, mantener o ganar masa muscular.",
        },
      ]
    : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Profile</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Fine-tune your recovery profile</h1>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          {[
            ["first_name", "First name", "text"],
            ["last_name", "Last name", "text"],
            ["email", "Email", "email"],
            ["weight_kg", "Weight (kg)", "number"],
            ["height_cm", "Height (cm)", "number"],
            ["age", "Age", "number"],
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
            <label className="mb-2 block text-sm text-textMuted">Gender</label>
            <select {...register("gender")} className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-textMuted">Activity level</label>
            <select {...register("activity_level")} className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm text-textMuted">Goal</label>
            <select {...register("goal")} className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <option value="lose">Perder peso</option>
              <option value="reduce_fat">Disminuir grasa</option>
              <option value="maintain">Mantenimiento</option>
              <option value="gain">Ganar masa muscular</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary/90 disabled:opacity-60 sm:col-span-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {saved ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Changes saved and TDEE recalculated.
          </motion.div>
        ) : null}
      </section>

      <section className="glass-panel rounded-[32px] p-6">
        <h2 className="text-2xl font-semibold">Updated daily targets</h2>
        <p className="mt-2 text-sm text-textMuted">These refresh after every profile save.</p>
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
                          aria-label={`Ayuda sobre ${card.label}`}
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
                  ["Protein", targets.protein_goal_g],
                  ["Carbs", targets.carbs_goal_g],
                  ["Fat", targets.fat_goal_g],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-background/60 p-5">
                    <p className="text-sm text-textMuted">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{Math.round(value || 0)} g</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-textMuted">Save your profile to see recalculated targets.</p>
          )}
        </div>
      </section>
    </div>
  );
}
