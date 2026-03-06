"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";

const workerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // email and phone are optional: allow either a valid value or an empty string
  email: z.union([z.string().email("Invalid email"), z.literal("")]),
  phone: z.union([z.string().min(6, "Phone must be at least 6 characters"), z.literal("")]),
  workerType: z.string().min(1, "Worker type is required"),
  isActive: z.boolean().optional(),
});

type WorkerFormData = z.infer<typeof workerSchema>;

type WorkerFormProps = {
  workerId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function WorkerForm({ workerId = null, onClose, onSuccess }: WorkerFormProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      workerType: "",
      isActive: true,
    },
  });

  useEffect(() => {
    const load = async () => {
      if (!workerId) return;
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/worker/get-single-worker/${workerId}`);
        const data = res.data?.data || null;
        if (data) {
          reset({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            workerType: data.workerType || "",
            isActive: typeof data.isActive === "boolean" ? data.isActive : true,
          });
        }
      } catch (err: any) {
        if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to load worker");
        else toast.error("Failed to load worker");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workerId, reset]);

  const onSubmit = async (form: WorkerFormData) => {
    setIsSubmitting(true);
    try {
      if (workerId) {
        // include isActive in edit
        const payload: any = {
          name: form.name,
          workerType: form.workerType,
          isActive: form.isActive,
        };
        if (form.email && String(form.email).trim() !== "") payload.email = String(form.email).trim();
        if (form.phone && String(form.phone).trim() !== "") payload.phone = String(form.phone).trim();
        const res = await axiosInstance.put(`/api/worker/update-worker/${workerId}`, payload);
        toast.success(res.data?.message || "Worker updated");
      } else {
        const payload: any = {
          name: form.name,
          workerType: form.workerType,
        };
        if (form.email && String(form.email).trim() !== "") payload.email = String(form.email).trim();
        if (form.phone && String(form.phone).trim() !== "") payload.phone = String(form.phone).trim();
        const res = await axiosInstance.post(`/api/worker/create-worker`, payload);
        toast.success(res.data?.message || "Worker created");
      }

      onSuccess();
      reset();
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to save worker");
      else toast.error("Failed to save worker");
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

  const workerTypeOptions = [
    { label: "Nozzle Boy", value: "NOZZLE_BOY" },
    { label: "Sweeper", value: "SWEEPER" },
    { label: "Security", value: "SECURITY" },
    { label: "Tank Operator", value: "TANK_OPERATOR" },
    { label: "Supervisor", value: "SUPERVISOR" },
  ];

  return (
    <div className="px-4 pt-2 pb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <InputText value={field.value} onChange={(e) => field.onChange(e.target.value)} className="w-full" />
              )}
            />
            {errors.name && <small className="text-red-500">{errors.name.message}</small>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <InputText value={field.value} onChange={(e) => field.onChange(e.target.value)} className="w-full" />
              )}
            />
            {errors.email && <small className="text-red-500">{errors.email.message}</small>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Phone</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <InputText value={field.value} onChange={(e) => field.onChange(e.target.value)} className="w-full" />
              )}
            />
            {errors.phone && <small className="text-red-500">{errors.phone.message}</small>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Worker Type <span className="text-red-500">*</span></label>
            <Controller
              name="workerType"
              control={control}
              render={({ field }) => (
                <Dropdown
                  value={field.value}
                  options={workerTypeOptions}
                  onChange={(e) => field.onChange(e.value)}
                  placeholder="Select type"
                  className="w-full"
                />
              )}
            />
            {errors.workerType && <small className="text-red-500">{errors.workerType.message}</small>}
          </div>

          {workerId && (
            <div className="space-y-1 flex items-center gap-3">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.checked)} />
                    <label className="text-sm font-medium">Is Active</label>
                  </div>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-3">
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
            label={isSubmitting ? (workerId ? "Updating..." : "Creating...") : workerId ? "Update Worker" : "Create Worker"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
            disabled={isSubmitting}
          />
        </div>
      </form>

      <ToastContainer position="top-right" />
    </div>
  );
}

export default WorkerForm;
