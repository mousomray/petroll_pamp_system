"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import ShiftForm from "@/components/shifts/ShiftForm";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">🕐</div>
    <h2 className="text-xl font-semibold text-gray-700">No Shifts Available</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      No shifts have been started yet. Once a shift is started, it will appear here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    shiftDataGet();
  }, [pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const shiftDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/shift/all-shifts", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setShiftData(res.data.data || []);
      setPagination((prev) => ({ ...prev, total: res.data.total || 0 }));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  /* column templates */
  const workerTemplate = (rowData: any) => {
    const worker = rowData.worker;
    if (!worker) return <span className="text-gray-400">N/A</span>;

    const getInitials = (name?: string) => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const stringToBg = (str?: string) => {
      const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-red-500",
        "bg-yellow-500",
        "bg-indigo-500",
        "bg-pink-500",
      ];
      if (!str) return colors[0];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const initials = getInitials(worker.name || "");
    const bgClass = stringToBg(worker.name || "");

    return (
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${bgClass}`}>
          {initials}
        </div>
        <div>
          <div className="font-semibold text-gray-800">{worker.name}</div>
          <div className="text-xs text-gray-500">{worker.workerType}</div>
        </div>
      </div>
    );
  };

  const statusTemplate = (rowData: any) => {
    const statusColors: Record<string, string> = {
      OPEN: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
      PENDING: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[rowData.status] || "bg-gray-100 text-gray-800"}`}>
        {rowData.status}
      </span>
    );
  };

  const shortageTypeTemplate = (rowData: any) => {
    const typeColors: Record<string, string> = {
      NONE: "bg-blue-100 text-blue-800",
      SHORTAGE: "bg-red-100 text-red-800",
      EXCESS: "bg-green-100 text-green-800",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[rowData.shortageType] || "bg-gray-100 text-gray-800"}`}>
        {rowData.shortageType}
      </span>
    );
  };

  const amountTemplate = (field: string) => (rowData: any) => (
    <span className="font-semibold text-gray-800">₹{rowData[field]?.toLocaleString() || 0}</span>
  );

  const dateTemplate = (field: string) => (rowData: any) => (
    <div className="text-sm">
      <div className="text-gray-800">{formatDate(rowData[field])}</div>
      <div className="text-xs text-gray-500">{new Date(rowData[field]).toLocaleTimeString()}</div>
    </div>
  );

  const handleAddShift = () => {
    setVisible(true);
  };

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Shifts</h2>
        <p className="text-sm text-black">Manage worker shifts</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search shifts"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Shift"
          icon="pi pi-plus"
          onClick={handleAddShift}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const AddShiftHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-clock text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Shift</h2>
        <p className="text-sm text-white/90">Assign a worker to start a new shift</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={shiftData}
          header={header}
          lazy
          paginator
          first={(pagination.page - 1) * pagination.rows}
          rows={pagination.rows}
          totalRecords={pagination.total}
          loading={loading}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPage={(e) =>
            setPagination((prev) => ({
              ...prev,
              page: (e.page ?? 0) + 1,
              rows: e.rows ?? prev.rows,
            }))
          }
          responsiveLayout="scroll"
          emptyMessage={EmptyState}
        >
          <Column header="Worker" body={workerTemplate} style={{ minWidth: "200px" }} />
          <Column header="Shift Start" body={dateTemplate("shiftStart")} sortable style={{ minWidth: "150px" }} />
          <Column header="Cash" body={amountTemplate("cashCollected")} style={{ minWidth: "100px" }} />
          <Column header="Online" body={amountTemplate("onlineCollected")} style={{ minWidth: "100px" }} />
          <Column header="Shortage/Excess" body={amountTemplate("shortageOrExcess")} style={{ minWidth: "120px" }} />
          <Column header="Type" body={shortageTypeTemplate} style={{ minWidth: "100px" }} />
          <Column header="Status" body={statusTemplate} style={{ minWidth: "100px" }} />
          <Column header="Created" body={dateTemplate("createdAt")} style={{ minWidth: "150px" }} />
        </DataTable>

        <Dialog
          header={AddShiftHeader}
          visible={visible}
          style={{ width: "50vw" }}
          breakpoints={{ "960px": "75vw", "641px": "95vw" }}
          onHide={() => setVisible(false)}
        >
          <ShiftForm
            onClose={() => setVisible(false)}
            onSuccess={() => {
              shiftDataGet();
              setVisible(false);
            }}
          />
        </Dialog>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;