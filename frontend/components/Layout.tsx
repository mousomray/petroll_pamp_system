"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Role, useProfileStore } from "@/lib/store/profileStore"
interface LayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    image: string;
  };
}

const Layout: React.FC<LayoutProps> = ({
  children,
  user = { name: "Admin User", image: "/img/avatars/avatar-2.jpg" }
}) => {
  const [collapsed, setCollapsed] = useState(false);


  const { profile, loading, error, fetchProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  console.log("Profile Data:", profile, "Loading:", loading, "Error:", error);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    } catch (e) {
      console.log("Error reading sidebar state", e);
    }

    // Listen for sidebar toggle
    const handleToggleEvent = () => {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    };

    window.addEventListener("sidebarToggle", handleToggleEvent);
    return () => {
      window.removeEventListener("sidebarToggle", handleToggleEvent);
    };
  }, []);
   

  const role: Role = profile?.role ?? "ADMIN";
  console.log("==>", role)

  console.log("++", profile?.role)
    
 
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Sidebar - Fixed */}
       <Sidebar role={role}/>
      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: collapsed ? "80px" : "300px",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Navbar - Fixed */}
        <Navbar role={role} user={user} />

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            marginTop: "72px", // Height of navbar
            padding: "24px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
