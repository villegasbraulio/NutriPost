import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "../hooks/useAuth";

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
      loading: "Creating your NutriPost profile...",
      success: "Account created.",
      error: (error) => error.response?.data?.message || "Registration failed.",
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
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">NutriPost</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Create your performance profile</h1>
        </div>

        <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          {[
            ["username", "Username", "text"],
            ["email", "Email", "email"],
            ["password", "Password", "password"],
            ["first_name", "First name", "text"],
            ["last_name", "Last name", "text"],
            ["weight_kg", "Weight (kg)", "number"],
            ["height_cm", "Height (cm)", "number"],
            ["age", "Age", "number"],
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
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-textMuted">
          Already have an account?{" "}
          <Link className="font-semibold text-primary" to="/auth/login">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
