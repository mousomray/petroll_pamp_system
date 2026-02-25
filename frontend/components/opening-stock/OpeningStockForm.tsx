"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const createOpeningStockSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    financialYearId: z.string().min(1, "Financial year is required"),
    openingStock: z.number().min(0, "Opening stock must be at least 0"),
});

const updateOpeningStockSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    financialYearId: z.string().min(1, "Financial year is required"),
    openingStock: z.number().min(0, "Opening stock must be at least 0"),
});

type CreateOpeningStockFormData = z.infer<typeof createOpeningStockSchema>;
type UpdateOpeningStockFormData = z.infer<typeof updateOpeningStockSchema>;

type OpeningStockFormProps = {
    stockId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

function OpeningStockForm({ stockId, onClose, onSuccess }: OpeningStockFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [financialYears, setFinancialYears] = useState<any[]>([]);
    const isEditMode = !!stockId;

    const {
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateOpeningStockFormData | UpdateOpeningStockFormData>({
        resolver: zodResolver(isEditMode ? updateOpeningStockSchema : createOpeningStockSchema),
        defaultValues: {
            productId: "",
            financialYearId: "",
            openingStock: 0,
        },
    });

    useEffect(() => {
        fetchProducts();
        fetchFinancialYears();
        if (stockId) {
            fetchStockData();
        }
    }, [stockId]);

    const fetchProducts = async () => {
        try {
            const res = await axiosInstance.get("/api/product/all-products", {
                params: { page: 1, limit: 1000 },
            });
            setProducts(res.data.products || []);
        } catch (error: any) {
            toast.error("Failed to fetch products");
        }
    };

    const fetchFinancialYears = async () => {
        try {
            const res = await axiosInstance.get("/api/financial-year/all-financials/active", {
                params: { page: 1, limit: 1000 },
            });
            setFinancialYears(res.data.financialYears || []);
        } catch (error: any) {
            toast.error("Failed to fetch financial years");
        }
    };

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/financial-stock/single-financial-stocks/${stockId}`);
            const stock = res.data.data;

            // Check if productId and financialYearId are objects or strings
            const productId = typeof stock.productId === 'object' ? stock.productId._id : stock.productId;
            const financialYearId = typeof stock.financialYearId === 'object' ? stock.financialYearId._id : stock.financialYearId;

            setValue("productId", productId);
            setValue("financialYearId", financialYearId);
            setValue("openingStock", stock.openingStock);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch stock data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateOpeningStockFormData | UpdateOpeningStockFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/financial-stock/update-financial-stock/${stockId}`
                : `/api/financial-stock/create-financial-stock`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `Opening stock ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
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

    const productOptions = products.map((product) => ({
        label: `${product.name} (${product.unit})`,
        value: product._id,
    }));

    const financialYearOptions = financialYears.map((fy) => ({
        label: fy.name,
        value: fy._id,
    }));

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Dropdown */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="productId" className="font-medium text-sm">
                        Product <span className="text-red-500">*</span>
                    </label>
                    <Controller
                        name="productId"
                        control={control}
                        render={({ field }) => (
                            <Dropdown
                                id="productId"
                                value={field.value}
                                onChange={(e) => field.onChange(e.value)}
                                options={productOptions}
                                placeholder="Select a product"
                                filter
                                className={`w-full ${errors.productId ? "p-invalid" : ""}`}
                                disabled={isEditMode}
                            />
                        )}
                    />
                    {errors.productId && (
                        <small className="text-red-500">{errors.productId.message}</small>
                    )}
                </div>

                {/* Financial Year Dropdown */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="financialYearId" className="font-medium text-sm">
                        Financial Year <span className="text-red-500">*</span>
                    </label>
                    <Controller
                        name="financialYearId"
                        control={control}
                        render={({ field }) => (
                            <Dropdown
                                id="financialYearId"
                                value={field.value}
                                onChange={(e) => field.onChange(e.value)}
                                options={financialYearOptions}
                                placeholder="Select a financial year"
                                filter
                                className={`w-full ${errors.financialYearId ? "p-invalid" : ""}`}
                                disabled={isEditMode}
                            />
                        )}
                    />
                    {errors.financialYearId && (
                        <small className="text-red-500">{errors.financialYearId.message}</small>
                    )}
                </div>

                {/* Opening Stock */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="openingStock" className="font-medium text-sm">
                        Opening Stock <span className="text-red-500">*</span>
                    </label>
                    <Controller
                        name="openingStock"
                        control={control}
                        render={({ field }) => (
                            <InputNumber
                                id="openingStock"
                                value={field.value}
                                onValueChange={(e) => field.onChange(e.value)}
                                placeholder="Enter opening stock"
                                min={0}
                                className={`w-full ${errors.openingStock ? "p-invalid" : ""}`}
                            />
                        )}
                    />
                    {errors.openingStock && (
                        <small className="text-red-500">{errors.openingStock.message}</small>
                    )}
                </div>
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
                    label={isEditMode ? "Update" : "Create"}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                />
            </div>
        </form>
    );
}

export default OpeningStockForm;
