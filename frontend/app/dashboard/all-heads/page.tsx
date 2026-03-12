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

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">📊</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Account Heads Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any account heads yet. Once you create an account head, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [accountHeadData, setAccountHeadData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedAccountHead, setSelectedAccountHead] = useState<any | null>(null);
  const [editAccountHeadId, setEditAccountHeadId] = useState<string | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "INCOME",
    isActive: true,
  });

  /* ================= FETCH ACCOUNT HEADS (server-side pagination) ================= */
  // fetch when page, rows or debounced search change
  useEffect(() => {
    accountHeadDataGet();
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

  const accountHeadDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/account-head/account-heads", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setAccountHeadData(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination?.total || 0,
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
  const handleAddAccountHead = () => {
    setEditAccountHeadId(null);
    setSelectedAccountHead(null);
    setFormData({
      name: "",
      type: "INCOME",
      isActive: true,
    });
    setVisible(true);
  };

  const handleUpdate = async (rowData: any) => {
    setEditAccountHeadId(rowData._id);
    setSelectedAccountHead(rowData);
    setFormData({
      name: rowData.name || "",
      type: rowData.type || "INCOME",
      isActive: rowData.isActive !== undefined ? rowData.isActive : true,
    });
    setVisible(true);
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
            `api/account-head/delete-account-head/${rowData._id}`
          );
          toast.success(res.data.message || "Account head deleted successfully");
          await accountHeadDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Account head name is required");
      return;
    }

    try {
      setLoading(true);
      if (editAccountHeadId) {
        // Update
        const res = await axiosInstance.put(
          `/api/account-head/update-account-head/${editAccountHeadId}`,
          formData
        );
        toast.success(res.data.message || "Account head updated successfully");
      } else {
        // Create
        const res = await axiosInstance.post(
          "/api/account-head/create-account-head",
          formData
        );
        toast.success(res.data.message || "Account head created successfully");
      }
      setVisible(false);
      setEditAccountHeadId(null);
      setSelectedAccountHead(null);
      await accountHeadDataGet();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= COLUMN TEMPLATES ================= */
  const nameTemplate = (rowData: any) => {
    const getIcon = (type: string) => {
      return type === "INCOME" ? "pi-arrow-up" : "pi-arrow-down";
    };

    const getIconColor = (type: string) => {
      return type === "INCOME" ? "text-green-600" : "text-red-600";
    };

    const getBgColor = (type: string) => {
      return type === "INCOME" ? "bg-green-100" : "bg-red-100";
    };

    return (
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getBgColor(rowData.type)}`}>
          <i className={`pi ${getIcon(rowData.type)} ${getIconColor(rowData.type)}`}></i>
        </div>
        <span className="font-semibold">{rowData.name}</span>
      </div>
    );
  };

  const typeTemplate = (rowData: any) => {
    const typeColors: any = {
      INCOME: "bg-green-100 text-green-800",
      EXPENSE: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[rowData.type] || "bg-gray-100 text-gray-800"
          }`}
      >
        {rowData.type}
      </span>
    );
  };

  const statusTemplate = (rowData: any) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${rowData.isActive
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
          }`}
      >
        {rowData.isActive ? "Active" : "Inactive"}
      </span>
    );
  };

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
    setSelectedAccountHead(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedAccountHead) handleUpdate(selectedAccountHead);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedAccountHead) confirmDelete(selectedAccountHead);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Account Heads</h2>
        <p className="text-sm text-black">Manage income and expense account heads</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search account head"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Account Head"
          icon="pi pi-plus"
          onClick={handleAddAccountHead}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const EditAccountHeadHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-book text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Edit Account Head</h2>
        <p className="text-sm text-white/90">Update account head information</p>
      </div>
    </div>
  );

  const AddAccountHeadHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-book text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Account Head</h2>
        <p className="text-sm text-white/90">Create a new account head</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={accountHeadData}
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
          <Column header="Account Head" body={nameTemplate} />
          <Column header="Type" body={typeTemplate} />
          <Column header="Status" body={statusTemplate} />
          <Column
            header="Created"
            body={(row: any) => formatDate(row.createdAt)}
          />
          <Column
            header="Updated"
            body={(row: any) => formatDate(row.updatedAt)}
          />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        {/* Add/Edit Dialog */}
        <Dialog
          header={editAccountHeadId ? EditAccountHeadHeader : AddAccountHeadHeader}
          visible={visible}
          style={{ width: "500px" }}
          onHide={() => {
            setVisible(false);
            setEditAccountHeadId(null);
            setSelectedAccountHead(null);
          }}
        >
          <form onSubmit={handleSubmit} className="p-4">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Account Head Name <span className="text-red-500">*</span>
              </label>
              <InputText
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter account head name"
                className="w-full"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                label="Cancel"
                icon="pi pi-times"
                type="button"
                onClick={() => {
                  setVisible(false);
                  setEditAccountHeadId(null);
                  setSelectedAccountHead(null);
                }}
                className="p-button-text"
              />
              <Button
                label={editAccountHeadId ? "Update" : "Create"}
                icon="pi pi-check"
                type="submit"
                loading={loading}
              />
            </div>
          </form>
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;
