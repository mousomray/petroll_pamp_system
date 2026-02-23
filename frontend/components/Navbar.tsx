"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";



interface NavbarProps {
    role: "admin" | "manager" | "cashier";
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
        role === "admin"
            ? "/admin"
            : role === "manager"
                ? "/manager"
                : "/cashier";

    // 🔹 Role label
    const roleLabel =
        role === "admin"
            ? "Administrator"
            : role === "manager"
                ? "Manager"
                : "Cashier";


    const userMenuItems: MenuItem[] = [
        {
            label: "Profile",
            icon: "pi pi-user",
            command: () => {
                window.location.href = `${basePath}/profile`;
            },
        },
        { separator: true },
        {
            label: "Update Password",
            icon: "pi pi-lock",
            command: () => {
                window.location.href = `${basePath}/updatepassword`;
            },
        },
        { separator: true },
        {
            label: "Log out",
            icon: "pi pi-sign-out",
            command: () => {
                window.location.href = `${basePath}/logout`;
            },
        },
    ];

    // 🔹 Role-based title
    const pageTitle =
        role === "admin"
            ? "Admin Dashboard"
            : role === "manager"
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
                right: 0,
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
                <Button
                    icon="pi pi-bell"
                    rounded
                    text
                    severity="secondary"
                    badge="3"
                    badgeClassName="p-badge-danger"
                />

                {/* Messages */}
                <Button
                    icon="pi pi-envelope"
                    rounded
                    text
                    severity="secondary"
                    badge="5"
                    badgeClassName="p-badge-info"
                />

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