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

const createTankSchema = z.object({
    tankName: z.string().trim().min(2, "Tank name must be at least 2 characters").max(100, "Tank name too long"),
    productId: z.string().min(1, "Product is required"),
    capacity: z.number().positive("Capacity must be greater than 0"),
});

const updateTankSchema = z.object({
    tankName: z.string().trim().min(2, "Tank name must be at least 2 characters").max(100, "Tank name too long").optional(),
    capacity: z.number().positive("Capacity must be greater than 0").optional(),
    isActive: z.boolean().optional(),
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
    const [products, setProducts] = useState<any[]>([]);
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
                productId: "",
                capacity: 0,
            },
    });

    useEffect(() => {
        fetchProducts();
        if (tankId) {
            fetchTankData();
        }
    }, [tankId]);

    const fetchProducts = async () => {
        try {
            const res = await axiosInstance.get("/api/product/dropdown-products", {
                params: { page: 1, limit: 1000 },
            });
            setProducts(res.data.products || []);
        } catch (error: any) {
            toast.error("Failed to fetch products");
        }
    };

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
            <div className="flex justify-center items-center p-8">
                <i className="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        );
    }

    const productOptions = products.map((product) => ({
        label: `${product.name} (${product.unit})`,
        value: product._id,
    }));

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Product Dropdown (Only for Create) */}
                {!isEditMode && (
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
                                    className={`w-full ${(errors as any).productId ? "p-invalid" : ""}`}
                                />
                            )}
                        />
                        {(errors as any).productId && (
                            <small className="text-red-500">{(errors as any).productId.message}</small>
                        )}
                    </div>
                )}

                {/* Capacity */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="capacity" className="font-medium text-sm">
                        Capacity <span className="text-red-500">*</span>
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
                                min={1}
                                className={`w-full ${errors.capacity ? "p-invalid" : ""}`}
                            />
                        )}
                    />
                    {errors.capacity && (
                        <small className="text-red-500">{errors.capacity.message}</small>
                    )}
                </div>

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

export default TankForm;
