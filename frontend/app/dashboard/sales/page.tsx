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
import SalesForm from "@/components/sales/SalesForm";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">💸</div>
    <h2 className="text-xl font-semibold text-gray-700">No Sales Available</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      No sales have been recorded yet. Sales will appear here once recorded.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 10,
    total: 0,
  });

  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    salesDataGet();
  }, [pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const salesDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/sales/list", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setSalesData(res.data.data || []);
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
  const invoiceTemplate = (rowData: any) => (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-purple-100">
        <i className="pi pi-receipt text-purple-600"></i>
      </div>
      <span className="font-semibold">{rowData.invoiceNumber || 'N/A'}</span>
    </div>
  );

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
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${bgClass}`}>
          {initials}
        </div>
        <div>
          <div className="font-medium">{worker.name}</div>
          <div className="text-xs text-gray-500">{worker.phone || ''}</div>
        </div>
      </div>
    );
  };

  const itemsTemplate = (rowData: any) => (
    <div className="flex items-center gap-1">
      <i className="pi pi-box text-gray-500 text-sm"></i>
      <span className="font-medium">{rowData.saleItems?.length || 0}</span>
      <span className="text-xs text-gray-500">items</span>
    </div>
  );

  const totalQtyTemplate = (rowData: any) => {
    const qty = typeof rowData.totalQty === 'number'
      ? rowData.totalQty
      : (rowData.saleItems || []).reduce((s: number, it: any) => s + (Number(it.qty) || 0), 0);
    return <div className="text-sm font-medium">{qty}</div>;
  };

  const productsTemplate = (rowData: any) => {
    if (!rowData?.saleItems || rowData?.saleItems.length === 0) return <span className="text-gray-400">N/A</span>;
    return (
      <div className="flex flex-col gap-1">
        {rowData?.saleItems?.map((it: any, k: number) => (
          <div key={it?._id || `sale-item-${k}`} className="text-sm">
            <div className="font-medium">{it?.product?.name || 'Item'}</div>
            <div className="text-xs text-gray-500">{it?.qty} × ₹{(it?.price || 0).toLocaleString()} = ₹{(it?.amount || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    );
  };

  const amountTemplate = (rowData: any) => (
    <div className="text-right">
      <div className="font-semibold text-green-700">₹{(rowData.totalAmount || 0).toLocaleString()}</div>
      <div className="text-xs text-gray-500">Litres: {rowData.totalLitres || 0}</div>
    </div>
  );

  const paymentMethodTemplate = (rowData: any) => (
    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">{rowData.paymentMethod}</span>
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
    setSelectedSale(rowData);
    menu.current?.show(event);
  };

  const handleViewDetails = (rowData: any) => {
    setSelectedSale(rowData);
    setDetailsVisible(true);
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete invoice "${rowData.invoiceNumber}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(`/api/sales/delete/${rowData._id}`);
          toast.success(res.data.message || "Sale deleted successfully");
          await salesDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const menuModel = [
    {
      label: "View Details",
      icon: "pi pi-eye",
      command: () => {
        if (selectedSale) handleViewDetails(selectedSale);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedSale) confirmDelete(selectedSale);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Sales</h2>
        <p className="text-sm text-black">Manage recorded sales</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search sales"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Sale"
          icon="pi pi-plus"
          onClick={() => setVisible(true)}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const AddSaleHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-2 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-shopping-cart text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Sale</h2>
        <p className="text-sm text-white/90">Create a new accessory sale</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={salesData}
          header={header}
          lazy
          paginator
          first={(pagination.page - 1) * pagination.rows}
          rows={pagination.rows}
          totalRecords={pagination.total}
          loading={loading}
          rowsPerPageOptions={[10, 25, 50]}
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
          <Column header="Products" body={productsTemplate} style={{ minWidth: "260px" }} />
          <Column header="Qty" body={totalQtyTemplate} style={{ minWidth: "80px" }} />
          <Column header="Amount" body={amountTemplate} />
          <Column header="Payment" body={paymentMethodTemplate} />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        <Menu model={menuModel} popup ref={menu} />
        <Dialog
          header={<div className="flex items-center gap-3"><i className="pi pi-eye text-xl text-blue-600" /> <div className="text-lg font-semibold">Sale Details</div></div>}
          visible={detailsVisible}
          style={{ width: "60vw" }}
          contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
          onHide={() => {
            setDetailsVisible(false);
            setSelectedSale(null);
          }}
        >
          <div className="p-4">
            {selectedSale ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Invoice</p>
                    <p className="font-semibold text-gray-800">{selectedSale.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{formatDate(selectedSale.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Worker</p>
                    <p className="font-semibold text-gray-800">{selectedSale.worker?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{selectedSale.worker?.phone || ''}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Items</h4>
                  <div className="mt-2 space-y-2">
                    {(selectedSale.saleItems || []).map((it: any, idx: number) => (
                      <div key={it._id || `detail-item-${idx}`} className="flex justify-between">
                        <div className="text-sm">{it.product?.name || 'Item'}</div>
                        <div className="text-sm font-semibold">₹{(it.amount || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-green-700">Total: ₹{(selectedSale.totalAmount || 0).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No details available</p>
            )}
          </div>
        </Dialog>

        <Dialog
          header={AddSaleHeader}
          visible={visible}
          style={{ width: "60vw" }}
          contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
          onHide={() => {
            setVisible(false);
          }}
        >
          <div className="p-4">
            <SalesForm
              onClose={() => setVisible(false)}
              onSuccess={async () => {
                setVisible(false);
                await salesDataGet();
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
