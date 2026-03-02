"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputNumber } from "primereact/inputnumber";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import ProductFrom from "@/components/product/ProductFrom";

const createOpeningStockSchema = z.object({
    productIds: z.array(z.string()).min(1, "At least one product is required"),
});

const updateOpeningStockSchema = z.object({
    openingStock: z.number().min(0, "Opening stock must be at least 0"),
});

type CreateOpeningStockFormData = z.infer<typeof createOpeningStockSchema>;
type UpdateOpeningStockFormData = z.infer<typeof updateOpeningStockSchema>;

type OpeningStockFormProps = {
    stockId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

interface Tank {
    _id: string;
    tankName: string;
    capacity: number;
}

interface Product {
    _id: string;
    name: string;
    type: string;
    unit: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    minimumStockAlert: number;
    openingStock?: number;
    tankIds?: string[];
    tankAllocations?: Array<{ tankId: string; openingStock: number; tankName?: string }>;
}

function OpeningStockForm({ stockId, onClose, onSuccess }: OpeningStockFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [currentStock, setCurrentStock] = useState<any>(null);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [tanks, setTanks] = useState<Tank[]>([]);
    const [showProductDialog, setShowProductDialog] = useState(false);
    const isEditMode = !!stockId;

    const createForm = useForm<CreateOpeningStockFormData>({
        resolver: zodResolver(createOpeningStockSchema),
        defaultValues: {
            productIds: [],
        },
    });

    const updateForm = useForm<UpdateOpeningStockFormData>({
        resolver: zodResolver(updateOpeningStockSchema),
        defaultValues: {
            openingStock: 0,
        },
    });

    const {
        handleSubmit,
        control,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = isEditMode ? updateForm : createForm;

    useEffect(() => {
        fetchProducts();
        fetchTanks();
    }, []);

    useEffect(() => {
        if (stockId && products.length > 0 && tanks.length > 0) {
            fetchStockData();
        }
    }, [stockId, products, tanks]);

    const fetchProducts = async () => {
        try {
            const res = await axiosInstance.get("/api/product/dropdown-all-products", {
                params: { page: 1, limit: 1000 },
            });
            setProducts(res.data.products || []);
        } catch (error: any) {
            toast.error("Failed to fetch products");
        }
    };

    const handleProductCreated = async () => {
        // Refresh product list and auto-select new product
        try {
            const res = await axiosInstance.get("/api/product/dropdown-all-products", {
                params: { page: 1, limit: 1000 },
            });
            const updatedProducts = res.data.products || [];
            setProducts(updatedProducts);
            
            // Auto-select the newly created product
            if (updatedProducts.length > 0) {
                const newProduct = updatedProducts[updatedProducts.length - 1];
                const currentProductIds = createForm.watch("productIds") || [];
                // Add the new product ID to the selected products
                createForm.setValue("productIds", [...currentProductIds, newProduct._id]);
                toast.success(`Product "${newProduct.name}" added and selected`);
            }
            
            setShowProductDialog(false);
        } catch (error: any) {
            console.error("Failed to refresh products:", error);
            setShowProductDialog(false);
        }
    };

    const fetchTanks = async () => {
        try {
            const res = await axiosInstance.get("/api/tank/dropdown-tanks", {
                params: { page: 1, limit: 1000 },
            });
            setTanks(res.data.tanks || res.data.data || []);
            console.log("Fetched tanks:", res.data.tanks || res.data.data || []);
        } catch (error: any) {
            console.error("Failed to fetch tanks");
        }
    };

    const getTankName = (tankId: string): string => {
        const tank = tanks.find(t => t._id === tankId);
        return tank?.tankName || `Tank ${tankId.slice(0, 6)}`;
    };

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/opening-stock/single-opening-stocks/${stockId}`);
            const stock = res.data.data;
            setCurrentStock(stock);

            if (isEditMode) {
                updateForm.setValue("openingStock", stock.openingStock);

                // Find the product to get its type and tank allocations
                let productId = null;
                if (Array.isArray(stock.productId)) {
                    productId = stock.productId[0];
                } else {
                    productId = stock.productId;
                }

                const product = products.find(p => p._id === productId);

                if (product) {
                    if (product.type === "FUEL" && product.tankIds && product.tankIds.length > 0) {
                        // For FUEL products, set up tank allocations from stock data
                        const tankAllocations = stock.tanks?.length > 0
                            ? stock.tanks.map((t: any) => ({
                                tankId: t.tankId,
                                openingStock: t.quantity || 0,
                                tankName: getTankName(t.tankId)
                            }))
                            : product.tankIds.map(tankId => ({
                                tankId,
                                openingStock: 0,
                                tankName: getTankName(tankId)
                            }));

                        setEditProduct({
                            ...product,
                            tankAllocations
                        });
                    } else {
                        setEditProduct(product);
                    }
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch stock data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    // Watch productIds to update the selected products display
    const watchedProductIds = !isEditMode ? (createForm.watch("productIds") as string[]) : undefined;

    useEffect(() => {
        if (!isEditMode && watchedProductIds && products.length > 0) {
            const selected = products
                .filter(p => watchedProductIds.includes(p._id))
                .map(p => {
                    // For FUEL type products, initialize tank allocations
                    if (p.type === "FUEL" && p.tankIds && p.tankIds.length > 0) {
                        return {
                            ...p,
                            openingStock: 0,
                            tankAllocations: p.tankIds.map(tankId => ({
                                tankId,
                                openingStock: 0,
                                tankName: getTankName(tankId)
                            }))
                        };
                    }
                    // For non-FUEL products, use quantity as default
                    return { ...p, openingStock: p.quantity ?? 0 };
                });
            setSelectedProducts(selected);
        }
    }, [watchedProductIds, products, isEditMode]);

    const updateOpeningStockForProduct = (productId: string, value: number | null) => {
        setSelectedProducts(prev => prev.map(p => p._id === productId ? { ...p, openingStock: value ?? 0 } : p));
    };

    const updateTankAllocation = (productId: string, tankId: string, value: number | null) => {
        setSelectedProducts(prev =>
            prev.map(p => {
                if (p._id === productId && p.tankAllocations) {
                    return {
                        ...p,
                        tankAllocations: p.tankAllocations.map(ta =>
                            ta.tankId === tankId ? { ...ta, openingStock: value ?? 0 } : ta
                        )
                    };
                }
                return p;
            })
        );
    };

    const updateEditTankAllocation = (tankId: string, value: number | null) => {
        if (editProduct && editProduct.tankAllocations) {
            setEditProduct({
                ...editProduct,
                tankAllocations: editProduct.tankAllocations.map(ta =>
                    ta.tankId === tankId ? { ...ta, openingStock: value ?? 0 } : ta
                )
            });
        }
    };

    const onSubmit = async (
        data: CreateOpeningStockFormData | UpdateOpeningStockFormData
    ) => {
        setIsSubmitting(true);

        try {
            // ==============================
            // ✅ CREATE MODE
            // ==============================
            if (!isEditMode) {

                if (!selectedProducts.length) {
                    toast.error("Please select at least one product");
                    return;
                }

                // 🔥 Build products array for backend
                const productsPayload = selectedProducts.map((product) => {

                    // If FUEL product
                    if (product.type === "FUEL") {

                        const tanks =
                            product.tankAllocations?.map((ta) => ({
                                tankId: ta.tankId,
                                quantity: ta.openingStock || 0
                            })) || [];

                        const totalOpeningStock = tanks.reduce(
                            (sum, tank) => sum + Number(tank.quantity || 0),
                            0
                        );

                        return {
                            productId: product._id,
                            openingStock: totalOpeningStock,
                            tanks: tanks
                        };
                    }

                    // If NON-FUEL
                    return {
                        productId: product._id,
                        openingStock: product.openingStock || 0
                    };
                });

                const payload = {
                    products: productsPayload
                };

                // ✅ SINGLE API CALL
                const res = await axiosInstance.post(
                    "/api/opening-stock/create-opening-stock",
                    payload
                );

                toast.success(
                    res.data.message ||
                    `Opening stock created for ${selectedProducts.length} product(s)`
                );

                createForm.reset();
                setSelectedProducts([]);
                onSuccess();
            }

            // ==============================
            // ✅ EDIT MODE
            // ==============================
            else {

                const url = `/api/opening-stock/update-opening-stock/${stockId}`;
                let payload: any = {};

                if (!editProduct) {
                    toast.error("Product not found");
                    return;
                }

                if (editProduct.type === "FUEL") {

                    const tanks =
                        editProduct.tankAllocations?.map((ta) => ({
                            tankId: ta.tankId,
                            quantity: ta.openingStock || 0
                        })) || [];

                    const totalOpeningStock = tanks.reduce(
                        (sum, tank) => sum + Number(tank.quantity || 0),
                        0
                    );

                    payload = {
                        openingStock: totalOpeningStock,
                        tanks: tanks
                    };

                } else {

                    payload = {
                        openingStock: editProduct.openingStock || 0
                    };
                }

                const res = await axiosInstance.put(url, payload);

                toast.success(
                    res.data.message || "Opening stock updated successfully!"
                );

                updateForm.reset();
                onSuccess();
            }

        } catch (error: any) {
            console.error("Opening stock operation error:", error);

            toast.error(
                error.response?.data?.message ||
                `Failed to ${isEditMode ? "update" : "create"} opening stock`
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <i className="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        );
    }

    // For Create mode - show product selector
    if (!isEditMode) {
        const productOptions = products.map((product) => ({
            label: `${product.name} (${product.unit})`,
            value: product._id,
        }));

        return (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Product MultiSelect */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="productIds" className="font-medium text-sm">
                        Select Products <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <Controller
                            name="productIds"
                            control={control as any}
                            render={({ field }) => (
                                <MultiSelect
                                    id="productIds"
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.value)}
                                    options={productOptions}
                                    placeholder="Select products"
                                    filter
                                    display="chip"
                                    className={`flex-1 ${(errors as any).productIds ? "p-invalid" : ""}`}
                                />
                            )}
                        />
                        <Button
                            type="button"
                            icon="pi pi-plus"
                            onClick={() => setShowProductDialog(true)}
                            className="bg-green-500 border-0 hover:bg-green-600"
                            tooltip="Create New Product"
                            tooltipOptions={{ position: 'top' }}
                        />
                    </div>
                    {(errors as any).productIds && (
                        <small className="text-red-500">{(errors as any).productIds.message}</small>
                    )}
                    <small className="text-gray-500">
                        Select multiple products to create opening stock. The system will use the current quantity from each product as the opening stock.
                    </small>
                </div>

                {/* Selected Products Details Table */}
                {selectedProducts.length > 0 && (
                    <div className="mt-4">
                        <h3 className="font-semibold text-sm mb-2 text-gray-700">Selected Products Details</h3>
                        <DataTable
                            value={selectedProducts}
                            className="border rounded-lg"
                            emptyMessage="No products selected"
                            size="small"
                        >
                            <Column
                                field="name"
                                header="Product"
                                body={(rowData) => (
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{rowData.name}</span>
                                        <span className="text-xs text-gray-500">{rowData.type}</span>
                                    </div>
                                )}
                            />
                            <Column
                                field="unit"
                                header="Unit"
                                body={(rowData) => (
                                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                                        {rowData.unit}
                                    </span>
                                )}
                            />
                            <Column
                                field="openingStock"
                                header="Opening Stock"
                                body={(rowData) => {
                                    // For FUEL type products, show tank allocations
                                    if (rowData.type === "FUEL" && rowData.tankAllocations && rowData.tankAllocations.length > 0) {
                                        return (
                                            <div className="flex flex-col gap-2">
                                                {rowData.tankAllocations.map((allocation: any, idx: number) => (
                                                    <div key={allocation.tankId} className="flex flex-col  gap-2">
                                                        <label className="text-xs text-gray-600 min-w-fit">
                                                            {allocation.tankName || `Tank ${idx + 1}`}:
                                                        </label>
                                                        <InputNumber
                                                            value={allocation.openingStock}
                                                            onValueChange={(e) => updateTankAllocation(rowData._id, allocation.tankId, e.value ?? null)}
                                                            min={0}
                                                            className="w-full"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    // For non-FUEL products, show single input
                                    return (
                                        <div className="flex items-center gap-2">
                                            <InputNumber
                                                value={rowData.openingStock}
                                                onValueChange={(e) => updateOpeningStockForProduct(rowData._id, e.value ?? null)}
                                                min={0}
                                                className="w-full"
                                            />
                                        </div>
                                    );
                                }}
                            />
                            <Column
                                field="costPrice"
                                header="Cost Price"
                                body={(rowData) => (
                                    <div className="flex items-center gap-1">
                                        <i className="pi pi-indian-rupee text-xs text-gray-500"></i>
                                        <span>{rowData.costPrice?.toFixed(2) || "0.00"}</span>
                                    </div>
                                )}
                            />
                            <Column
                                field="sellingPrice"
                                header="Selling Price"
                                body={(rowData) => (
                                    <div className="flex items-center gap-1">
                                        <i className="pi pi-indian-rupee text-xs text-green-600"></i>
                                        <span className="text-green-600 font-medium">
                                            {rowData.sellingPrice?.toFixed(2) || "0.00"}
                                        </span>
                                    </div>
                                )}
                            />
                            <Column
                                field="minimumStockAlert"
                                header="Min. Alert"
                                body={(rowData) => (
                                    <div className="flex items-center gap-2">
                                        <i className="pi pi-exclamation-triangle text-orange-500 text-xs"></i>
                                        <span className="text-sm">{rowData.minimumStockAlert || 0}</span>
                                    </div>
                                )}
                            />
                        </DataTable>
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <i className="pi pi-info-circle text-blue-600 mt-1"></i>
                                <div className="text-sm text-blue-800">
                                    <strong>Note:</strong> You can select and edit opening stock values for both FUEL (with tank allocation) and non-FUEL products together. they will be created in separate transactions.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-2 mt-6">
                    <Button
                        type="button"
                        label="Cancel"
                        severity="secondary"
                        outlined
                        onClick={onClose}
                        disabled={isSubmitting}
                    />
                    <Button
                        type="submit"
                        label="Create Opening Stock"
                        loading={isSubmitting}
                        disabled={isSubmitting || selectedProducts.length === 0}
                        icon="pi pi-check"
                    />
                </div>
                {/* Product Creation Dialog */}
                <Dialog
                    header={
                        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-600 mb-2 p-3 rounded-t-lg">
                            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
                                <i className="pi pi-box text-white text-2xl"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Create New Product</h2>
                                <p className="text-sm text-white/90">Add a new product to your inventory</p>
                            </div>
                        </div>
                    }
                    visible={showProductDialog}
                    style={{ width: "70vw" }}
                    onHide={() => setShowProductDialog(false)}
                    dismissableMask
                >
                    <ProductFrom
                        productId={null}
                        onClose={() => setShowProductDialog(false)}
                        onSuccess={handleProductCreated}
                    />
                </Dialog>            </form>
        );
    }

    // For Edit mode - show opening stock input or tank allocations
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {editProduct && editProduct.type === "FUEL" && editProduct.tankAllocations ? (
                // Show tank allocations for FUEL products
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="font-semibold text-sm mb-2 text-gray-700">
                            {editProduct.name} <span className="text-xs text-gray-500">({editProduct.type})</span>
                        </h3>
                        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border">
                            {editProduct.tankAllocations.map((allocation: any, idx: number) => (
                                <div key={allocation.tankId} className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-gray-700">
                                        {allocation.tankName || `Tank ${idx + 1}`} <span className="text-red-500">*</span>
                                    </label>
                                    <InputNumber
                                        value={allocation.openingStock}
                                        onValueChange={(e) => updateEditTankAllocation(allocation.tankId, e.value ?? null)}
                                        min={0}
                                        placeholder="Enter quantity"
                                        className="w-full"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <i className="pi pi-info-circle text-blue-600 mt-1"></i>
                            <div className="text-sm text-blue-800">
                                <strong>Note:</strong> Enter opening stock value for each allocated tank. Total will be calculated automatically.
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Show single opening stock input for non-FUEL products
                <div className="flex flex-col gap-2">
                    <label htmlFor="openingStock" className="font-medium text-sm">
                        Opening Stock <span className="text-red-500">*</span>
                    </label>
                    <Controller
                        name="openingStock"
                        control={control as any}
                        render={({ field }) => (
                            <InputNumber
                                id="openingStock"
                                value={field.value}
                                onValueChange={(e) => field.onChange(e.value)}
                                placeholder="Enter opening stock"
                                min={0}
                                className={`w-full ${(errors as any).openingStock ? "p-invalid" : ""}`}
                            />
                        )}
                    />
                    {(errors as any).openingStock && (
                        <small className="text-red-500">{(errors as any).openingStock.message}</small>
                    )}
                </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-2 mt-6">
                <Button
                    type="button"
                    label="Cancel"
                    severity="secondary"
                    outlined
                    onClick={onClose}
                    disabled={isSubmitting}
                />
                <Button
                    type="submit"
                    label="Update"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    icon="pi pi-check"
                />
            </div>
        </form>
    );
}

export default OpeningStockForm;
