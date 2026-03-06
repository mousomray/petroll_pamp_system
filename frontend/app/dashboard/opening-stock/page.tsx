"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
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
    const [financialYearInput, setFinancialYearInput] = useState<string>("");
    const [debouncedFinancialYear, setDebouncedFinancialYear] = useState<string>("");
    const [financialYearOptions, setFinancialYearOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [carryLoading, setCarryLoading] = useState(false);

    /* ================= FETCH STOCKS (server-side pagination) ================= */
    // Fetch all financial years on mount for dropdown options
    useEffect(() => {
        fetchFinancialYears();
    }, []);

    // fetch when page, rows, debounced search or financial year change
    useEffect(() => {
        fetchStockData();
    }, [pagination.page, pagination.rows, debouncedSearch, debouncedFinancialYear]);

    // debounce searchInput -> debouncedSearch
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
        return () => clearTimeout(t);
    }, [searchInput]);

    // debounce financialYearInput -> debouncedFinancialYear
    useEffect(() => {
        const value = String(financialYearInput ?? "").trim();
        const t = setTimeout(() => setDebouncedFinancialYear(value), 500);
        return () => clearTimeout(t);
    }, [financialYearInput]);

    // when debounced search or financial year changes reset to first page
    useEffect(() => {
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, [debouncedSearch, debouncedFinancialYear]);

    const fetchFinancialYears = async () => {
        try {
            // Fetch all stocks without pagination to get all unique financial years
            const res = await axiosInstance.get("/api/opening-stock/all-opening-stocks", {
                params: {
                    page: 1,
                    limit: 1000, // High limit to get all years
                },
            });

            const years = Array.from(
                new Set(
                    (res.data.stocks || [])
                        .map((s: any) => s.financialYear)
                        .filter(Boolean)
                )
            ) as string[];

            const opts = years
                .sort((a: string, b: string) => (a < b ? 1 : -1))
                .map((y: string) => ({ label: y, value: y }));

            setFinancialYearOptions(opts);
        } catch (error: any) {
            console.error("Failed to fetch financial years:", error);
            setFinancialYearOptions([]);
        }
    };

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/api/opening-stock/all-opening-stocks", {
                params: {
                    page: pagination.page,
                    limit: pagination.rows,
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                    ...(debouncedFinancialYear ? { financialYear: debouncedFinancialYear } : {}),
                },
            });

            setStockData(res.data.stocks || []);
            setPagination((prev) => ({
                ...prev,
                total: res.data.totalRecords || 0,
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
            message: `Are you sure you want to delete this opening stock entry for "${rowData.product?.name || rowData.productName || "item"}"?`,
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

    const carryForward = async () => {
        try {
            setCarryLoading(true);
            const res = await axiosInstance.post("/api/opening-stock/carry-forward-financial-year", {
                financialYear: debouncedFinancialYear || undefined,
            });
            toast.success(res.data.message || "Carry forward completed successfully");
            await fetchFinancialYears(); // Refresh dropdown options
            await fetchStockData();
        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.message || "Carry forward failed");
            } else {
                toast.error("Unexpected error occurred during carry forward");
            }
        } finally {
            setCarryLoading(false);
        }
    };

    const confirmCarryForward = () => {
        confirmDialog({
            message:
                "This will create the new year's opening stock based on the current year's closing stock. Continue?",
            header: "Carry Forward Financial Year",
            icon: "pi pi-exchange",
            acceptClassName: "p-button-warning",
            accept: async () => {
                await carryForward();
            },
        });
    };

    /* ================= COLUMN TEMPLATES ================= */
    const productTemplate = (rowData: any) => (
        <div className="flex flex-col">
            <span className="font-semibold">{rowData.product?.name || rowData.productName || "N/A"}</span>
            <span className="text-xs text-gray-500">{rowData.product?.type || rowData.productType || ""}</span>
        </div>
    );

    const financialYearTemplate = (rowData: any) => (
        <div className="flex flex-col">
            <span className="font-semibold">{typeof rowData.financialYear === 'string' ? rowData.financialYear : rowData.financialYear?.name || "N/A"}</span>
            <span className="text-xs text-gray-500">
                {typeof rowData.financialYear === 'object' ? (
                    rowData.financialYear?.isActive ? (
                        <span className="text-green-600">Active</span>
                    ) : (
                        <span className="text-red-600">Inactive</span>
                    )
                ) : null}
            </span>
        </div>
    );

    const stockTemplate = (rowData: any, field: string) => {
        const val = rowData[field] ?? 0;
        const num = Number(val) || 0;
        return <span className="font-medium">{num.toLocaleString()}</span>;
    };

    const unitTemplate = (rowData: any) => (
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium">
            {rowData.productUnit || rowData.unit || "N/A"}
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

    
    const isAddDisabled = Array.isArray(stockData) && stockData.length > 0;

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
                <Dropdown
                    value={financialYearInput}
                    options={[{ label: "All Years", value: "" }, ...financialYearOptions]}
                    onChange={(e) => setFinancialYearInput(String(e.value ?? ""))}
                    placeholder="Filter by Year"
                    className="w-48"
                    showClear
                    emptyMessage="No financial years available"
                />
                <Button
                    label="Carry Forward Year"
                    icon="pi pi-forward"
                    onClick={confirmCarryForward}
                    className="bg-white text-primary border-0 hover:bg-gray-100"
                    loading={carryLoading}
                />
                <Button
                    label="Add Opening Stock"
                    icon="pi pi-plus"
                    onClick={handleAddStock}
                    className="bg-white text-primary border-0 hover:bg-gray-100"
                    disabled={isAddDisabled}
                />
            </div>
        </div>
    );


    const EditOpeningStockHeader = (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500  mb-2 p-3 rounded-t-lg">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
                <i className="pi pi-database text-white text-2xl"></i>
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Edit OpeningStock</h2>
                <p className="text-sm text-white/90">Update opening stock information</p>
            </div>
        </div>
    );

    const AddOpeningStockHeader = (
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600  mb-2 p-3 rounded-t-lg">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
                <i className="pi pi-database text-white text-2xl"></i>
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Add New Supplier</h2>
                <p className="text-sm text-white/90">Create a new items opening stock</p>
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
                    
                    <Column header="Created" body={(row: any) => formatDate(row.createdAt)} style={{ minWidth: "110px" }} />
                   
                </DataTable>

               
                <Menu model={menuModel} popup ref={menu} />

                <Dialog
                    header={editStockId ? EditOpeningStockHeader : AddOpeningStockHeader}
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
                            fetchFinancialYears(); 
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
