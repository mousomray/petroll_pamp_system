"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { formatDate } from "@/helper/DateTime";

type Totals = {
  totalUsers: number;
  totalWorkers: number;
  totalProducts: number;
  totalTanks: number;
  totalNozzles: number;
  totalSuppliers: number;
  totalPurchases: number;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  totalStockQuantity: number;
  todayPurchaseAmount: number;
  monthlyPurchaseAmount: number;
};

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/dashboard/dashboard-stats");
      const data = res.data?.data?.admin;
      if (data) {
        setTotals(data.totals || null);
        setRecentPurchases(data.recentPurchases || []);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to load dashboard stats");
      else toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const ColorfulStatCard = ({
    title,
    value,
    icon,
    gradient,
    note,
  }: {
    title: string;
    value: string | number;
    icon: string;
    gradient: string;
    note?: string;
  }) => (
    <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 ${gradient} transform hover:scale-105 transition-transform duration-300`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-white opacity-10"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="text-white/80 text-xs sm:text-sm font-medium">{title}</div>
          <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg sm:rounded-xl">
            <i className={`${icon} text-white text-lg sm:text-2xl`}></i>
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
        {note && <div className="text-xs text-white/70 mt-1 sm:mt-2">{note}</div>}
      </div>
    </div>
  );

  const DonutChart = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <svg width="100" height="100" viewBox="0 0 120 120" className="transform -rotate-90 w-20 h-20 sm:w-28 sm:h-28">
          <circle cx="60" cy="60" r="40" stroke="#e5e7eb" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="40"
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="text-center mt-1 sm:mt-2">
          <div className="text-xl sm:text-2xl font-bold" style={{ color }}>{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    );
  };

  const BarChart = ({ items, labels, colors }: { items: number[]; labels: string[]; colors: string[] }) => {
    const max = Math.max(...items, 1);
    return (
      <div className="space-y-3">
        {items.map((v, i) => {
          const percentage = (v / max) * 100;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{labels[i]}</span>
                <span className="font-bold" style={{ color: colors[i] }}>{v}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%`, backgroundColor: colors[i] }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <i className="pi pi-refresh text-blue-600"></i>
          <span className="text-gray-700 font-medium">Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <ColorfulStatCard
          title="Total Users"
          value={totals?.totalUsers ?? "—"}
          icon="pi pi-users"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <ColorfulStatCard
          title="Workers"
          value={totals?.totalWorkers ?? "—"}
          icon="pi pi-user"
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <ColorfulStatCard
          title="Products"
          value={totals?.totalProducts ?? "—"}
          icon="pi pi-box"
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <ColorfulStatCard
          title="Tanks"
          value={totals?.totalTanks ?? "—"}
          icon="pi pi-database"
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <ColorfulStatCard
          title="Suppliers"
          value={totals?.totalSuppliers ?? "—"}
          icon="pi pi-building"
          gradient="bg-gradient-to-br from-pink-500 to-pink-600"
        />
        <ColorfulStatCard
          title="Nozzles"
          value={totals?.totalNozzles ?? "—"}
          icon="pi pi-compass"
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-dollar text-2xl sm:text-3xl"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm opacity-90">Total Purchase Amount</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold">₹{totals?.totalPurchaseAmount?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-calendar text-2xl sm:text-3xl"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm opacity-90">Today's Purchase</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold">₹{totals?.todayPurchaseAmount?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-chart-line text-2xl sm:text-3xl"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm opacity-90">Monthly Purchase</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold">₹{totals?.monthlyPurchaseAmount?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Purchases */}
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
              <i className="pi pi-shopping-cart text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Recent Purchases</h3>
          </div>
          {recentPurchases.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <i className="pi pi-inbox text-4xl sm:text-5xl mb-2 sm:mb-3"></i>
              <div className="text-sm sm:text-base">No recent purchases</div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {recentPurchases.map((p, idx) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-blue-100 text-blue-600 font-bold w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">{p.invoiceNo}</div>
                      <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                        <i className="pi pi-calendar text-xs"></i>
                        {formatDate(p.purchaseDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base sm:text-xl font-bold text-gray-800">₹{p.totalAmount?.toLocaleString()}</div>
                    <div
                      className={`text-xs font-semibold px-2 sm:px-3 py-1 rounded-full ${
                        p.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.paymentStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="space-y-4 sm:space-y-6">
          {/* Donut Charts */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg">
                <i className="pi pi-chart-pie text-white text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <DonutChart
                value={totals?.totalUsers ?? 0}
                max={Math.max(totals?.totalUsers ?? 1, 10)}
                label="Users"
                color="#3b82f6"
              />
              <DonutChart
                value={totals?.totalWorkers ?? 0}
                max={Math.max(totals?.totalWorkers ?? 1, 10)}
                label="Workers"
                color="#10b981"
              />
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                <i className="pi pi-chart-bar text-white text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Inventory</h3>
            </div>
            {totals ? (
              <BarChart
                items={[totals.totalProducts, totals.totalTanks, totals.totalNozzles, totals.totalSuppliers]}
                labels={["Products", "Tanks", "Nozzles", "Suppliers"]}
                colors={["#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"]}
              />
            ) : (
              <div className="text-gray-400 text-center py-4">Loading...</div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" />
    </div>
  );
}