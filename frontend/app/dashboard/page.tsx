"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

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

    try {
      const json = localStorage.getItem("user");
      if (json) setUser((prev) => ({ ...prev, ...(JSON.parse(json) || {}) }));
    } catch (e) {
      // ignore
    }
  }, [initialUser]);
  return (
    <div className="wrapper">
      {/* Sidebar */}
      <Sidebar />

      <div className="main">
        {/* Navbar */}
        <Navbar user={{ name: user.name, image: user.image || "/img/avatars/avatar-1.jpg" }} />

        {/* Flash Messages */}
        {success && success !== "" && (
          <div
            className="alert alert-success"
            role="alert"
            style={{
              position: "absolute",
              top: 50,
              left: "50%",
              transform: "translateX(-50%)",
              width: "50%",
              textAlign: "center",
              backgroundColor: "#d4edda",
              color: "#155724",
              border: "1px solid #c3e6cb",
              borderRadius: 5,
              padding: 10,
              zIndex: 1000,
            }}
          >
            {success}
          </div>
        )}

        {err && err !== "" && (
          <div
            className="alert alert-danger"
            role="alert"
            style={{
              position: "absolute",
              top: 50,
              left: "50%",
              transform: "translateX(-50%)",
              width: "50%",
              textAlign: "center",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              border: "1px solid #f5c6cb",
              borderRadius: 5,
              padding: 10,
              zIndex: 1000,
            }}
          >
            {err}
          </div>
        )}

        {/* Main content area */}
        <main
          className="content"
          style={{ padding: 30, backgroundColor: "#f8f9fa", minHeight: "100vh" }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              padding: 40,
              textAlign: "center",
            }}
          >
            <img
              src={user.image || "/img/avatars/avatar-1.jpg"}
              alt="Profile Picture"
              style={{
                borderRadius: "50%",
                width: 150,
                height: 150,
                objectFit: "cover",
                marginBottom: 20,
              }}
            />
            <h2 style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}>
              Welcome, {user.name}
            </h2>
            <p style={{ fontSize: 16, color: "#555" }}>
              Role:{" "}
              <span style={{ fontWeight: "bold", color: "#007bff" }}>
                {user.role || "Admin"}
              </span>
            </p>
            <p style={{ fontSize: 16, color: "#555" }}>
              Email:{" "}
              <span style={{ fontWeight: "bold", color: "#007bff" }}>
                {user.email}
              </span>
            </p>

            <div
              style={{
                marginTop: 30,
                display: "flex",
                justifyContent: "center",
                gap: 20,
              }}
            >
              <a
                href="/admin/adminlogout"
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#dc3545",
                  color: "#fff",
                  fontWeight: "bold",
                  borderRadius: 5,
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Logout
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;