"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";



interface NavbarProps {
    role: "ADMIN" | "MANAGER" | "CASHIER";
    user: {
        name: string;
        image: string;
    };
}

const Navbar: React.FC<NavbarProps> = ({ user, role }) => {
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const menuRef = React.useRef<Menu>(null);

    useEffect(() => {
        try {
            const v = window.localStorage.getItem('sidebarCollapsed');
            const isCollapsed = v === '1';
            setCollapsed(isCollapsed);
        } catch (e) {
            // ignore
        }

        // Listen for sidebar toggle events
        const handleToggleEvent = () => {
            const v = window.localStorage.getItem("sidebarCollapsed");
            setCollapsed(v === "1");
        };

        window.addEventListener("sidebarToggle", handleToggleEvent);
        return () => {
            window.removeEventListener("sidebarToggle", handleToggleEvent);
        };
    }, []);

    const basePath =
        role === "ADMIN"
            ? "/admin"
            : role === "MANAGER"
                ? "/manager"
                : "/cashier";

    // 🔹 Role label
    const roleLabel =
        role === "ADMIN"
            ? "Administrator"
            : role === "MANAGER"
                ? "Manager"
                : "Cashier";

    // 🔹 Logout handler
    const handleLogout = async () => {
        try {
            // Call logout API
            await axiosInstance.post("/api/login/logout");

            // Remove token from localStorage
            localStorage.removeItem("login-token");

            // Remove token from cookies
            document.cookie = "login-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            // Show success message
            toast.success("Logged out successfully");

            // Redirect to login page
            setTimeout(() => {
                window.location.href = "/login";
            }, 500);
        } catch (error: any) {
            console.error("Logout error:", error);

            // Even if API fails, clear local data and redirect
            localStorage.removeItem("login-token");
            document.cookie = "login-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            toast.error("Logout failed, but clearing session");
            setTimeout(() => {
                window.location.href = "/login";
            }, 500);
        }
    };

    const userMenuItems: MenuItem[] = [
        {
            label: "Profile",
            icon: "pi pi-user",
            command: () => {
                window.location.href = "/dashboard/profile";
            },
        },
        { separator: true },
        {
            label: "Update Password",
            icon: "pi pi-lock",
            command: () => {
                window.location.href = "/dashboard/update-password";
            },
        },
        { separator: true },
        {
            label: "Log out",
            icon: "pi pi-sign-out",
            command: handleLogout,
        },
    ];

    // 🔹 Role-based title
    const pageTitle =
        role === "ADMIN"
            ? "Admin Dashboard"
            : role === "MANAGER"
                ? "Manager Dashboard"
                : "Cashier Panel";





    const toggleSidebar = () => {
        try {
            const next = !collapsed;
            setCollapsed(next);
            window.localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
            // Dispatch custom event to notify Sidebar component
            window.dispatchEvent(new Event('sidebarToggle'));
        } catch (e) {
            console.log('Error toggling sidebar', e);
        }
    };



    return (
        <nav
            style={{
                background: "linear-gradient(90deg, #ffffff, #f8fafc)",
                borderBottom: "1px solid #e5e7eb",
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                position: "fixed",
                top: 0,
                left: collapsed ? "80px" : "280px",
                right: 5,
                height: "72px",
                transition: "left 0.3s",
                zIndex: 999,
            }}
        >
            {/* LEFT SECTION */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Button
                    icon="pi pi-bars"
                    rounded
                    text
                    severity="secondary"
                    onClick={toggleSidebar}
                />

                <div>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                        {pageTitle}
                    </h1>
                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                        Welcome back, manage your operations
                    </p>
                </div>
            </div>

            {/* RIGHT SECTION */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Notifications */}
                {/* <Button
                    icon="pi pi-bell"
                    rounded
                    text
                    severity="secondary"
                    badge="3"
                    badgeClassName="p-badge-danger"
                /> */}

                {/* Messages */}
                {/* <Button
                    icon="pi pi-envelope"
                    rounded
                    text
                    severity="secondary"
                    badge="5"
                    badgeClassName="p-badge-info"
                /> */}

                <div
                    style={{
                        width: 1,
                        height: 32,
                        background: "#e5e7eb",
                        margin: "0 8px",
                    }}
                />

                {/* USER */}
                <div>
                    <Menu className="" model={userMenuItems} popup ref={menuRef} />
                    <div
                        onClick={(e) => menuRef.current?.toggle(e)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "6px 12px",
                            borderRadius: 12,
                            cursor: "pointer",
                        }}
                    >
                        <Avatar image={user.image} shape="circle" />

                        <div>
                            <div style={{ fontWeight: 600 }}>{user.name}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {roleLabel}
                            </div>
                        </div>

                        <i className="pi pi-chevron-down" />
                    </div>
                </div>
            </div>
        </nav>

    );
};

export default Navbar;