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
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

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
}

function OpeningStockForm({ stockId, onClose, onSuccess }: OpeningStockFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
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
        if (stockId) {
            fetchStockData();
        }
    }, [stockId]);

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

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/financial-stock/single-financial-stocks/${stockId}`);
            const stock = res.data.data;
            if (isEditMode) {
                updateForm.setValue("openingStock", stock.openingStock);
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
                .map(p => ({ ...p, openingStock: p.quantity ?? 0 }));
            setSelectedProducts(selected);
        }
    }, [watchedProductIds, products, isEditMode]);

    const updateOpeningStockForProduct = (productId: string, value: number | null) => {
        setSelectedProducts(prev => prev.map(p => p._id === productId ? { ...p, openingStock: value ?? 0 } : p));
    };

    const onSubmit = async (data: CreateOpeningStockFormData | UpdateOpeningStockFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/financial-stock/update-financial-stock/${stockId}`
                : `/api/financial-stock/create-financial-stock`;

            const method = isEditMode ? 'put' : 'post';

            let payload: any = data;
            if (!isEditMode) {
                // transform selectedProducts to required payload
                payload = {
                    products: selectedProducts.map(p => ({ productId: p._id, openingStock: Number(p.openingStock) || 0 }))
                };
            }

            const res = await axiosInstance[method](url, payload);

            toast.success(res.data.message || `Opening stock ${isEditMode ? 'updated' : 'created'} successfully!`);
            if (isEditMode) {
                updateForm.reset();
            } else {
                createForm.reset();
            }
            onSuccess();
        } catch (error: any) {
            console.error("Opening stock operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} opening stock`);
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
                                className={`w-full ${(errors as any).productIds ? "p-invalid" : ""}`}
                            />
                        )}
                    />
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
                                body={(rowData) => (
                                    <div className="flex items-center gap-2">
                                        <InputNumber
                                            value={rowData.openingStock}
                                            onValueChange={(e) => updateOpeningStockForProduct(rowData._id, e.value ?? null)}
                                            min={0}
                                            className="w-full"
                                        />
                                    </div>
                                )}
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
                                    <strong>Note:</strong> You can edit the opening stock value for each selected product before creating the opening stock.
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
            </form>
        );
    }

    // For Edit mode - show only opening stock input
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
