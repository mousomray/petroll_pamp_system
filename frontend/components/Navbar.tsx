"use client";

import React, { useEffect, useState } from "react";

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
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed', isCollapsed);
            document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        } catch (e) {
            // ignore
        }
    }, []);

    const toggleSidebar = () => {
        try {
            const next = !collapsed;
            setCollapsed(next);
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed', next);
            document.body.classList.toggle('sidebar-collapsed', next);
            window.localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
        } catch (e) {
            // ignore
        }
    };

    return (
        <nav className="navbar navbar-expand navbar-light navbar-bg">
            <button
                className="sidebar-toggle js-sidebar-toggle"
                type="button"
                aria-label="Toggle sidebar"
                aria-expanded={collapsed}
                onClick={toggleSidebar}
            >
                <i className="hamburger align-self-center"></i>
            </button>

            <div className="navbar-collapse collapse">
                <ul className="navbar-nav navbar-align">
                    {/* Alerts Dropdown */}
                    <li className="nav-item dropdown">
                        <a
                            className="nav-icon dropdown-toggle"
                            href="#"
                            id="alertsDropdown"
                            data-bs-toggle="dropdown"
                        ></a>
                        <div
                            className="dropdown-menu dropdown-menu-lg dropdown-menu-end py-0"
                            aria-labelledby="alertsDropdown"
                        ></div>
                    </li>

                    {/* Messages Dropdown */}
                    <li className="nav-item dropdown">
                        <div
                            className="dropdown-menu dropdown-menu-lg dropdown-menu-end py-0"
                            aria-labelledby="messagesDropdown"
                        >
                            <div className="list-group">
                                {/* Example message */}
                                <a href="#" className="list-group-item">
                                    <div className="row g-0 align-items-center">
                                        <div className="col-2">
                                            <img
                                                src="/img/avatars/avatar-5.jpg"
                                                className="avatar img-fluid rounded-circle"
                                                alt="Vanessa Tucker"
                                            />
                                        </div>
                                        <div className="col-10 ps-2">
                                            <div className="text-dark">Vanessa Tucker</div>
                                            <div className="text-muted small mt-1">
                                                Nam pretium turpis et arcu. Duis arcu tortor.
                                            </div>
                                            <div className="text-muted small mt-1">15m ago</div>
                                        </div>
                                    </div>
                                </a>
                                {/* Add more messages similarly */}
                            </div>
                            <div className="dropdown-menu-footer">
                                <a href="#" className="text-muted">
                                    Show all messages
                                </a>
                            </div>
                        </div>
                    </li>

                    {/* User Dropdown */}
                    <li className="nav-item dropdown">
                        <a
                            className="nav-icon dropdown-toggle d-inline-block d-sm-none"
                            href="#"
                            data-bs-toggle="dropdown"
                        >
                            <i className="align-middle" data-feather="settings"></i>
                        </a>

                        <a
                            className="nav-link dropdown-toggle d-none d-sm-inline-block"
                            href="#"
                            data-bs-toggle="dropdown"
                        >
                            <img
                                src={user.image}
                                className="avatar img-fluid rounded me-1"
                                alt={user.name}
                            />
                            <span className="text-dark">{user.name}</span>
                        </a>

                        <div className="dropdown-menu dropdown-menu-end">
                            <a className="dropdown-item" href="/admin/profile">
                                <i className="align-middle me-1" data-feather="user"></i> Profile
                            </a>
                            <div className="dropdown-divider"></div>
                            <a className="dropdown-item" href="/admin/updatepassword">
                                Update Password
                            </a>
                            <div className="dropdown-divider"></div>
                            <a className="dropdown-item" href="/admin/adminlogout">
                                Log out
                            </a>
                        </div>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;