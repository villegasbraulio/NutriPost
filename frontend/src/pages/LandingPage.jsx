import { motion } from "framer-motion";
import { ArrowRight, Flame, LineChart, Salad, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { pageTransition, staggerContainer, staggerItem } from "../utils/animations";

const features = [
  {
    title: "MET-based calorie burn",
    description: "Track workouts with evidence-based energy expenditure using official MET values.",
    icon: Flame,
  },
  {
    title: "Recovery meal suggestions",
    description: "Translate every session into smart post-workout foods powered by Open Food Facts.",
    icon: Salad,
  },
  {
    title: "Daily progress clarity",
    description: "Visualize burn, intake, and macro recovery with charts built for quick decisions.",
    icon: LineChart,
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();

  const handleDemo = async () => {
    await toast.promise(loginDemo(), {
      loading: "Signing into the demo account...",
      success: "Demo session ready.",
      error: "Demo account not available yet. Run seed_demo_user first.",
    });
    navigate("/dashboard");
  };

  return (
    <motion.div
      {...pageTransition}
      className="min-h-screen overflow-hidden bg-background text-textPrimary"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-hero-radial" />
        <div className="absolute -left-20 top-16 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-primary">NutriPost</p>
              <p className="text-sm text-textMuted">Track effort. Recover with intent.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/auth/login"
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-textMuted transition hover:border-white/20 hover:text-textPrimary"
              >
                Login
              </Link>
              <Link
                to="/auth/register"
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
              >
                Get Started
              </Link>
            </div>
          </header>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
              <motion.div variants={staggerItem} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                Built for training recovery
              </motion.div>
              <motion.div variants={staggerItem} className="space-y-5">
                <h1 className="max-w-xl text-5xl font-bold tracking-tight sm:text-6xl">
                  Train hard. Let your recovery plan keep up.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-textMuted">
                  NutriPost combines physical activity logging, MET calorie burn calculations,
                  and real food recommendations so every workout ends with a better next meal.
                </p>
              </motion.div>
              <motion.div variants={staggerItem} className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleDemo}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-background transition hover:bg-primary/90"
                >
                  Try Demo
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/auth/register"
                  className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-textPrimary transition hover:border-secondary/40 hover:bg-secondary/10"
                >
                  Create Account
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="glass-panel rounded-[32px] p-6 shadow-glow"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-background/60 p-5">
                  <p className="text-sm text-textMuted">Today’s burn</p>
                  <p className="mt-4 text-4xl font-bold">612</p>
                  <p className="mt-2 text-sm text-primary">Running + HIIT session synced</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-secondary/25 to-secondary/5 p-5">
                  <p className="text-sm text-textMuted">Recovery target</p>
                  <p className="mt-4 text-4xl font-bold">31g</p>
                  <p className="mt-2 text-sm text-secondary">Protein post-workout</p>
                </div>
                <div className="rounded-3xl bg-background/60 p-5 sm:col-span-2">
                  <p className="text-sm text-textMuted">Recommended stack</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Greek Yogurt", "Banana", "Rice Cakes"].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-surface px-4 py-3">
                        <p className="font-medium">{item}</p>
                        <p className="text-sm text-textMuted">Open Food Facts powered</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.section
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 pb-16 md:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={staggerItem} className="glass-panel rounded-3xl p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">{feature.title}</h2>
                  <p className="mt-3 text-textMuted">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
