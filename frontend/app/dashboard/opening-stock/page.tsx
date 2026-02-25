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
import OpeningStockForm from "@/components/opening-stock/OpeningStockForm";

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold text-gray-700">
            No Opening Stock Available
        </h2>
        <p className="text-gray-500 mt-2 max-w-md">
            You haven't added any opening stock yet. Once you create an opening stock entry, it will appear
            here for management.
        </p>
    </div>
);

function Page() {
    const [loading, setLoading] = useState(false);
    const [stockData, setStockData] = useState<any[]>([]);

    const [visible, setVisible] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any | null>(null);
    const [editStockId, setEditStockId] = useState<string | null>(null);
    const menu = React.useRef<Menu | null>(null);

    const [pagination, setPagination] = useState({
        page: 1,
        rows: 5,
        total: 0,
    });

    // search input (immediate) and debouncedSearch (sent to server)
    const [searchInput, setSearchInput] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    /* ================= FETCH STOCKS (server-side pagination) ================= */
    // fetch when page, rows or debounced search change
    useEffect(() => {
        fetchStockData();
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

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/api/financial-stock/all-financial-stocks", {
                params: {
                    page: pagination.page,
                    limit: pagination.rows,
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                },
            });

            setStockData(res.data.data || []);
            setPagination((prev) => ({
                ...prev,
                total: res.data.pagination.total || 0,
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
    const handleAddStock = () => {
        setEditStockId(null);
        setSelectedStock(null);
        setVisible(true);
    };

    const handleUpdate = (rowData: any) => {
        setEditStockId(rowData._id);
        setSelectedStock(rowData);
        setVisible(true);
    };

    const confirmDelete = (rowData: any) => {
        confirmDialog({
            message: `Are you sure you want to delete this opening stock entry for "${rowData.product?.name}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: async () => {
                try {
                    const res = await axiosInstance.delete(
                        `/api/financial-stock/delete-financial-stock/${rowData._id}`
                    );
                    toast.success(res.data.message || "Opening stock deleted successfully");
                    await fetchStockData();
                } catch (err: any) {
                    toast.error(err?.response?.data?.message || "Delete failed");
                }
            },
        });
    };

    /* ================= COLUMN TEMPLATES ================= */
    const productTemplate = (rowData: any) => (
        <div className="flex flex-col">
            <span className="font-semibold">{rowData.product?.name || "N/A"}</span>
            <span className="text-xs text-gray-500">{rowData.product?.type || ""}</span>
        </div>
    );

    const financialYearTemplate = (rowData: any) => (
        <div className="flex flex-col">
            <span className="font-semibold">{rowData.financialYear?.name || "N/A"}</span>
            <span className="text-xs text-gray-500">
                {rowData.financialYear?.isActive ? (
                    <span className="text-green-600">Active</span>
                ) : (
                    <span className="text-red-600">Inactive</span>
                )}
            </span>
        </div>
    );

    const stockTemplate = (rowData: any, field: string) => (
        <span className="font-medium">{rowData[field]?.toLocaleString() || 0}</span>
    );

    const unitTemplate = (rowData: any) => (
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium">
            {rowData.product?.unit || "N/A"}
        </span>
    );

    const priceTemplate = (rowData: any) => (
        <div className="flex flex-col">
            <span className="text-xs text-gray-500">Cost: ₹{rowData.product?.costPrice?.toFixed(2) || 0}</span>
            <span className="text-xs text-gray-500">Sell: ₹{rowData.product?.sellingPrice?.toFixed(2) || 0}</span>
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
        setSelectedStock(rowData);
        menu.current?.show(event);
    };

    const menuModel = [
        {
            label: "Edit",
            icon: "pi pi-pencil",
            command: () => {
                if (selectedStock) handleUpdate(selectedStock);
            },
        },
        {
            label: "Delete",
            icon: "pi pi-trash",
            command: () => {
                if (selectedStock) confirmDelete(selectedStock);
            },
        },
    ];

    const header = (
        <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
            <div>
                <h2 className="text-lg font-semibold text-white">Opening Stock</h2>
                <p className="text-sm text-black">Manage opening stock for products</p>
            </div>

            <div className="flex gap-2 items-center">
                <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search product"
                        className="p-inputtext-sm"
                    />
                </IconField>
                <Button
                    label="Add Opening Stock"
                    icon="pi pi-plus"
                    onClick={handleAddStock}
                    className="bg-white text-primary border-0 hover:bg-gray-100"
                />
            </div>
        </div>
    );

    return (
        <div className="w-full flex justify-center items-center">
            <div className="w-full card bg-white p-4 rounded-lg shadow">
                <DataTable
                    value={stockData}
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
                    <Column header="Product" body={productTemplate} style={{ minWidth: "180px" }} />
                    <Column header="Financial Year" body={financialYearTemplate} style={{ minWidth: "150px" }} />
                    <Column header="Unit" body={unitTemplate} style={{ minWidth: "80px" }} />
                    <Column
                        header="Opening Stock"
                        body={(row) => stockTemplate(row, "openingStock")}
                        sortable
                        style={{ minWidth: "130px" }}
                    />
                    <Column
                        header="Total Purchase"
                        body={(row) => stockTemplate(row, "totalPurchase")}
                        sortable
                        style={{ minWidth: "140px" }}
                    />
                    <Column
                        header="Total Sale"
                        body={(row) => stockTemplate(row, "totalSale")}
                        sortable
                        style={{ minWidth: "110px" }}
                    />
                    <Column
                        header="Closing Stock"
                        body={(row) => stockTemplate(row, "closingStock")}
                        sortable
                        style={{ minWidth: "130px" }}
                    />
                    <Column header="Pricing" body={priceTemplate} style={{ minWidth: "120px" }} />
                    <Column header="Created" body={(row: any) => formatDate(row.createdAt)} style={{ minWidth: "110px" }} />
                    <Column header="Actions" body={actionTemplate} style={{ minWidth: "90px" }} />
                </DataTable>

                {/* popup menu (single instance) */}
                <Menu model={menuModel} popup ref={menu} />

                <Dialog
                    header={editStockId ? "Edit Opening Stock" : "Add Opening Stock"}
                    visible={visible}
                    style={{ width: "50vw" }}
                    onHide={() => {
                        setVisible(false);
                        setEditStockId(null);
                        setSelectedStock(null);
                    }}
                >
                    <OpeningStockForm
                        stockId={editStockId}
                        onClose={() => {
                            setVisible(false);
                            setEditStockId(null);
                            setSelectedStock(null);
                        }}
                        onSuccess={() => {
                            fetchStockData();
                            setVisible(false);
                            setEditStockId(null);
                            setSelectedStock(null);
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
