import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ActivityDetailPage } from "./pages/ActivityDetailPage";
import { ActivityHistoryPage } from "./pages/ActivityHistoryPage";
import { ActivityLogPage } from "./pages/ActivityLogPage";
import { AssistantPage } from "./pages/AssistantPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NutritionLogPage } from "./pages/NutritionLogPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { RoutineDetailPage } from "./pages/RoutineDetailPage";
import { RoutineFormPage } from "./pages/RoutineFormPage";
import { RoutineListPage } from "./pages/RoutineListPage";
import { TodayNutritionPage } from "./pages/TodayNutritionPage";
import { routeShellTransition } from "./utils/animations";

const protectedPrefixes = ["/dashboard", "/assistant", "/activities", "/nutrition", "/routines", "/profile"];

function getRouteShellKey(pathname) {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) ? "protected" : pathname;
}

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={getRouteShellKey(location.pathname)} {...routeShellTransition} className="min-h-screen">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/activities/log" element={<ActivityLogPage />} />
            <Route path="/activities/logs" element={<ActivityHistoryPage />} />
            <Route path="/activities/logs/:id" element={<ActivityDetailPage />} />
            <Route path="/nutrition/log" element={<NutritionLogPage />} />
            <Route path="/nutrition/today" element={<TodayNutritionPage />} />
            <Route path="/routines" element={<RoutineListPage />} />
            <Route path="/routines/new" element={<RoutineFormPage />} />
            <Route path="/routines/:id/edit" element={<RoutineFormPage />} />
            <Route path="/routines/:id" element={<RoutineDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
