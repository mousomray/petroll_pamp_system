"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";

const meterReadingSchema = z.object({
  readings: z.array(
    z.object({
      nozzleId: z.string(),
      openingReading: z.number().min(0, "Opening reading must be >= 0"),
    })
  ).min(1, "At least one nozzle reading is required"),
});

type MeterReadingFormData = z.infer<typeof meterReadingSchema>;

type MeterReadingFormProps = {
  shiftId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function MeterReadingForm({ shiftId, onClose, onSuccess }: MeterReadingFormProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftData, setShiftData] = useState<any>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeterReadingFormData>({
    resolver: zodResolver(meterReadingSchema),
    defaultValues: {
      readings: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "readings",
  });

  useEffect(() => {
    if (shiftId) {
      fetchShiftData();
    }
  }, [shiftId]);

  const fetchShiftData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/shift/get-single-shift/${shiftId}`);
      const data = res.data.data;
      setShiftData(data);

      // Initialize readings array with nozzles from shift
      // Prefill openingReading from nozzle.currentReading (fallback to initialReading or 0)
      const initialReadings = (data.nozzles || []).map((nozzle: any) => ({
        nozzleId: nozzle._id,
        openingReading: nozzle.currentReading ?? nozzle.initialReading ?? 0,
      }));

      reset({
        readings: initialReadings,
      });
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load shift data");
      } else {
        toast.error("Failed to load shift data");
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (form: MeterReadingFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        shiftId: shiftId,
        readings: form.readings,
      };

      const res = await axiosInstance.post("/api/meter-reading/create-opening", payload);
      toast.success(res.data?.message || "Opening readings recorded successfully");
      onSuccess();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to record readings");
      } else {
        toast.error("Failed to record readings");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <i className="pi pi-spin pi-spinner text-3xl text-purple-500"></i>
      </div>
    );
  }

  if (!shiftData) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-gray-500">No shift data available</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* Shift Info */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 mb-1">Worker</p>
            <p className="font-semibold text-gray-800">{shiftData.worker?.name || "N/A"}</p>
            <p className="text-xs text-gray-500">{shiftData.worker?.phone || ""}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Shift Start</p>
            <p className="font-semibold text-gray-800">
              {new Date(shiftData.shiftStart).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-list text-purple-600"></i>
            Nozzle Opening Readings
          </h3>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const nozzle = shiftData.nozzles?.[index];
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nozzle
                    </label>
                    <InputText
                      value={nozzle?.nozzleNumber || "Unknown Nozzle"}
                      disabled
                      className="w-full bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Opening Reading
                    </label>
                    <Controller
                      name={`readings.${index}.openingReading`}
                      control={control}
                      render={({ field }) => (
                        <InputNumber
                          value={field.value}
                          onValueChange={(e) => field.onChange(e.value)}
                          mode="decimal"
                          minFractionDigits={0}
                          maxFractionDigits={2}
                          min={0}
                          placeholder="Enter opening reading"
                          className="w-full"
                        />
                      )}
                    />
                    {errors.readings?.[index]?.openingReading && (
                      <small className="text-red-500 flex items-center gap-1">
                        <i className="pi pi-exclamation-circle text-xs"></i>
                        {errors.readings[index]?.openingReading?.message}
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {errors.readings && typeof errors.readings.message === 'string' && (
            <small className="text-red-500 flex items-center gap-1">
              <i className="pi pi-exclamation-circle text-xs"></i>
              {errors.readings.message}
            </small>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <i className="pi pi-info-circle text-blue-600 mt-0.5"></i>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Record the current meter reading for each nozzle</li>
                <li>Ensure readings are accurate before submitting</li>
                <li>These readings will be used to calculate sales</li>
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
            label={isSubmitting ? "Recording..." : "Record Readings"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}

export default MeterReadingForm;
