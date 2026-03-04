"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";

// ---------------- TYPES ----------------

type SidebarProps = {
  role: "ADMIN" | "MANAGER" | "CASHIER";
  user: {
    name: string;
    image: string;
    email: string;
  };
};

type MenuItem = {
  label: string;
  icon?: string;
  href?: string;
  badge?: string | null;
  children?: {
    href: string;
    label: string;
    icon?: string;
  }[];
};

type Section = {
  title: string;
  items: MenuItem[];
};

// ---------------- COMPONENT ----------------

const Sidebar: React.FC<SidebarProps> = ({ role, user }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Load collapsed state
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    } catch (e) {
      console.log("Error loading sidebar state", e);
    }

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

  // ---------------- ADMIN ----------------

  const adminSections: Section[] = [
    {
      title: "Management",
      items: [
        {
          label: "User Management",
          icon: "pi-users",
          children: [
            {
              href: "/dashboard/users",
              label: "Users",
              icon: "pi-user",
            },
            {
              href: "/dashboard/workers",
              label: "Workers",
              icon: "pi-id-card",
            }
          ],
        },
        {
          label: "Worker Management",
          icon: "pi-id-card",
          children: [
            {
              href: "/dashboard/shifts",
              label: "Shifts",
              icon: "pi-clock",
            },
            {
              href: "/dashboard/workers",
              label: "Workers",
              icon: "pi-id-card",
            }
          ],
        },
      ],
    },
    {
      title: "Inventory",
      items: [
        {
          label: "Products",
          icon: "pi-box",
          children: [
            {
              href: "/dashboard/products",
              label: "All Products",
              icon: "pi-list",
            },
            {
              href: "/dashboard/suppliers",
              label: "Suppliers",
              icon: "pi-truck",
            },
            {
              href: "/dashboard/tanks",
              label: "Tanks",
              icon: "pi-database"
            },
            {
              href: "/dashboard/purchases",
              label: "Purchases",
              icon: "pi-shopping-cart"
            },
            {
              href: "/dashboard/nozzles",
              label: "Nozzles",
              icon: "pi-sliders-h"
            }
          ],
        },
        {
          label: "Stock",
          icon: "pi-database",
          children: [
            {
              href: "/dashboard/opening-stock",
              label: "Opening Stock",
              icon: "pi-chart-bar",
            },
            {
              href: "/dashboard/current-stock",
              label: "Current Stock",
              icon: "pi-chart-bar",
            }
          ],
        },
      ],
    },
  ];

  // ---------------- MANAGER ----------------

  const managerSections: Section[] = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", icon: "pi-home", href: "/manager" },
        { label: "Sales", icon: "pi-shopping-cart", href: "/manager/sales" },
        {
          label: "Inventory",
          icon: "pi-database",
          children: [
            {
              href: "/manager/inventory/stock",
              label: "Stock Report",
              icon: "pi-chart-bar",
            },
          ],
        },
      ],
    },
  ];

  // ---------------- CASHIER ----------------

  const cashierSections: Section[] = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", icon: "pi-home", href: "/cashier" },
        { label: "New Sale", icon: "pi-shopping-cart", href: "/cashier/sales" },
        {
          label: "Meter Entry",
          icon: "pi-sliders-h",
          href: "/cashier/meter-reading",
        },
      ],
    },
  ];

  let sections: Section[] = [];
  if (role === "ADMIN") sections = adminSections;
  if (role === "MANAGER") sections = managerSections;
  if (role === "CASHIER") sections = cashierSections;

  // ---------------- UI ----------------

  return (
    <nav
      style={{
        width: collapsed ? "80px" : "280px",
        background: "#0f172a",
        color: "#fff",
        height: "100vh",
        position: "fixed",
        transition: "width 0.3s",
        paddingTop: 20,
        overflowY: "auto",
      }}
    >
      {/* HEADER */}
      <div style={{ padding: "0 20px", marginBottom: 20 }}>
        {!collapsed && <h2 style={{ margin: 0 }}>Petrol Pump ERP</h2>}
      </div>

      {/* USER */}
      {!collapsed && (
        <div style={{ padding: "0 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Avatar image={user.image} shape="circle" />
            <div>
              <div style={{ fontWeight: 600 }}>
                {user.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU */}
      <div style={{ padding: "0 10px" }}>
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 20 }}>
            {!collapsed && (
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
                {sec.title}
              </div>
            )}

            {sec.items.map((item) => {
              const hasChildren = !!item.children;
              const active = isActive(item.href);
              const isOpen = openMenus[item.label];

              return (
                <div key={item.label}>
                  {/* DIRECT LINK */}
                  {item.href && !hasChildren ? (
                    <Link
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px",
                        borderRadius: 6,
                        textDecoration: "none",
                        color: active ? "#38bdf8" : "#cbd5e1",
                        background: active
                          ? "rgba(56,189,248,0.1)"
                          : "transparent",
                        marginBottom: 4,
                      }}
                    >
                      {item.icon && <i className={`pi ${item.icon}`} />}
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {item.badge && <Badge value={item.badge} />}
                        </>
                      )}
                    </Link>
                  ) : (
                    /* PARENT MENU */
                    <div
                      onClick={() => hasChildren && toggleMenu(item.label)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: "#cbd5e1",
                        marginBottom: 4,
                      }}
                    >
                      {item.icon && <i className={`pi ${item.icon}`} />}
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {hasChildren && (
                            <i
                              className={`pi ${isOpen
                                ? "pi-chevron-down"
                                : "pi-chevron-right"
                                }`}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* CHILDREN */}
                  {hasChildren && isOpen && !collapsed && (
                    <div style={{ marginLeft: 30 }}>
                      {item.children!.map((child) => {
                        const subActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px",
                              borderRadius: 6,
                              fontSize: 13,
                              textDecoration: "none",
                              color: subActive ? "#38bdf8" : "#94a3b8",
                              background: subActive
                                ? "rgba(56,189,248,0.1)"
                                : "transparent",
                              marginBottom: 4,
                            }}
                          >
                            {child.icon && (
                              <i className={`pi ${child.icon}`} />
                            )}
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;