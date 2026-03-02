"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const createTankSchema = z.object({
    tankName: z
        .string("Tank name is required")
        .min(1, "Tank name cannot be empty")
        .trim()
        .toUpperCase(),
    
    capacity: z
        .number("Capacity is required")
        .nonnegative("Capacity must be >= 0"),
});

const updateTankSchema = z.object({
    tankName: z
        .string("Tank name is required")
        .min(1, "Tank name cannot be empty")
        .trim()
        .toUpperCase()
        .optional(),
    
    capacity: z
        .number()
        .nonnegative("Capacity must be >= 0")
        .optional(),
    
    isActive: z
        .boolean()
        .optional(),
});

type CreateTankFormData = z.infer<typeof createTankSchema>;
type UpdateTankFormData = z.infer<typeof updateTankSchema>;

type TankFormProps = {
    tankId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

function TankForm({ tankId, onClose, onSuccess }: TankFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const isEditMode = !!tankId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateTankFormData | UpdateTankFormData>({
        resolver: zodResolver(isEditMode ? updateTankSchema : createTankSchema),
        defaultValues: isEditMode
            ? {
                tankName: "",
                capacity: 0,
                isActive: true,
            }
            : {
                tankName: "",
                capacity: 0,
            },
    });

    useEffect(() => {
        if (tankId) {
            fetchTankData();
        }
    }, [tankId]);

    const fetchTankData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/tank/single-tank/${tankId}`);
            const tank = res.data.data;

            setValue("tankName", tank.tankName);
            setValue("capacity", tank.capacity);
            if (isEditMode) {
                setValue("isActive", tank.isActive);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch tank data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateTankFormData | UpdateTankFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/tank/update-tank/${tankId}`
                : `/api/tank/create-tank`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `Tank ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Tank operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} tank`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-4">
                <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
            </div>
        );
    }

    return (
        <div className="px-4 pt-2 pb-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tank Name */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="tankName" className="font-medium text-sm">
                        Tank Name <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="tankName"
                        {...register("tankName")}
                        placeholder="Enter tank name"
                        className={`w-full ${errors.tankName ? "p-invalid" : ""}`}
                    />
                    {errors.tankName && (
                        <small className="text-red-500">{errors.tankName.message}</small>
                    )}
                </div>

                {/* Capacity */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="capacity" className="font-medium text-sm">
                        Capacity (Liters) <span className="text-red-500">*</span>
                    </label>
                    <Controller
                        name="capacity"
                        control={control}
                        render={({ field }) => (
                            <InputNumber
                                id="capacity"
                                value={field.value}
                                onValueChange={(e) => field.onChange(e.value)}
                                placeholder="Enter capacity"
                                min={0}
                                className={`w-full ${errors.capacity ? "p-invalid" : ""}`}
                                useGrouping={false}
                            />
                        )}
                    />
                    {errors.capacity && (
                        <small className="text-red-500">{errors.capacity.message}</small>
                    )}
                </div>

                {/* Current Quantity */}
                

                {/* IsActive (Only for Edit) */}
                {isEditMode && (
                    <div className="flex flex-col gap-2">
                        <label htmlFor="isActive" className="font-medium text-sm">
                            Status
                        </label>
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        inputId="isActive"
                                        checked={field.value ?? false}
                                        onChange={(e) => field.onChange(e.checked)}
                                    />
                                    <label htmlFor="isActive" className="cursor-pointer">
                                        Active
                                    </label>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-3">
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
        </div>
    );
}

export default TankForm;
