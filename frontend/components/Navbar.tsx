"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";

// PrimeReact styles
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

interface NavbarProps {
    user: {
        name: string;
        image: string;
    };
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
    const [collapsed, setCollapsed] = useState<boolean>(false);

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

    const menuRef = React.useRef<Menu>(null);

    const userMenuItems: MenuItem[] = [
        {
            label: 'Profile',
            icon: 'pi pi-user',
            command: () => { window.location.href = '/admin/profile'; }
        },
        { separator: true },
        {
            label: 'Update Password',
            icon: 'pi pi-lock',
            command: () => { window.location.href = '/admin/updatepassword'; }
        },
        { separator: true },
        {
            label: 'Log out',
            icon: 'pi pi-sign-out',
            command: () => { window.location.href = '/admin/adminlogout'; }
        }
    ];

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
                zIndex: 999,
                transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                height: "72px",
            }}
        >
            {/* Left Section - Toggle Button */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Button
                    icon={collapsed ? "pi pi-bars" : "pi pi-times"}
                    rounded
                    text
                    severity="secondary"
                    aria-label="Toggle sidebar"
                    onClick={toggleSidebar}
                    style={{
                        width: 44,
                        height: 44,
                        color: "#023040",
                    }}
                    tooltip={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    tooltipOptions={{ position: "bottom" }}
                />
                <div>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#023040" }}>
                        Dashboard
                    </h1>
                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                        Welcome back, manage your operations
                    </p>
                </div>
            </div>

            {/* Right Section - Actions & User */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Notifications */}
                <Button
                    icon="pi pi-bell"
                    rounded
                    text
                    severity="secondary"
                    aria-label="Notifications"
                    style={{ position: "relative", width: 44, height: 44 }}
                    badge="3"
                    badgeClassName="p-badge-danger"
                />

                {/* Messages */}
                <Button
                    icon="pi pi-envelope"
                    rounded
                    text
                    severity="secondary"
                    aria-label="Messages"
                    style={{ width: 44, height: 44 }}
                    badge="5"
                    badgeClassName="p-badge-info"
                />

                {/* Divider */}
                <div
                    style={{
                        width: 1,
                        height: 32,
                        background: "#e5e7eb",
                        margin: "0 8px",
                    }}
                />

                {/* User Menu */}
                <div>
                    <Menu model={userMenuItems} popup ref={menuRef} />
                    <div
                        onClick={(e) => menuRef.current?.toggle(e)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "6px 12px",
                            borderRadius: 12,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            border: "1px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(2,48,64,0.04)";
                            e.currentTarget.style.borderColor = "rgba(2,48,64,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "transparent";
                        }}
                    >
                        <Avatar
                            image={user.image}
                            shape="circle"
                            size="normal"
                            style={{ width: 40, height: 40 }}
                        />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "#023040" }}>
                                {user.name}
                            </span>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>Administrator</span>
                        </div>
                        <i className="pi pi-chevron-down" style={{ color: "#6b7280", fontSize: 12 }} />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;