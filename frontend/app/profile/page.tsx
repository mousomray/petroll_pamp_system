"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout";
import { Card } from "primereact/card";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

// PrimeReact styles
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import axiosInstance from "@/service/axios.service";

type User = {
  name: string;
  role?: string;
  email: string;
  image?: string;
};

const ProfilePage: React.FC<any> = ({ user: initialUser, success, err }) => {
  const [user, setUser] = useState<User>({
    name: "Admin User",
    role: "Admin",
    email: "admin@example.com",
    image: "/img/avatars/avatar-1.jpg",
  });

  useEffect(() => {
    if (initialUser) {
      setUser((prev) => ({ ...prev, ...initialUser }));
      return;
    }

    const fetchProfile = async () => {
      try {
        const json = localStorage.getItem("user");
        if (json) {
          setUser((prev) => ({ ...prev, ...(JSON.parse(json) || {}) }));
          return;
        }

        const res = await axiosInstance.get("/api/login/profile-page");
        const data = res.data;
        // API may return user directly or under data.user
        const profile = data.user || data;
        setUser((prev) => ({ ...prev, ...(profile || {}) }));
        try {
          localStorage.setItem("user", JSON.stringify(profile || {}));
        } catch (e) {
          // ignore localStorage errors
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };

    fetchProfile();
  }, [initialUser]);

  const getInitials = (name?: string) => {
    if (!name) return "A";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/login/logout");
    } catch (e) {
      console.error("Logout API error:", e);
    } finally {
      try {
        localStorage.removeItem("login-token");
        localStorage.removeItem("user");
      } catch (e) {
        console.log("Error clearing localStorage on logout", e);
      }
      window.location.href = "/login";
    }
  };

  return (
    <DashboardLayout user={{ name: user.name, image: user.image || "/img/avatars/avatar-1.jpg" }}>
      {/* Flash Messages */}
      {success && success !== "" && (
        <div style={{ marginBottom: 16 }}>
          <Message severity="success" text={success} />
        </div>
      )}

      {err && err !== "" && (
        <div style={{ marginBottom: 16 }}>
          <Message severity="error" text={err} />
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ marginBottom: 24 }}>
              <Avatar
                image={user.image || undefined}
                label={!user.image ? getInitials(user.name) : undefined}
                size="xlarge"
                shape="circle"
                style={{
                  width: 150,
                  height: 150,
                  border: "4px solid #0ea5e9",
                  boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
                  backgroundColor: !user.image ? "#0ea5e9" : undefined,
                  color: !user.image ? "#fff" : undefined,
                  fontSize: !user.image ? 48 : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#023040", margin: "0 0 8px 0" }}>
              Welcome, {user.name}
            </h2>
            <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 32px 0" }}>
              Your dashboard is ready
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                maxWidth: 500,
                margin: "0 auto 32px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #023040, #072033)",
                  color: "#fff",
                }}
              >
                <i className="pi pi-briefcase" style={{ fontSize: 24, marginBottom: 8, display: "block" }} />
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Role</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{user.role || "Admin"}</div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  color: "#fff",
                }}
              >
                <i className="pi pi-envelope" style={{ fontSize: 24, marginBottom: 8, display: "block" }} />
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Email</div>
                <div style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{user.email}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Button
                label="Edit Profile"
                icon="pi pi-user-edit"
                severity="info"
                style={{ borderRadius: 10, padding: "12px 24px" }}
                onClick={() => (window.location.href = "/admin/profile")}
              />
              <Button
                label="Logout"
                icon="pi pi-sign-out"
                severity="danger"
                outlined
                style={{ borderRadius: 10, padding: "12px 24px" }}
                onClick={handleLogout}
              />
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;