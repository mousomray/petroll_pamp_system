"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createSupplierSchema, updateSupplierSchema } from "@/helper/schema/Schema";

type CreateSupplierFormData = z.infer<typeof createSupplierSchema>;
type UpdateSupplierFormData = z.infer<typeof updateSupplierSchema>;

type SupplierFormProps = {
    supplierId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

function SupplierForm({ supplierId, onClose, onSuccess }: SupplierFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const isEditMode = !!supplierId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateSupplierFormData | UpdateSupplierFormData>({
        resolver: zodResolver(isEditMode ? updateSupplierSchema : createSupplierSchema),
        defaultValues: isEditMode
            ? {
                name: "",
                email: "",
                phone: "",
                gstId: "",
                address: "",
                isActive: true,
            }
            : {
                name: "",
                email: "",
                phone: "",
                gstId: "",
                address: "",
                isActive: true,
            },
    });

    
    useEffect(() => {
        if (supplierId) {
            fetchSupplierData();
        }
    }, [supplierId]);

    const fetchSupplierData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/supplier/single-supplier/${supplierId}`);
            const supplier = res.data.supplier;

            // Populate form with supplier data
            setValue("name", supplier.name);
            setValue("email", supplier.email);
            setValue("phone", supplier.phone);
            setValue("gstId", supplier.gstId || "");
            setValue("address", supplier.address || "");
            if (isEditMode) {
                setValue("isActive", supplier.isActive);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch supplier data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateSupplierFormData | UpdateSupplierFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/supplier/update-supplier/${supplierId}`
                : `/api/supplier/create-supplier`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `Supplier ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Supplier operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} supplier`);
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
                {/* Supplier Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-building text-blue-600"></i>
                        Supplier Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Supplier Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Supplier Name <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-building text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("name")}
                                    placeholder="Enter supplier name"
                                />
                            </div>
                            {errors.name && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.name.message}
                                </small>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-envelope text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("email")}
                                    placeholder="Enter email address"
                                />
                            </div>
                            {errors.email && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.email.message}
                                </small>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-phone text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("phone")}
                                    placeholder="Enter phone number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    onKeyDown={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.altKey) return;
                                        const allowed = ["Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Tab", "Home", "End"];
                                        if (allowed.includes(e.key)) return;
                                        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                                    }}
                                />
                            </div>
                            {errors.phone && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.phone.message}
                                </small>
                            )}
                        </div>

                        {/* GST ID */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                GST ID
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-hashtag text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("gstId")}
                                    placeholder="Enter GST ID (15 digits)"
                                    maxLength={15}
                                />
                            </div>
                            {errors.gstId && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.gstId.message}
                                </small>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            Address
                        </label>
                        <div className="p-inputgroup">
                            <span className="p-inputgroup-addon bg-blue-50">
                                <i className="pi pi-map-marker text-blue-600"></i>
                            </span>
                            <InputTextarea
                                className="w-full"
                                {...register("address")}
                                placeholder="Enter supplier address"
                                rows={3}
                            />
                        </div>
                        {errors.address && (
                            <small className="text-red-500 flex items-center gap-1">
                                <i className="pi pi-exclamation-circle"></i>
                                {errors.address.message}
                            </small>
                        )}
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
                                Active Supplier
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
                        label={isSubmitting ? "Saving..." : isEditMode ? "Update Supplier" : "Create Supplier"}
                        icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default SupplierForm;
