"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createNozzleSchema, updateNozzleSchema } from "@/helper/schema/Schema";

type CreateNozzleFormData = z.infer<typeof createNozzleSchema>;
type UpdateNozzleFormData = z.infer<typeof updateNozzleSchema>;

type NozzleFormProps = {
    nozzleId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

function NozzleForm({ nozzleId, onClose, onSuccess }: NozzleFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tanks, setTanks] = useState<any[]>([]);
    const [selectedNozzle, setSelectedNozzle] = useState<any | null>(null);
    const isEditMode = !!nozzleId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateNozzleFormData | UpdateNozzleFormData>({
        resolver: zodResolver(isEditMode ? updateNozzleSchema : createNozzleSchema) as any,
        defaultValues: isEditMode
            ? {
                nozzleNumber: "",
                tank: "",
                machineName: "",
                initialReading: 0,
                status: "ACTIVE",
            }
            : {
                nozzleNumber: "",
                tank: "",
                machineName: "",
                initialReading: 0,
                status: "ACTIVE",
            },
    });

    useEffect(() => {
        fetchTanks();
        if (nozzleId) {
            fetchNozzleData();
        }
    }, [nozzleId]);

    const fetchTanks = async () => {
        try {
            const res = await axiosInstance.get("/api/tank/dropdown-tanks");
            setTanks(res.data.data || []);
        } catch (error: any) {
            toast.error("Failed to fetch tanks");
        }
    };

    const fetchNozzleData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/nozzle/single-nozzle/${nozzleId}`);
            const nozzle = res.data.data;

            setSelectedNozzle(nozzle);
            setValue("nozzleNumber", nozzle.nozzleNumber);
            // Extract tank ID if it's an object, otherwise use it directly
            const tankId = typeof nozzle.tank === 'object' ? nozzle.tank._id : nozzle.tank;
            setValue("tank", tankId);
            setValue("machineName", nozzle.machineName || "");
            // set initialReading if present on the nozzle
            setValue("initialReading", nozzle.initialReading ?? 0);
            // set status if present on the nozzle
            setValue("status", nozzle.status ?? "ACTIVE");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch nozzle data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const fetchTankName = (tankData: any) => {
        // If tank is an object with tankName, return it directly
        if (typeof tankData === 'object' && tankData?.tankName) {
            return tankData.tankName;
        }
        // If tank is an ID, try to find it in tanks array
        if (typeof tankData === 'string' && tankData) {
            const tank = tanks.find(t => t._id === tankData);
            return tank?.tankName || "";
        }
        return "";
    };

    const onSubmit = async (data: CreateNozzleFormData | UpdateNozzleFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/nozzle/update-nozzle/${nozzleId}`
                : `/api/nozzle/create-nozzle`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `Nozzle ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Nozzle operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} nozzle`);
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

    const tankOptions = tanks.map((tank) => ({
        label: tank.tankName,
        value: tank._id,
    }));

    const statusOptions = [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Maintenance", value: "MAINTENANCE" },
    ];

    return (
        <div className="px-4 pt-2 pb-4 min-h-[60vh]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nozzle Number */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="nozzleNumber" className="font-medium text-sm">
                        Nozzle Number <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="nozzleNumber"
                        {...register("nozzleNumber")}
                        placeholder="Enter nozzle number"
                        className={`w-full ${errors.nozzleNumber ? "p-invalid" : ""}`}
                    />
                    {errors.nozzleNumber && (
                        <small className="text-red-500">{errors.nozzleNumber.message}</small>
                    )}
                </div>

                {/* Tank Dropdown */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="tank" className="font-medium text-sm">
                        Tank <span className="text-red-500">{!isEditMode ? "*" : ""}</span>
                    </label>
                    <Controller
                        name="tank"
                        control={control}
                        render={({ field }) => (
                            <Dropdown
                                id="tank"
                                value={field.value}
                                onChange={(e) => field.onChange(e.value)}
                                options={tankOptions}
                                placeholder="Select a tank"
                                filter
                                className={`w-full ${(errors as any).tank ? "p-invalid" : ""}`}
                            />
                        )}
                    />
                    {(errors as any).tank && (
                        <small className="text-red-500">{(errors as any).tank.message}</small>
                    )}
                </div>

                {/* Machine Name */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="machineName" className="font-medium text-sm">
                        Machine Name
                    </label>
                    <InputText
                        id="machineName"
                        {...register("machineName")}
                        placeholder="Enter machine name (e.g., Machine-1)"
                        className={`w-full ${errors.machineName ? "p-invalid" : ""}`}
                    />
                    {errors.machineName && (
                        <small className="text-red-500">{errors.machineName.message}</small>
                    )}
                </div>

                {/* Initial Reading
                <div className="flex flex-col gap-2">
                    <label htmlFor="initialReading" className="font-medium text-sm">
                        Initial Reading <span className="text-red-500">*</span>
                    </label>
                    <InputText
                        id="initialReading"
                        type="number"
                        step="0.01"
                        {...register("initialReading", { valueAsNumber: true })}
                        placeholder="Enter initial reading"
                        className={`w-full ${errors.initialReading ? "p-invalid" : ""}`}
                    />
                    {errors.initialReading && (
                        <small className="text-red-500">{errors.initialReading.message}</small>
                    )}
                </div> */}

                {/* Status Dropdown */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="status" className="font-medium text-sm">
                        Status
                    </label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Dropdown
                                id="status"
                                value={field.value}
                                onChange={(e) => field.onChange(e.value)}
                                options={statusOptions}
                                placeholder="Select status"
                                className={`w-full ${(errors as any).status ? "p-invalid" : ""}`}
                            />
                        )}
                    />
                    {(errors as any).status && (
                        <small className="text-red-500">{(errors as any).status.message}</small>
                    )}
                </div>
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

export default NozzleForm;
