import { useEffect, useState } from "react";

import { authService } from "../services/authService";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const data = await authService.getCurrentUser();
    setUser(data);
    return data;
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (active) {
          setUser(data);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const handleExpiredSession = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:expired", handleExpiredSession);
    bootstrap();

    return () => {
      active = false;
      window.removeEventListener("auth:expired", handleExpiredSession);
    };
  }, []);

  const login = async (credentials) => {
    const payload = await authService.login(credentials);
    setUser(payload.user);
    return payload;
  };

  const register = async (values) => {
    const payload = await authService.register(values);
    setUser(payload.user);
    return payload;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (values) => {
    const data = await authService.updateProfile(values);
    setUser(data);
    return data;
  };

  const loginDemo = () => login({ username: "demo", password: "DemoPass123!" });

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginDemo,
        logout,
        register,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
