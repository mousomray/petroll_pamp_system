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
    <div className="text-6xl mb-4">💳</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Transactions Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any transactions yet. Once you create a transaction, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [transactionData, setTransactionData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [editTransactionId, setEditTransactionId] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 10,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  
  // Type filter
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Form state
  const [formData, setFormData] = useState({
    accountHeadId: "",
    amount: "",
    note: "",
    transactionDate: new Date().toISOString().split('T')[0],
    paymentMethod: "CASH",
  });

  const [accountHeads, setAccountHeads] = useState<any[]>([]);

  /* ================= FETCH TRANSACTIONS (server-side pagination) ================= */
  // fetch when page, rows, debounced search, or type filter change
  useEffect(() => {
    transactionDataGet();
  }, [pagination.page, pagination.rows, debouncedSearch, typeFilter]);

  // debounce searchInput -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // when debounced search or type filter changes reset to first page
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, typeFilter]);

  // Fetch account heads for dropdown
  useEffect(() => {
    fetchAccountHeads();
  }, []);

  const fetchAccountHeads = async () => {
    try {
      const res = await axiosInstance.get("/api/account-head/account-heads", {
        params: { limit: 1000 }, // Get all account heads
      });
      setAccountHeads(res.data.data || []);
    } catch (error: any) {
      console.error("Failed to fetch account heads:", error);
    }
  };

  const transactionDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/transaction/get-transactions", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
        },
      });

      setTransactionData(res.data.data || []);
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
  const handleAddTransaction = () => {
    setEditTransactionId(null);
    setSelectedTransaction(null);
    setFormData({
      accountHeadId: "",
      amount: "",
      note: "",
      transactionDate: new Date().toISOString().split('T')[0],
      paymentMethod: "CASH",
    });
    setVisible(true);
  };

  const handleUpdate = async (rowData: any) => {
    setEditTransactionId(rowData._id);
    setSelectedTransaction(rowData);
    setFormData({
      accountHeadId: rowData.accountHeadId || "",
      amount: rowData.amount?.toString() || "",
      note: rowData.note || "",
      transactionDate: rowData.transactionDate ? new Date(rowData.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMethod: rowData.paymentMethod || "CASH",
    });
    setVisible(true);
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete this transaction?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `api/transaction/delete-transaction/${rowData._id}`
          );
          toast.success(res.data.message || "Transaction deleted successfully");
          await transactionDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const handleViewDetails = (rowData: any) => {
    setSelectedTransaction(rowData);
    setDetailsVisible(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.accountHeadId) {
      toast.error("Account head is required");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Valid amount is required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editTransactionId) {
        // Update
        const res = await axiosInstance.put(
          `/api/transaction/update-transaction/${editTransactionId}`,
          payload
        );
        toast.success(res.data.message || "Transaction updated successfully");
      } else {
        // Create
        const res = await axiosInstance.post(
          "/api/transaction/create-transaction",
          payload
        );
        toast.success(res.data.message || "Transaction created successfully");
      }
      setVisible(false);
      setEditTransactionId(null);
      setSelectedTransaction(null);
      await transactionDataGet();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= COLUMN TEMPLATES ================= */
  const accountHeadTemplate = (rowData: any) => {
    const type = rowData.accountHeadType || rowData.type;
    
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
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getBgColor(type)}`}>
          <i className={`pi ${getIcon(type)} ${getIconColor(type)}`}></i>
        </div>
        <div>
          <div className="font-semibold">{rowData.accountHeadName || "N/A"}</div>
          <div className="text-xs text-gray-500">{type}</div>
        </div>
      </div>
    );
  };

  const amountTemplate = (rowData: any) => {
    const type = rowData.accountHeadType || rowData.type;
    const isIncome = type === "INCOME";
    
    return (
      <div className={`font-semibold text-right ${isIncome ? "text-green-700" : "text-red-700"}`}>
        {isIncome ? "+" : "-"} ₹{rowData.amount?.toLocaleString() || '0'}
      </div>
    );
  };

  const typeTemplate = (rowData: any) => {
    const type = rowData.accountHeadType || rowData.type;
    const typeColors: any = {
      INCOME: "bg-green-100 text-green-800",
      EXPENSE: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[type] || "bg-gray-100 text-gray-800"
          }`}
      >
        {type}
      </span>
    );
  };

  const noteTemplate = (rowData: any) => {
    return (
      <div className="max-w-xs">
        <div className="truncate" title={rowData.note}>
          {rowData.note || "-"}
        </div>
      </div>
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
    setSelectedTransaction(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "View Details",
      icon: "pi pi-eye",
      command: () => {
        if (selectedTransaction) handleViewDetails(selectedTransaction);
      },
    },
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedTransaction) handleUpdate(selectedTransaction);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedTransaction) confirmDelete(selectedTransaction);
      },
    },
  ];

  const header = (
    <div className="flex flex-col gap-3 bg-primary p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Transactions</h2>
          <p className="text-sm text-black">Manage income and expense transactions</p>
        </div>

        <div className="flex gap-2 items-center">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search transaction"
              className="p-inputtext-sm"
            />
          </IconField>
          <Button
            label="Add Transaction"
            icon="pi pi-plus"
            onClick={handleAddTransaction}
            className="bg-white text-primary border-0 hover:bg-gray-100"
          />
        </div>
      </div>
      
      {/* Type Filter Buttons */}
      <div className="flex gap-2">
        <Button
          label="All"
          onClick={() => setTypeFilter("ALL")}
          className={`${
            typeFilter === "ALL"
              ? "bg-white text-primary"
              : "bg-white/20 text-white hover:bg-white/30"
          } border-0`}
          size="small"
        />
        <Button
          label="Income"
          icon="pi pi-arrow-up"
          onClick={() => setTypeFilter("INCOME")}
          className={`${
            typeFilter === "INCOME"
              ? "bg-green-500 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          } border-0`}
          size="small"
        />
        <Button
          label="Expense"
          icon="pi pi-arrow-down"
          onClick={() => setTypeFilter("EXPENSE")}
          className={`${
            typeFilter === "EXPENSE"
              ? "bg-red-500 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          } border-0`}
          size="small"
        />
      </div>
    </div>
  );

  const EditTransactionHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-wallet text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Edit Transaction</h2>
        <p className="text-sm text-white/90">Update transaction information</p>
      </div>
    </div>
  );

  const AddTransactionHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-wallet text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Transaction</h2>
        <p className="text-sm text-white/90">Create a new transaction</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={transactionData}
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
          <Column header="Account Head" body={accountHeadTemplate} />
          <Column header="Note" body={noteTemplate} />
          <Column header="Amount" body={amountTemplate} />
          <Column header="Type" body={typeTemplate} />
          <Column
            field="transactionDate"
            header="Transaction Date"
            body={(row: any) => formatDate(row.transactionDate)}
          />
          <Column
            header="Payment Method"
            body={(row: any) => (
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                {row.paymentMethod || "CASH"}
              </span>
            )}
          />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        {/* Add/Edit Dialog */}
        <Dialog
          header={editTransactionId ? EditTransactionHeader : AddTransactionHeader}
          visible={visible}
          style={{ width: "500px" }}
          onHide={() => {
            setVisible(false);
            setEditTransactionId(null);
            setSelectedTransaction(null);
          }}
        >
          <form onSubmit={handleSubmit} className="p-4">
            <div className="mb-4">
              <label htmlFor="accountHeadId" className="block text-sm font-medium text-gray-700 mb-2">
                Account Head <span className="text-red-500">*</span>
              </label>
              <select
                id="accountHeadId"
                value={formData.accountHeadId}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    accountHeadId: e.target.value
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Account Head</option>
                {accountHeads.map((head) => (
                  <option key={head._id} value={head._id}>
                    {head.name} ({head.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <InputText
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <InputText
                id="transactionDate"
                type="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="w-full"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="CASH">CASH</option>
                <option value="ONLINE">ONLINE</option>
                <option value="CARD">CARD</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Enter note"
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                label="Cancel"
                icon="pi pi-times"
                type="button"
                onClick={() => {
                  setVisible(false);
                  setEditTransactionId(null);
                  setSelectedTransaction(null);
                }}
                className="p-button-text"
              />
              <Button
                label={editTransactionId ? "Update" : "Create"}
                icon="pi pi-check"
                type="submit"
                loading={loading}
              />
            </div>
          </form>
        </Dialog>

        {/* Details Dialog */}
        <Dialog
          header={
            <div className="flex items-center gap-3">
              <i className="pi pi-eye text-xl text-blue-600" />
              <div className="text-lg font-semibold">Transaction Details</div>
            </div>
          }
          visible={detailsVisible}
          style={{ width: "500px" }}
          onHide={() => {
            setDetailsVisible(false);
            setSelectedTransaction(null);
          }}
        >
          {selectedTransaction && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Account Head</p>
                  <p className="font-semibold">{selectedTransaction.accountHeadName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Type</p>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedTransaction.accountHeadType === "INCOME"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedTransaction.accountHeadType || selectedTransaction.type}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount</p>
                  <p className={`font-bold text-lg ${
                    selectedTransaction.accountHeadType === "INCOME" ? "text-green-700" : "text-red-700"
                  }`}>
                    {selectedTransaction.accountHeadType === "INCOME" ? "+" : "-"} ₹
                    {selectedTransaction.amount?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Transaction Date</p>
                  <p className="font-semibold">{formatDate(selectedTransaction.transactionDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                  <p className="font-semibold">{selectedTransaction.paymentMethod || "CASH"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Note</p>
                  <p className="font-semibold">{selectedTransaction.note || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;
