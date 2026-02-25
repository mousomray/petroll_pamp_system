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
import SupplierForm from "@/components/supplier/SupplierForm";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">🏢</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Supplier Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any suppliers yet. Once you create a supplier, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [supplierData, setSupplierData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  /* ================= FETCH SUPPLIERS (server-side pagination) ================= */
  // fetch when page, rows or debounced search change
  useEffect(() => {
    supplierDataGet();
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

  const supplierDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/supplier/all-supplier", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setSupplierData(res.data.suppliers || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalSuppliers || 0,
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
  const handleAddSupplier = () => {
    setEditSupplierId(null);
    setSelectedSupplier(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: any) => {
    setEditSupplierId(rowData._id);
    setSelectedSupplier(rowData);
    setVisible(true);
  };

  const toggleSupplierStatus = async (rowData: any) => {
    try {
      const res = await axiosInstance.patch(
        `/api/supplier/toggle-status/${rowData._id}`
      );
      toast.success(res.data.message || "Status updated successfully");
      await supplierDataGet();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/supplier/delete-supplier/${rowData._id}`
          );
          toast.success(res.data.message || "Supplier deleted successfully");
          await supplierDataGet();
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

    const initials = getInitials(rowData?.name || "");
    const bgClass = stringToBg(rowData?.name || "");

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
    setSelectedSupplier(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedSupplier) handleUpdate(selectedSupplier);
      },
    },
    {
      label: selectedSupplier?.isActive ? "Deactivate" : "Activate",
      icon: selectedSupplier?.isActive ? "pi pi-times-circle" : "pi pi-check-circle",
      command: () => {
        if (selectedSupplier) toggleSupplierStatus(selectedSupplier);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedSupplier) confirmDelete(selectedSupplier);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Suppliers</h2>
        <p className="text-sm text-black">Manage suppliers</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search supplier"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Supplier"
          icon="pi pi-plus"
          onClick={handleAddSupplier}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={supplierData}
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
          emptyMessage="No suppliers found"
        >
          <Column header="Avatar" body={imageTemplate} />
          <Column field="name" header="Name" sortable />
          <Column field="email" header="Email" sortable />
          <Column field="phone" header="Phone" />
          <Column field="gstId" header="GST ID" />
          <Column field="address" header="Address" />
          <Column header="Status" body={statusTemplate} />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog 
          header={editSupplierId ? "Edit Supplier" : "Add Supplier"} 
          visible={visible} 
          style={{ width: "50vw" }} 
          onHide={() => {
            setVisible(false);
            setEditSupplierId(null);
            setSelectedSupplier(null);
          }}
        >
          <SupplierForm
            supplierId={editSupplierId}
            onClose={() => {
              setVisible(false);
              setEditSupplierId(null);
              setSelectedSupplier(null);
            }}
            onSuccess={() => {
              supplierDataGet();
              setVisible(false);
              setEditSupplierId(null);
              setSelectedSupplier(null);
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
