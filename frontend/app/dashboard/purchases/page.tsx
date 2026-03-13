"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import PurchaseForm from "@/components/purchase/PurchaseForm";
import ViewDetails from "@/components/purchase/ViewDetails";
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
    <div className="text-6xl mb-4">🛒</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Purchases Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any purchases yet. Once you create a purchase, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [editPurchaseId, setEditPurchaseId] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsData, setDetailsData] = useState<any | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  
  // filters for year and month
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  
  // available years (current year and previous years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  /* ================= FETCH PURCHASES (server-side pagination) ================= */
  // fetch when page, rows or debounced search change
  useEffect(() => {
    purchaseDataGet();
  }, [pagination.page, pagination.rows, debouncedSearch, selectedYear, selectedMonth]);

  // debounce searchInput -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // when debounced search changes reset to first page
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, selectedYear, selectedMonth]);

  const purchaseDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/purchase/list-purchases", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(selectedYear ? { year: selectedYear } : {}),
          ...(selectedMonth ? { month: selectedMonth } : {}),
        },
      });

      setPurchaseData(res.data.data || []);
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
  const handleAddPurchase = () => {
    setEditPurchaseId(null);
    setSelectedPurchase(null);
    setVisible(true);
  };

  const handleUpdate = async (rowData: any) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/purchase/purchase-details/${rowData._id}`);
      const data = res.data?.data || null;
      setEditPurchaseId(rowData._id);
      setSelectedPurchase(data);
      setVisible(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.invoiceNo}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `api/purchase/delete-purchase/${rowData._id}`
          );
          toast.success(res.data.message || "Purchase deleted successfully");
          await purchaseDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const handleViewDetails = (rowData: any) => {
    // fetch full details and open details dialog
    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/purchase/purchase-details/${rowData._id}`);
        const data = res.data?.data || null;
        setDetailsData(data);
        setDetailsVisible(true);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleViewInvoice = (rowData: any) => {
    try {
      // Get the base URL from axios instance or use default
      const baseURL = axiosInstance.defaults.baseURL || "http://localhost:8090";
      const invoiceUrl = `${baseURL}/api/purchase/generate-purchase-invoice/${rowData._id}`;

      // Open PDF in new tab
      window.open(invoiceUrl, '_blank');
      toast.success('Opening invoice in new tab...');
    } catch (err: any) {
      toast.error('Failed to open invoice');
    }
  };

  const handleViewReport = async () => {
    try {
      setLoading(true);

      // Open a blank window immediately to avoid popup blockers
      const newWindow = window.open();

      const response = await axiosInstance.get("/api/purchase/list-purchases", {
        params: {
          pdf: "true",
          ...(selectedYear ? { year: selectedYear } : {}),
          ...(selectedMonth ? { month: selectedMonth } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
        responseType: "blob",
      });

      // Create blob URL and navigate the new window to it (will render PDF in-browser)
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      if (newWindow) {
        newWindow.location.href = url;
      } else {
        // Fallback in case popup blocked
        window.open(url, "_blank");
      }

      toast.success("Opening report in new tab...");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to open report");
    } finally {
      setLoading(false);
    }
  };

  /* ================= COLUMN TEMPLATES ================= */
  const invoiceTemplate = (rowData: any) => (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-purple-100">
        <i className="pi pi-receipt text-purple-600"></i>
      </div>
      <span className="font-semibold">{rowData.invoiceNo}</span>
    </div>
  );

  const supplierTemplate = (rowData: any) => {
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

    const initials = getInitials(rowData?.supplier?.name || "");
    const bgClass = stringToBg(rowData?.supplier?.name || "");

    return (
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${bgClass}`}>
          {initials}
        </div>
        <div>
          <div className="font-medium">{rowData.supplier?.name || "N/A"}</div>
          <div className="text-xs text-gray-500">{rowData.supplier?.phone || ""}</div>
        </div>
      </div>
    );
  };

  const paymentStatusTemplate = (rowData: any) => {
    const statusColors: any = {
      PAID: "bg-green-100 text-green-800",
      PARTIAL: "bg-yellow-100 text-yellow-800",
      UNPAID: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[rowData.paymentStatus] || "bg-gray-100 text-gray-800"
          }`}
      >
        {rowData.paymentStatus}
      </span>
    );
  };

  const paymentMethodTemplate = (rowData: any) => (
    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
      {rowData.paymentMethod}
    </span>
  );

  const amountTemplate = (rowData: any) => (
    <div className="text-right">
      <div className="font-semibold text-green-700">₹{rowData.totalAmount?.toLocaleString() || '0'}</div>
      <div className="text-xs text-gray-500">
        Paid: ₹{rowData.paidAmount?.toLocaleString() || '0'}
      </div>
      {rowData.dueAmount > 0 && (
        <div className="text-xs text-red-600">
          Due: ₹{rowData.dueAmount?.toLocaleString() || '0'}
        </div>
      )}
    </div>
  );

  const itemsTemplate = (rowData: any) => (
    <div className="flex items-center gap-1">
      <i className="pi pi-box text-gray-500 text-sm"></i>
      <span className="font-medium">{rowData.totalItems || 0}</span>
      <span className="text-xs text-gray-500">items</span>
    </div>
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
    setSelectedPurchase(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "View Invoice (PDF)",
      icon: "pi pi-file-pdf",
      command: () => {
        if (selectedPurchase) handleViewInvoice(selectedPurchase);
      },
    },
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedPurchase) handleUpdate(selectedPurchase);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedPurchase) confirmDelete(selectedPurchase);
      },
    },
  ];

  const header = (
    <div className="flex flex-col gap-4 bg-primary p-4 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Purchases</h2>
        <p className="text-sm text-black">Manage purchase orders and invoices</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-white font-semibold mb-1">Search</label>
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by invoice or supplier"
              className="p-inputtext-sm w-full"
            />
          </IconField>
        </div>

        {/* Year Filter */}
        <div className="min-w-[120px]">
          <label className="block text-xs text-white font-semibold mb-1">Year</label>
          <select
            value={selectedYear || ""}
            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
            className="p-2 rounded border border-gray-300 w-full text-sm bg-white"
          >
            <option value="">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="min-w-[120px]">
          <label className="block text-xs text-white font-semibold mb-1">Month</label>
          <select
            value={selectedMonth || ""}
            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
            disabled={!selectedYear}
            className="p-2 rounded border border-gray-300 w-full text-sm bg-white disabled:bg-gray-100"
          >
            <option value="">All Months</option>
            {[
              { num: 1, name: "January" },
              { num: 2, name: "February" },
              { num: 3, name: "March" },
              { num: 4, name: "April" },
              { num: 5, name: "May" },
              { num: 6, name: "June" },
              { num: 7, name: "July" },
              { num: 8, name: "August" },
              { num: 9, name: "September" },
              { num: 10, name: "October" },
              { num: 11, name: "November" },
              { num: 12, name: "December" },
            ].map((month) => (
              <option key={month.num} value={month.num}>
                {month.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Report Button */}
        <Button
          label="View Report"
          icon="pi pi-eye"
          onClick={handleViewReport}
          loading={loading}
          className="bg-yellow-500 text-white hover:bg-yellow-600"
          disabled={loading}
        />

        {/* Add Purchase Button */}
        <Button
          label="Add Purchase"
          icon="pi pi-plus"
          onClick={handleAddPurchase}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const EditPurchaseHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-shopping-cart text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Edit Purchase</h2>
        <p className="text-sm text-white/90">Update purchase information</p>
      </div>
    </div>
  );

  const AddPurchaseHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-shopping-cart text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Purchase</h2>
        <p className="text-sm text-white/90">Create a new purchase order</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={purchaseData}
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
          <Column header="Invoice" body={invoiceTemplate} />
          <Column header="Supplier" body={supplierTemplate} />
          <Column
            field="purchaseDate"
            header="Purchase Date"
            body={(row: any) => formatDate(row.purchaseDate)}
          />
          <Column header="Items" body={itemsTemplate} />
          <Column header="Amount" body={amountTemplate} />
          <Column header="Payment Status" body={paymentStatusTemplate} />
          <Column header="Method" body={paymentMethodTemplate} />
          <Column
            header="Created"
            body={(row: any) => formatDate(row.createdAt)}
          />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog
          header={editPurchaseId ? EditPurchaseHeader : AddPurchaseHeader}
          visible={visible}
          style={{ width: "70vw" }}
          contentStyle={{ maxHeight: '90vh', overflow: 'auto' }}
          onHide={() => {
            setVisible(false);
            setEditPurchaseId(null);
            setSelectedPurchase(null);
          }}
        >
          <div className="p-4">
            <PurchaseForm
              editId={editPurchaseId || undefined}
              initialData={selectedPurchase || undefined}
              onClose={() => {
                setVisible(false);
                setEditPurchaseId(null);
                setSelectedPurchase(null);
              }}
              onSuccess={async () => {
                setVisible(false);
                setEditPurchaseId(null);
                setSelectedPurchase(null);
                await purchaseDataGet();
              }}
            />
          </div>
        </Dialog>

        {/* Details Dialog */}
        <Dialog
          header={<div className="flex items-center gap-3"><i className="pi pi-eye text-xl text-blue-600" /> <div className="text-lg font-semibold">Purchase Details</div></div>}
          visible={detailsVisible}
          style={{ width: "60vw" }}
          contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
          onHide={() => {
            setDetailsVisible(false);
            setDetailsData(null);
          }}
        >
          <div className="p-4">
            <ViewDetails
              purchaseId={detailsData?._id}
              initialData={detailsData || undefined}
              onClose={() => {
                setDetailsVisible(false);
                setDetailsData(null);
              }}
            />
          </div>
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;
