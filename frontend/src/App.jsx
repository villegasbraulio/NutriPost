import { Route, Routes } from "react-router-dom";

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
import { TodayNutritionPage } from "./pages/TodayNutritionPage";

export default function App() {
  return (
    <Routes>
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
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
