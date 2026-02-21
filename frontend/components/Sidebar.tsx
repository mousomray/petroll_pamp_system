"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";
import { Divider } from "primereact/divider";
import Image from "next/image";

// PrimeReact styles
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("sidebarCollapsed");
      const isCollapsed = v === "1";
      setCollapsed(isCollapsed);
    } catch (e) {
      console.log("Error loading sidebar state", e);
    }

    // Listen for sidebar toggle events from Navbar
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sidebarCollapsed") {
        setCollapsed(e.newValue === "1");
      }
    };

    const handleToggleEvent = () => {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("sidebarToggle", handleToggleEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebarToggle", handleToggleEvent);
    };
  }, []);

  const sections = [
    {
      title: "Main",
      icon: "pi-th-large",
      items: [
        { href: "/admin", icon: "pi-home", label: "Dashboard", badge: null },
        { href: "/admin/sales", icon: "pi-shopping-cart", label: "Sales", badge: "12" },
        { href: "/admin/purchases", icon: "pi-box", label: "Purchases", badge: null },
      ],
    },
    {
      title: "Accounting",
      icon: "pi-wallet",
      items: [
        { href: "/admin/cashbook", icon: "pi-book", label: "Cashbook", badge: null },
        { href: "/admin/invoices", icon: "pi-file", label: "Invoices", badge: "5" },
        { href: "/admin/customers", icon: "pi-users", label: "Customers", badge: null },
        { href: "/admin/suppliers", icon: "pi-truck", label: "Suppliers", badge: null },
      ],
    },
    {
      title: "Management",
      icon: "pi-cog",
      items: [
        { href: "/admin/inventory", icon: "pi-database", label: "Inventory", badge: null },
        { href: "/admin/reports", icon: "pi-chart-bar", label: "Reports", badge: null },
        { href: "/admin/settings", icon: "pi-sliders-h", label: "Settings", badge: null },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      id="sidebar"
      style={{
        background: "linear-gradient(180deg, #023040 0%, #072033 50%, #0a1929 100%)",
        height: "100vh",
        width: collapsed ? "80px" : "280px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "4px 0 12px rgba(0,0,0,0.15)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
        overflowX: "hidden",
      }}
      aria-label="Sidebar"
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "20px 16px",
          background: "rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
            }}
          >
            <i className="pi pi-bolt" style={{ color: "#fff", fontSize: 24 }} />
          </div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: 0.3 }}>
                PetrolPump OPS
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
                Accounting Panel
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Section */}
      {!collapsed && (
        <div
          style={{
            padding: "16px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Avatar
              image="/img/avatars/avatar-2.jpg"
              size="large"
              shape="circle"
              style={{ border: "2px solid rgba(255,255,255,0.2)" }}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Admin User</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
                petrol@company.com
              </div>
            </div>
            <i className="pi pi-ellipsis-v" style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }} />
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 12px" }}>
        {sections.map((sec, secIdx) => (
          <div key={sec.title} style={{ marginBottom: 24 }}>
            {!collapsed && (
              <div
                style={{
                  padding: "8px 12px",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i className={`pi ${sec.icon}`} style={{ fontSize: 13 }} />
                <span>{sec.title}</span>
              </div>
            )}
            
            {collapsed && secIdx > 0 && (
              <div style={{ margin: "12px 0", height: 1, background: "rgba(255,255,255,0.1)" }} />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sec.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: collapsed ? "12px" : "12px 16px",
                      borderRadius: 10,
                      color: active ? "#fff" : "rgba(255,255,255,0.7)",
                      background: active
                        ? "linear-gradient(90deg, rgba(14,165,233,0.2), rgba(6,182,212,0.15))"
                        : "transparent",
                      border: active ? "1px solid rgba(14,165,233,0.3)" : "1px solid transparent",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                      justifyContent: collapsed ? "center" : "flex-start",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          background: "linear-gradient(180deg, #0ea5e9, #06b6d4)",
                          borderRadius: "0 4px 4px 0",
                        }}
                      />
                    )}
                    <i
                      className={`pi ${item.icon}`}
                      style={{
                        fontSize: 18,
                        color: active ? "#0ea5e9" : "rgba(255,255,255,0.6)",
                      }}
                    />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1, fontWeight: active ? 600 : 500, fontSize: 14 }}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <Badge
                            value={item.badge}
                            severity="info"
                            style={{
                              background: active ? "#0ea5e9" : "rgba(255,255,255,0.15)",
                              color: "#fff",
                              minWidth: 24,
                              height: 20,
                              fontSize: 11,
                            }}
                          />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="pi pi-info-circle" style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Version</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>1.0.0</div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;