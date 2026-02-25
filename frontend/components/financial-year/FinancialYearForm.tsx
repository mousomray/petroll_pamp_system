"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createFinancialYearSchema, updateFinancialYearSchema } from "@/helper/schema/Schema";

type CreateFinancialYearFormData = z.infer<typeof createFinancialYearSchema>;
type UpdateFinancialYearFormData = z.infer<typeof updateFinancialYearSchema>;

type FinancialYearFormProps = {
    financialYearId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

function FinancialYearForm({ financialYearId, onClose, onSuccess }: FinancialYearFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const isEditMode = !!financialYearId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateFinancialYearFormData | UpdateFinancialYearFormData>({
        resolver: zodResolver(isEditMode ? updateFinancialYearSchema : createFinancialYearSchema),
        defaultValues: isEditMode
            ? {
                name: "",
                startDate: "",
                endDate: "",
                isActive: true,
            }
            : {
                name: "",
                startDate: "",
                endDate: "",
                isActive: true,
            },
    });

    
    useEffect(() => {
        if (financialYearId) {
            fetchFinancialYearData();
        }
    }, [financialYearId]);

    const fetchFinancialYearData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/financial-year/get-single-financial/${financialYearId}`);
            const financialYear = res.data.financialYear;

            // Populate form with financial year data
            setValue("name", financialYear.name);
            setValue("startDate", financialYear.startDate);
            setValue("endDate", financialYear.endDate);
            if (isEditMode) {
                setValue("isActive", financialYear.isActive);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch financial year data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateFinancialYearFormData | UpdateFinancialYearFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/financial-year/update-financial/${financialYearId}`
                : `/api/financial-year/create-financial`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `Financial Year ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Financial year operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} financial year`);
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
                {/* Financial Year Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-calendar text-blue-600"></i>
                        Financial Year Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Financial Year Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Year Name <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-hashtag text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("name")}
                                    placeholder="e.g., 2024-2025"
                                />
                            </div>
                            {errors.name && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.name.message}
                                </small>
                            )}
                        </div>

                        {/* Empty cell for grid alignment */}
                        <div></div>

                        {/* Start Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-calendar-plus text-blue-600"></i>
                                </span>
                                <Controller
                                    name="startDate"
                                    control={control}
                                    render={({ field }) => (
                                        <Calendar
                                            value={field.value ? new Date(field.value) : null}
                                            onChange={(e) => {
                                                if (e.value) {
                                                    field.onChange(e.value.toISOString());
                                                }
                                            }}
                                            dateFormat="dd/mm/yy"
                                            placeholder="Select start date"
                                            className="w-full"
                                        />
                                    )}
                                />
                            </div>
                            {errors.startDate && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.startDate.message}
                                </small>
                            )}
                        </div>

                        {/* End Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-calendar-minus text-blue-600"></i>
                                </span>
                                <Controller
                                    name="endDate"
                                    control={control}
                                    render={({ field }) => (
                                        <Calendar
                                            value={field.value ? new Date(field.value) : null}
                                            onChange={(e) => {
                                                if (e.value) {
                                                    field.onChange(e.value.toISOString());
                                                }
                                            }}
                                            dateFormat="dd/mm/yy"
                                            placeholder="Select end date"
                                            className="w-full"
                                        />
                                    )}
                                />
                            </div>
                            {errors.endDate && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.endDate.message}
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
                                Active Financial Year
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
                        label={isSubmitting ? "Saving..." : isEditMode ? "Update Year" : "Create Year"}
                        icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default FinancialYearForm;
