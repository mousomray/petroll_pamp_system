"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";

type Props = {
    onClose: () => void;
    onSuccess: () => void;
};

type FormData = {
    paymentMethod: string;
    items: { productId: string; qty: number }[];
};

export default function SalesForm({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);

    const { register, handleSubmit, setValue, watch } = useForm<FormData>({
        defaultValues: { paymentMethod: "CASH", items: [{ productId: "", qty: 1 }] },
    });

    useEffect(() => {
        fetchAccessoryProducts();
    }, []);

    const fetchAccessoryProducts = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/api/product/dropdown-all-products");
            const all = res.data.products || [];
            setProducts(all.filter((p: any) => (p.type || "").toUpperCase() === "ACCESSORY"));
        } catch (err: any) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            setLoading(true);
            const payload = {
                paymentMethod: data.paymentMethod,
                items: data.items.map((it) => ({ productId: it.productId, qty: Number(it.qty) })),
            };
            const res = await axiosInstance.post("/api/sales/create-accessory-sales", payload);
            toast.success(res.data?.message || "Sale created");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to create sale");
        } finally {
            setLoading(false);
        }
    };

    const items = watch("items") || [];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Method</label>
                <select {...register("paymentMethod")} className="p-inputtext w-full">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Items</label>
                <div className="space-y-2">
                    {items.map((it: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                                <Dropdown
                                    value={it.productId}
                                    options={products.map((p) => ({ label: p.name, value: p._id }))}
                                    onChange={(e) => setValue(`items.${idx}.productId`, e.value)}
                                    placeholder="Select product"
                                />
                            </div>
                            <div>
                                <InputNumber
                                    value={it.qty}
                                    onValueChange={(e) => setValue(`items.${idx}.qty`, e.value ?? 0)}
                                    min={1}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" icon="pi pi-plus" className="p-button-text" onClick={() => setValue("items", [...items, { productId: "", qty: 1 }])} />
                                {items.length > 1 && (
                                    <Button type="button" icon="pi pi-times" className="p-button-text text-red-600" onClick={() => setValue("items", items.filter((_: any, i: number) => i !== idx))} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 pt-3">
                <Button type="button" label="Cancel" icon="pi pi-times" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700" />
                <Button type="submit" label="Create Sale" icon="pi pi-check" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white" loading={loading} />
            </div>
        </form>
    );
}
