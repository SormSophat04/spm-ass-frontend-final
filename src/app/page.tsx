"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDefaultModulePath } from "@/lib/rbac";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(getDefaultModulePath(user.role, user.allowed_modules));
    } else {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return (
    <div className="login-centered-shell">
      <div
        className="glass-panel"
        style={{
          maxWidth: "420px",
          width: "100%",
          margin: "auto 0",
          padding: "28px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "12px",
            borderRadius: "10px",
            background: "#DBEAFE",
            border: "2px solid #0F172A",
            boxShadow: "2px 2px 0px #0F172A",
            display: "inline-flex",
          }}
        >
          <ShieldCheck size={24} color="#2563EB" />
        </div>
        <h2 style={{ fontSize: "1rem", fontWeight: 900, color: "#0F172A" }}>
          {loading
            ? "Loading AcadCoord Session..."
            : user
            ? "Routing to Authorized Workspace..."
            : "Redirecting to Institutional Sign In..."}
        </h2>
        <p style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>
          Role permissions and navigation routes are verified dynamically.
        </p>
      </div>
    </div>
  );
}
