"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createProductSchema, updateProductSchema } from "@/helper/schema/Schema";

type CreateProductFormData = z.infer<typeof createProductSchema>;
type UpdateProductFormData = z.infer<typeof updateProductSchema>;

type ProductFormProps = {
    productId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

const productTypeOptions = [
    { label: "Fuel", value: "FUEL" },
    { label: "Oil", value: "OIL" },
    { label: "Tyre", value: "TYRE" },
    { label: "Accessory", value: "ACCESSORY" },
];

const unitOptions = [
    { label: "Litre", value: "LITRE" },
    { label: "Piece", value: "PIECE" },
    { label: "KG", value: "KG" },
    { label: "Box", value: "BOX" },
];

function ProductFrom({ productId, onClose, onSuccess }: ProductFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const isEditMode = !!productId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateProductFormData | UpdateProductFormData>({
        resolver: zodResolver(isEditMode ? updateProductSchema : createProductSchema),
        defaultValues: isEditMode
            ? {
                name: "",
                type: "FUEL",
                unit: "LITRE",
                costPrice: 0,
                sellingPrice: 0,
                minimumStockAlert: 0,
                isActive: true,
            }
            : {
                name: "",
                type: "FUEL",
                unit: "LITRE",
                costPrice: 0,
                sellingPrice: 0,
                minimumStockAlert: 0,
            },
    });

    // Fetch product data if editing
    useEffect(() => {
        if (productId) {
            fetchProductData();
        }
    }, [productId]);

    const fetchProductData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/product/single-product/${productId}`);
            const product = res.data.product;

            // Populate form with product data
            setValue("name", product.name);
            setValue("type", product.type);
            setValue("unit", product.unit);
            setValue("costPrice", product.costPrice);
            setValue("sellingPrice", product.sellingPrice);
            setValue("minimumStockAlert", product.minimumStockAlert);
            if (isEditMode) {
                setValue("isActive", product.isActive);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch product data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateProductFormData | UpdateProductFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/product/update-product/${productId}`
                : `/api/product/create-product`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `Product ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Product operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} product`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <i className="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
            </div>
        );
    }

    return (
        <div className="px-6 py-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Product Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-box text-blue-600"></i>
                        Product Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Product Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-tag text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("name")}
                                    placeholder="Enter product name"
                                />
                            </div>
                            {errors.name && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.name.message}
                                </small>
                            )}
                        </div>

                        {/* Product Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Product Type <span className="text-red-500">*</span>
                            </label>
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        {...field}
                                        options={productTypeOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select product type"
                                        className="w-full"
                                    />
                                )}
                            />
                            {errors.type && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.type.message}
                                </small>
                            )}
                        </div>

                        {/* Unit */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Unit <span className="text-red-500">*</span>
                            </label>
                            <Controller
                                name="unit"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        {...field}
                                        options={unitOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select unit"
                                        className="w-full"
                                    />
                                )}
                            />
                            {errors.unit && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.unit.message}
                                </small>
                            )}
                        </div>

                        {/* Cost Price */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Cost Price <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-dollar text-blue-600"></i>
                                </span>
                                <Controller
                                    name="costPrice"
                                    control={control}
                                    render={({ field }) => (
                                        <InputNumber
                                            value={field.value}
                                            onValueChange={(e) => field.onChange(e.value)}
                                            placeholder="Enter cost price"
                                            min={0}
                                            className="w-full"
                                            useGrouping={false}
                                            mode="decimal"
                                            minFractionDigits={2}
                                            maxFractionDigits={2}
                                        />
                                    )}
                                />
                            </div>
                            {errors.costPrice && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.costPrice.message}
                                </small>
                            )}
                        </div>

                        {/* Selling Price */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Selling Price <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-dollar text-blue-600"></i>
                                </span>
                                <Controller
                                    name="sellingPrice"
                                    control={control}
                                    render={({ field }) => (
                                        <InputNumber
                                            value={field.value}
                                            onValueChange={(e) => field.onChange(e.value)}
                                            placeholder="Enter selling price"
                                            min={0}
                                            className="w-full"
                                            useGrouping={false}
                                            mode="decimal"
                                            minFractionDigits={2}
                                            maxFractionDigits={2}
                                        />
                                    )}
                                />
                            </div>
                            {errors.sellingPrice && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.sellingPrice.message}
                                </small>
                            )}
                        </div>

                        {/* Minimum Stock Alert */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Minimum Stock Alert
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-bell text-blue-600"></i>
                                </span>
                                <Controller
                                    name="minimumStockAlert"
                                    control={control}
                                    render={({ field }) => (
                                        <InputNumber
                                            value={field.value}
                                            onValueChange={(e) => field.onChange(e.value)}
                                            placeholder="Enter minimum stock alert"
                                            min={0}
                                            className="w-full"
                                            useGrouping={false}
                                            mode="decimal"
                                            minFractionDigits={0}
                                            maxFractionDigits={2}
                                        />
                                    )}
                                />
                            </div>
                            {errors.minimumStockAlert && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.minimumStockAlert.message}
                                </small>
                            )}
                        </div>
                    </div>

                    {/* Active Status - Only for Edit Mode */}
                    {isEditMode && (
                        <div className="flex items-center gap-2 mt-4">
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        inputId="isActive"
                                        checked={field.value ?? false}
                                        onChange={(e) => field.onChange(e.checked)}
                                    />
                                )}
                            />
                            <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">
                                Active Product
                            </label>
                        </div>
                    )}
                </div>

                {/* SUBMIT BUTTONS */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        label="Cancel"
                        icon="pi pi-times"
                        onClick={onClose}
                        className="flex-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
                        outlined
                        disabled={isSubmitting}
                    />
                    <Button
                        type="submit"
                        label={isSubmitting ? "Saving..." : isEditMode ? "Update Product" : "Create Product"}
                        icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default ProductFrom;