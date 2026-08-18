import { createContext, useContext, useState, useCallback } from "react";
import apiClient, { setToken, clearToken } from "../services/apiClient";

const AuthContext = createContext(null)

const STORAGE_KEY = "cmsclientdashboard.auth.user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const login = useCallback(async (loginEmail, loginPassword) => {
    try {
      const { data: body } = await apiClient.post("/auth/tenant/login", {
        email: loginEmail,
        password: loginPassword,
      });

      const payload = body?.data ?? body;

      if (!payload?.token || !payload?.user) {
        return {
          success: false,
          error: new Error(payload?.message || body?.message || "Login failed"),
        };
      }

      setToken(payload.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.user));
      setUser(payload.user);

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error("Login failed:", error);

      return {
        success: false,
        error,
      };
    }

  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearToken();
    setUser(null);
  }, []);

  const value = { user, isAuthenticated: Boolean(user), login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
  const ctx = useContext(AuthContext)
   if (!ctx) throw new Error('useAuth must be used within AuthProvider')
   return ctx
}