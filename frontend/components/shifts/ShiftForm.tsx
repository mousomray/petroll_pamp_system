"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { InputNumber } from "primereact/inputnumber";
import { useFieldArray } from "react-hook-form";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import WorkerForm from "@/components/worker/WorkerForm";
import NozzleForm from "@/components/nozzle/NozzleForm";

const shiftSchema = z.object({
  workerId: z.string().min(1, "Worker is required"),
  nozzles: z
    .array(
      z.object({
        nozzleId: z.string(),
        openingReading: z.number().min(0, "Opening reading must be >= 0"),
      })
    )
    .min(1, "At least one nozzle is required"),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

type ShiftFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function ShiftForm({ onClose, onSuccess }: ShiftFormProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [nozzles, setNozzles] = useState<any[]>([]);
  const [showWorkerDialog, setShowWorkerDialog] = useState(false);
  const [showNozzleDialog, setShowNozzleDialog] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      workerId: "",
      nozzles: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "nozzles",
  });

  const [selectedNozzleIds, setSelectedNozzleIds] = useState<string[]>([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchWorkers(), fetchNozzles()]);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await axiosInstance.get("/api/worker/dropdown-workers");
      setWorkers(res.data.data || []);
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load workers");
      } else {
        toast.error("Failed to load workers");
      }
    }
  };

  const fetchNozzles = async () => {
    try {
      const res = await axiosInstance.get("/api/nozzle/dropdown-nozzles");
      setNozzles(res.data.data || []);
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load nozzles");
      } else {
        toast.error("Failed to load nozzles");
      }
    }
  };

  const handleWorkerCreated = async () => {
    // Refresh worker list and auto-select new worker
    try {
      const res = await axiosInstance.get("/api/worker/dropdown-workers");
      const updatedWorkers = res.data.data || [];
      setWorkers(updatedWorkers);

      // Auto-select the newly created worker (last one)
      if (updatedWorkers.length > 0) {
        const newWorker = updatedWorkers[updatedWorkers.length - 1];
        setValue("workerId", newWorker._id);
        toast.success(`Worker "${newWorker.name}" added and selected`);
      }

      setShowWorkerDialog(false);
    } catch (error: any) {
      console.error("Failed to refresh workers:", error);
      setShowWorkerDialog(false);
    }
  };

  const handleNozzleCreated = async () => {
    // Refresh nozzle list and auto-select new nozzle
    try {
      const res = await axiosInstance.get("/api/nozzle/dropdown-nozzles");
      const updatedNozzles = res.data.data || [];
      setNozzles(updatedNozzles);

      // Auto-add the newly created nozzle to the selected nozzles
      if (updatedNozzles.length > 0) {
        const newNozzle = updatedNozzles[updatedNozzles.length - 1];
        const currentIds = selectedNozzleIds || [];
        const newIds = [...currentIds, newNozzle._id];
        setSelectedNozzleIds(newIds);
        // update form nozzles array
        const currentNozzles = getValues().nozzles || [];
        const newEntry = {
          nozzleId: newNozzle._id,
          openingReading: newNozzle.currentReading ?? newNozzle.initialReading ?? 0,
        };
        replace([...currentNozzles, newEntry]);
        toast.success(`Nozzle "${newNozzle.nozzleNumber}" added and selected`);
      }

      setShowNozzleDialog(false);
    } catch (error: any) {
      console.error("Failed to refresh nozzles:", error);
      setShowNozzleDialog(false);
    }
  };

  const onSubmit: SubmitHandler<ShiftFormData> = async (form) => {
    setIsSubmitting(true);
    try {
      const payload = {
        workerId: form.workerId,
        nozzles: form.nozzles,
      };
      const res = await axiosInstance.post("/api/shift/create-shift", payload);
      toast.success(res.data?.message || "Shift created successfully");
      onSuccess();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to create shift");
      } else {
        toast.error("Failed to create shift");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <i className="pi pi-spin pi-spinner text-3xl text-indigo-500"></i>
      </div>
    );
  }

  const workerOptions = workers.map((worker) => ({
    label: `${worker.name} - ${worker.workerType}`,
    value: worker._id,
  }));

  const nozzleOptions = nozzles.map((nozzle) => ({
    label: nozzle.nozzleNumber || 'Unnamed Nozzle',
    value: nozzle._id,
  }));

  return (
    <div className="px-4 pt-2 pb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Worker <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Controller
              name="workerId"
              control={control}
              render={({ field }) => (
                <Dropdown
                  value={field.value}
                  options={workerOptions}
                  onChange={(e) => field.onChange(e.value)}
                  placeholder="Choose a worker to start shift"
                  className="flex-1"
                  filter
                  showClear
                />
              )}
            />
            <Button
              type="button"
              icon="pi pi-plus"
              onClick={() => setShowWorkerDialog(true)}
              className="bg-blue-500 text-white border-0 hover:bg-blue-600"
              tooltip="Add New Worker"
              tooltipOptions={{ position: "top" }}
            />
          </div>
          {errors.workerId && (
            <small className="text-red-500 flex items-center gap-1">
              <i className="pi pi-exclamation-circle text-xs"></i>
              {errors.workerId.message}
            </small>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Select Nozzles <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <MultiSelect
              value={selectedNozzleIds}
              options={nozzleOptions}
              onChange={(e) => {
                const ids = e.value || [];
                setSelectedNozzleIds(ids as string[]);
                // synchronize form `nozzles` array
                const currentNozzles = getValues().nozzles || [];
                const newNozzles = (ids as string[]).map((id) => {
                  const existing = currentNozzles.find((n: any) => n.nozzleId === id);
                  if (existing) return existing;
                  const nozzleData = nozzles.find((nz) => nz._id === id);
                  return {
                    nozzleId: id,
                    openingReading: nozzleData?.currentReading ?? nozzleData?.initialReading ?? 0,
                  };
                });
                replace(newNozzles);
              }}
              placeholder="Choose nozzles for this shift"
              className="flex-1"
              display="chip"
              filter
              showClear
            />
            <Button
              type="button"
              icon="pi pi-plus"
              onClick={() => setShowNozzleDialog(true)}
              className="bg-green-500 text-white border-0 hover:bg-green-600"
              tooltip="Add New Nozzle"
              tooltipOptions={{ position: "top" }}
            />
          </div>
          {errors.nozzles && (
            <small className="text-red-500 flex items-center gap-1">
              <i className="pi pi-exclamation-circle text-xs"></i>
              {(errors.nozzles as any).message}
            </small>
          )}

          {/* Per-selected-nozzle opening reading inputs */}
          <div className="space-y-2 mt-2">
            {fields.map((f, idx) => {
              const nozzleMeta = nozzles.find((n) => n._id === f.nozzleId) || {};
              return (
                <div key={f.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">{nozzleMeta.nozzleNumber || 'Nozzle'}</label>
                    <InputNumber
                      value={f.openingReading as any}
                      onValueChange={(e) => setValue(`nozzles.${idx}.openingReading`, e.value ?? 0)}
                      mode="decimal"
                      min={0}
                      className="w-full"
                    />
                  </div>
                  <Button type="button" icon="pi pi-times" className="p-button-text text-red-600" onClick={() => {
                    // remove from both selected ids and form array
                    const currIds = selectedNozzleIds.filter(id => id !== f.nozzleId);
                    setSelectedNozzleIds(currIds);
                    remove(idx);
                  }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <i className="pi pi-info-circle text-blue-600 mt-0.5"></i>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Starting a new shift will:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Record the shift start time</li>
                <li>Set the shift status to OPEN</li>
                <li>Allow tracking of collections and transactions</li>
              </ul>
            </div>
          </div>
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
            label={isSubmitting ? "Starting Shift..." : "Start Shift"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-play"}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>

      {/* Worker Creation Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-2 rounded-t-lg">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <i className="pi pi-user text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add New Worker</h2>
              <p className="text-sm text-white/90">Create a new worker profile</p>
            </div>
          </div>
        }
        visible={showWorkerDialog}
        style={{ width: "60vw" }}
        breakpoints={{ "960px": "75vw", "641px": "95vw" }}
        onHide={() => setShowWorkerDialog(false)}
        dismissableMask
      >
        <WorkerForm
          workerId={null}
          onClose={() => setShowWorkerDialog(false)}
          onSuccess={handleWorkerCreated}
        />
      </Dialog>

      {/* Nozzle Creation Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-teal-600 mb-2 p-2 rounded-t-lg">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <i className="pi pi-filter text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add New Nozzle</h2>
              <p className="text-sm text-white/90">Create a new nozzle</p>
            </div>
          </div>
        }
        visible={showNozzleDialog}
        style={{ width: "60vw" }}
        breakpoints={{ "960px": "75vw", "641px": "95vw" }}
        onHide={() => setShowNozzleDialog(false)}
        dismissableMask
      >
        <NozzleForm
          nozzleId={null}
          onClose={() => setShowNozzleDialog(false)}
          onSuccess={handleNozzleCreated}
        />
      </Dialog>
    </div>
  );
}

export default ShiftForm;