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
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold text-gray-700">No Current Stock Available</h2>
        <p className="text-gray-500 mt-2 max-w-md">There is no current stock data to show.</p>
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

    const [searchInput, setSearchInput] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    useEffect(() => {
        fetchStockData();
    }, [pagination.page, pagination.rows, debouncedSearch]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, [debouncedSearch]);

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/api/financial-stock/current-stocks", {
                params: {
                    page: pagination.page,
                    limit: pagination.rows,
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                },
            });

            setStockData(res.data.data || []);
            setPagination((prev) => ({ ...prev, total: res.data.pagination.total || 0 }));
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

    const handleUpdate = (rowData: any) => {
        setEditStockId(rowData._id || null);
        setSelectedStock(rowData);
        setVisible(true);
    };

    const confirmDelete = (rowData: any) => {
        confirmDialog({
            message: `Are you sure you want to delete this current stock entry for "${rowData.productName || rowData.product?.name || 'item'}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: async () => {
                try {
                    const res = await axiosInstance.delete(`/api/financial-stock/delete-current-stock/${rowData._id}`);
                    toast.success(res.data.message || "Current stock deleted successfully");
                    await fetchStockData();
                } catch (err: any) {
                    toast.error(err?.response?.data?.message || "Delete failed");
                }
            },
        });
    };

    const productTemplate = (rowData: any) => (
        <div className="flex flex-col">
            <span className="font-semibold">{rowData.productName || rowData.product?.name || "N/A"}</span>
            <span className="text-xs text-gray-500">{rowData.type || rowData.product?.type || ""}</span>
        </div>
    );

    const unitTemplate = (rowData: any) => (
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium">{rowData.unit || rowData.product?.unit || 'N/A'}</span>
    );

    const qtyTemplate = (rowData: any) => {
        const num = Number(rowData.quantity ?? 0) || 0;
        return <span className="font-medium">{num.toLocaleString()}</span>;
    };

    const priceTemplate = (rowData: any, field: string) => {
        const val = Number(rowData[field] ?? 0) || 0;
        return <span>₹{val.toFixed(2)}</span>;
    };

    const actionTemplate = (rowData: any) => (
        <div onClick={(e) => e.stopPropagation()} className="flex">
            <Button icon="pi pi-ellipsis-v" rounded text aria-label="More actions" onClick={(e) => showRowMenu(e, rowData)} />
        </div>
    );

    const showRowMenu = (event: any, rowData: any) => {
        event.stopPropagation();
        setSelectedStock(rowData);
        menu.current?.show(event);
    };

    const menuModel = [
        { label: "Edit", icon: "pi pi-pencil", command: () => selectedStock && handleUpdate(selectedStock) },
        { label: "Delete", icon: "pi pi-trash", command: () => selectedStock && confirmDelete(selectedStock) },
    ];

    const header = (
        <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
            <div>
                <h2 className="text-lg font-semibold text-white">Current Stock</h2>
                <p className="text-sm text-black">Manage current stock for products</p>
            </div>

            <div className="flex gap-2 items-center">
                <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search product" className="p-inputtext-sm" />
                </IconField>
                <Button label="Refresh" icon="pi pi-refresh" onClick={fetchStockData} className="bg-white text-primary border-0 hover:bg-gray-100" />
            </div>
        </div>
    );

    return (
        <div className="w-full flex justify-center items-center">
            <div className="w-full card bg-white p-4 rounded-lg shadow">
                <DataTable value={stockData} header={header} lazy paginator first={(pagination.page - 1) * pagination.rows} rows={pagination.rows} totalRecords={pagination.total} loading={loading} rowsPerPageOptions={[5, 10, 25, 50]} onPage={(e) => setPagination((prev) => ({ ...prev, page: (e.page ?? 0) + 1, rows: e.rows ?? prev.rows }))} responsiveLayout="scroll" emptyMessage={EmptyState}>
                    <Column header="Product" body={productTemplate} style={{ minWidth: "180px" }} />
                    <Column header="Unit" body={unitTemplate} style={{ minWidth: "80px" }} />
                    <Column header="Quantity" body={qtyTemplate} sortable style={{ minWidth: "120px" }} />
                    <Column header="Cost Price" body={(row) => priceTemplate(row, 'costPrice')} style={{ minWidth: "120px" }} />
                    <Column header="Selling Price" body={(row) => priceTemplate(row, 'sellingPrice')} style={{ minWidth: "120px" }} />
                    <Column header="Created" body={(row: any) => formatDate(row.createdAt)} style={{ minWidth: "110px" }} />
                    {/* <Column header="Actions" body={actionTemplate} style={{ minWidth: "90px" }} /> */}
                </DataTable>

                <Menu model={menuModel} popup ref={menu} />

                <Dialog visible={visible} style={{ width: "50vw" }} onHide={() => { setVisible(false); setEditStockId(null); setSelectedStock(null); }}>
                    {/* Placeholder: reuse same dialog pattern as opening-stock if needed */}
                    <div className="p-4">Edit current stock (not implemented)</div>
                </Dialog>

                <ConfirmDialog />
                <ToastContainer position="top-right" />
            </div>
        </div>
    );
}

export default Page;
