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
import NozzleForm from "@/components/nozzle/NozzleForm";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">⛽</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Nozzle Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any nozzles yet. Once you create a nozzle, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [nozzleData, setNozzleData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedNozzle, setSelectedNozzle] = useState<any | null>(null);
  const [editNozzleId, setEditNozzleId] = useState<string | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  /* ================= FETCH NOZZLES (server-side pagination) ================= */
  useEffect(() => {
    nozzleDataGet();
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

  const nozzleDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/nozzle/all-nozzles", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setNozzleData(res.data.nozzles || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalNozzles || 0,
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
  const handleAddNozzle = () => {
    setEditNozzleId(null);
    setSelectedNozzle(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: any) => {
    setEditNozzleId(rowData._id);
    setSelectedNozzle(rowData);
    setVisible(true);
  };

  const toggleNozzleStatus = async (rowData: any) => {
    try {
      const res = await axiosInstance.patch(
        `/api/nozzle/toggle-status/${rowData._id}`
      );
      toast.success(res.data.message || "Status updated successfully");
      await nozzleDataGet();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete nozzle "${rowData.nozzleNumber}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/nozzle/delete-nozzle/${rowData._id}`
          );
          toast.success(res.data.message || "Nozzle deleted successfully");
          await nozzleDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  /* ================= COLUMN TEMPLATES ================= */
  const statusTemplate = (rowData: any) => (
    // Prefer explicit `status` field; fall back to `isActive` for older records
    (() => {
      const status = rowData.status ?? (rowData.isActive ? "ACTIVE" : "INACTIVE");
      const map: Record<string, { label: string; cls: string }> = {
        ACTIVE: { label: "Active", cls: "bg-green-100 text-green-800" },
        INACTIVE: { label: "Inactive", cls: "bg-red-100 text-red-800" },
        MAINTENANCE: { label: "Maintenance", cls: "bg-amber-100 text-amber-800" },
      };
      const info = map[status] || map.INACTIVE;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.cls}`}>
          {info.label}
        </span>
      );
    })()
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
    setSelectedNozzle(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedNozzle) handleUpdate(selectedNozzle);
      },
    },
    {
      label: selectedNozzle?.status === "ACTIVE" || (selectedNozzle?.isActive === true)
        ? "Deactivate"
        : "Activate",
      icon:
        selectedNozzle?.status === "ACTIVE" || (selectedNozzle?.isActive === true)
          ? "pi pi-times-circle"
          : "pi pi-check-circle",
      command: () => {
        if (selectedNozzle) toggleNozzleStatus(selectedNozzle);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedNozzle) confirmDelete(selectedNozzle);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Nozzles</h2>
        <p className="text-sm text-black">Manage fuel nozzles</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search nozzle"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Nozzle"
          icon="pi pi-plus"
          onClick={handleAddNozzle}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const EditNozzleHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-pencil text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Edit Nozzle</h2>
        <p className="text-sm text-white/90">Update nozzle information</p>
      </div>
    </div>
  );

  const AddNozzleHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-plus text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Add New Nozzle</h2>
        <p className="text-sm text-white/90">Create a new fuel nozzle</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={nozzleData}
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
          <Column field="nozzleNumber" header="Nozzle Number" sortable />
          <Column
  header="Tank Name"
  body={(rowData: any) => rowData.tank?.tankName || "N/A"}
/>
          <Column field="machineName" header="Machine Name" />
          <Column header="Status" body={statusTemplate} />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog
          header={editNozzleId ? EditNozzleHeader : AddNozzleHeader}
          visible={visible}
          style={{ width: "50vw" }}
          onHide={() => {
            setVisible(false);
            setEditNozzleId(null);
            setSelectedNozzle(null);
          }}
        >
          <NozzleForm
            nozzleId={editNozzleId}
            onClose={() => {
              setVisible(false);
              setEditNozzleId(null);
              setSelectedNozzle(null);
            }}
            onSuccess={() => {
              nozzleDataGet();
              setVisible(false);
              setEditNozzleId(null);
              setSelectedNozzle(null);
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