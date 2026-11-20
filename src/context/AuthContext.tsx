"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, setStoredToken } from "@/lib/api";
import type { AuthenticatedUser } from "@/lib/rbac";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthenticatedUser>;
  verifyEmailOtp: (
    email: string,
    otp: string,
    name?: string
  ) => Promise<{ user: AuthenticatedUser; isNewUser: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthenticatedUser | null>;
  switchUser: (userId: number) => Promise<AuthenticatedUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<AuthenticatedUser | null> => {
    try {
      const res = await api.auth.getCurrentUser();
      const loadedUser = (res?.user || null) as AuthenticatedUser | null;
      setUser(loadedUser);
      return loadedUser;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setStoredToken(null);
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateSession = async () => {
      try {
        const res = await api.auth.getCurrentUser();
        if (!active) return;
        setUser((res?.user || null) as AuthenticatedUser | null);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          setStoredToken(null);
        }
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void hydrateSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthenticatedUser> => {
      const res = await api.auth.login(identifier.trim(), password);
      if (res.token) {
        setStoredToken(res.token);
      }
      const nextUser = res.user as AuthenticatedUser;
      setUser(nextUser);
      setLoading(false);
      return nextUser;
    },
    []
  );

  const verifyEmailOtp = useCallback(
    async (
      email: string,
      otp: string,
      name?: string
    ): Promise<{ user: AuthenticatedUser; isNewUser: boolean }> => {
      const res = await api.auth.verifyEmailOtp(email.trim(), otp.trim(), name?.trim() || undefined);
      if (res.token) {
        setStoredToken(res.token);
      }
      const nextUser = res.user as AuthenticatedUser;
      setUser(nextUser);
      setLoading(false);
      return { user: nextUser, isNewUser: Boolean(res.is_new_user) };
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.auth.logout();
    } catch {
      // Clear local session even if backend cookie is already expired
    } finally {
      setStoredToken(null);
      setUser(null);
      setLoading(false);
      router.replace("/login");
    }
  }, [router]);

  const switchUser = useCallback(
    async (userId: number): Promise<AuthenticatedUser> => {
      const res = await api.auth.switchUser(userId);
      if (res.token) {
        setStoredToken(res.token);
      }
      const nextUser = res.user as AuthenticatedUser;
      setUser(nextUser);
      setLoading(false);
      return nextUser;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verifyEmailOtp, logout, refreshUser, switchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
