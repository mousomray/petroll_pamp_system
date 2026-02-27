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
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { formatDate } from "@/helper/DateTime";
import TankForm from "@/components/tank/TankForm";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">⛽</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Tanks Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any tanks yet. Once you create a tank, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [tankData, setTankData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedTank, setSelectedTank] = useState<any | null>(null);
  const [editTankId, setEditTankId] = useState<string | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  /* ================= FETCH TANKS (server-side pagination) ================= */
  // fetch when page, rows or debounced search change
  useEffect(() => {
    fetchTankData();
  }, [pagination.page, pagination.rows, debouncedSearch]);

  // debounce searchInput -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // when debounced search changes reset to first page
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const fetchTankData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/tank/all-tanks", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setTankData(res.data.tanks || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.total || 0,
      }));
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

  /* ================= ACTIONS ================= */
  const handleAddTank = () => {
    setEditTankId(null);
    setSelectedTank(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: any) => {
    setEditTankId(rowData._id);
    setSelectedTank(rowData);
    setVisible(true);
  };

  const toggleTankStatus = async (rowData: any) => {
    try {
      const res = await axiosInstance.patch(
        `/api/tank/toggle-status/${rowData._id}`,
        {
        isActive: !rowData.isActive
      }
      );
      toast.success(res.data.message || "Status updated successfully");
      await fetchTankData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.tankName}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/tank/delete-tank/${rowData._id}`
          );
          toast.success(res.data.message || "Tank deleted successfully");
          await fetchTankData();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  /* ================= COLUMN TEMPLATES ================= */
  const imageTemplate = (rowData: any) => {
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
        "bg-teal-500",
        "bg-orange-500",
      ];
      if (!str) return colors[0];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const initials = getInitials(rowData?.tankName || "");
    const bgClass = stringToBg(rowData?.tankName || "");

    return (
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${bgClass}`}>
        {initials}
      </div>
    );
  };

  const statusTemplate = (rowData: any) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        rowData.isActive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {rowData.isActive ? "Active" : "Inactive"}
    </span>
  );

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        aria-label="More actions"
        onClick={(e) => showRowMenu(e, rowData)}
      />
    </div>
  );

  const showRowMenu = (event: any, rowData: any) => {
    event.stopPropagation();
    setSelectedTank(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedTank) handleUpdate(selectedTank);
      },
    },
    {
      label: selectedTank?.isActive ? "Deactivate" : "Activate",
      icon: selectedTank?.isActive ? "pi pi-times-circle" : "pi pi-check-circle",
      command: () => {
        if (selectedTank) toggleTankStatus(selectedTank);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedTank) confirmDelete(selectedTank);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Tanks</h2>
        <p className="text-sm text-black">Manage fuel tanks</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tank"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Tank"
          icon="pi pi-plus"
          onClick={handleAddTank}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const EditTankHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-database text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Edit Tank</h2>
        <p className="text-sm text-white/90">Update tank information</p>
      </div>
    </div>
  );

  const AddTankHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-database text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Add New Tank</h2>
        <p className="text-sm text-white/90">Create a new fuel tank</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={tankData}
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
          <Column header="Avatar" body={imageTemplate} />
          <Column field="tankName" header="Tank Name" sortable />
          <Column field="capacity" header="Capacity" body={(row: any) => `${row.capacity?.toLocaleString() || 0} L`} />
          <Column field="currentQuantity" header="Current Qty" body={(row: any) => `${row.currentQuantity?.toLocaleString() || 0} L`} />
          <Column header="Status" body={statusTemplate} />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog 
          header={editTankId ? EditTankHeader : AddTankHeader} 
          visible={visible} 
          style={{ width: "50vw" }} 
          onHide={() => {
            setVisible(false);
            setEditTankId(null);
            setSelectedTank(null);
          }}
        >
          <TankForm
            tankId={editTankId}
            onClose={() => {
              setVisible(false);
              setEditTankId(null);
              setSelectedTank(null);
            }}
            onSuccess={() => {
              fetchTankData();
              setVisible(false);
              setEditTankId(null);
              setSelectedTank(null);
            }}
          />
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;
