"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

// Simple schema matching exact payload requirements
const simplePurchaseSchema = z.object({
    supplierId: z.string().min(1, "Supplier is required"),
    purchaseDate: z.date(),
    paymentMethod: z.enum(["CASH", "BANK", "UPI", "CARD"]),
    items: z.array(z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.number().positive("Quantity must be greater than 0"),
        tankId: z.string().nullable(),
    })).min(1, "At least one item is required"),
});

type CreatePurchaseFormData = z.infer<typeof simplePurchaseSchema>;

type PurchaseFormProps = {
    onClose: () => void;
    onSuccess: () => void;
};

function PurchaseForm({ onClose, onSuccess }: PurchaseFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [itemTanks, setItemTanks] = useState<Record<number, any[]>>({});
    const [itemTankLoading, setItemTankLoading] = useState<Record<number, boolean>>({});

    const {
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreatePurchaseFormData>({
        resolver: zodResolver(simplePurchaseSchema),
        defaultValues: {
            supplierId: "",
            purchaseDate: new Date(),
            paymentMethod: "CASH",
            items: [
                {
                    productId: "",
                    quantity: 1,
                    tankId: null,
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const watchedItems = watch("items");

    const paymentMethodOptions = [
        { label: "Cash", value: "CASH" },
        { label: "Bank", value: "BANK" },
        { label: "UPI", value: "UPI" },
        { label: "Card", value: "CARD" },
    ];

    useEffect(() => {
        fetchDropdownData();
    }, []);

    const fetchDropdownData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchSuppliers(),
                fetchProducts(),
            ]);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await axiosInstance.get("/api/supplier/dropdown-suppliers", {
                params: { page: 1, limit: 1000 },
            });
            setSuppliers(res.data.suppliers || []);
        } catch (error: any) {
            toast.error("Failed to fetch suppliers");
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axiosInstance.get("/api/product/dropdown-all-products");
            setProducts(res.data.products || []);
        } catch (error: any) {
            toast.error("Failed to fetch products");
        }
    };

    const onSubmit = async (data: CreatePurchaseFormData) => {
        setIsSubmitting(true);
        try {
            // Format date to YYYY-MM-DD
            const formattedDate = new Date(data.purchaseDate).toISOString().split("T")[0];

            // Build exact payload as requested
            const payload = {
                supplierId: data.supplierId,
                purchaseDate: formattedDate,
                paymentMethod: data.paymentMethod,
                items: data.items.map((item) => ({
                    productId: item.productId,
                    quantity: Number(item.quantity),
                    tankId: item.tankId || null,
                })),
            };

            const res = await axiosInstance.post("/api/purchase/create-product-purchase", payload);

            toast.success(res.data.message || "Purchase created successfully!");
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Purchase creation error:", error);
            toast.error(error.response?.data?.message || "Failed to create purchase");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItem = () => {
        append({
            productId: "",
            quantity: 1,
            tankId: null,
        });
    };

    const removeItem = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        } else {
            toast.warning("At least one item is required");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <i className="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
            </div>
        );
    }

    const supplierOptions = suppliers.map((supplier) => ({
        label: `${supplier.name} - ${supplier.phone}`,
        value: supplier._id,
    }));

    const productOptions = products.map((product) => ({
        label: `${product.name} (${product.unit})`,
        value: product._id,
    }));

    return (
        <div className="px-6 py-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Purchase Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-shopping-cart text-blue-600"></i>
                        Purchase Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Supplier */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Supplier <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-users text-blue-600"></i>
                                </span>
                                <Controller
                                    name="supplierId"
                                    control={control}
                                    render={({ field }) => (
                                        <Dropdown
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.value)}
                                            options={supplierOptions}
                                            placeholder="Select supplier"
                                            filter
                                            className="w-full"
                                        />
                                    )}
                                />
                            </div>
                            {errors.supplierId && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.supplierId.message}
                                </small>
                            )}
                        </div>

                        {/* Purchase Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Purchase Date <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-calendar-plus text-blue-600"></i>
                                </span>
                                <Controller
                                    name="purchaseDate"
                                    control={control}
                                    render={({ field }) => (
                                        <Calendar
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.value)}
                                            dateFormat="dd/mm/yy"
                                            placeholder="Select purchase date"
                                            className="w-full"
                                        />
                                    )}
                                />
                            </div>
                            {errors.purchaseDate && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.purchaseDate.message}
                                </small>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Payment Method <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-wallet text-blue-600"></i>
                                </span>
                                <Controller
                                    name="paymentMethod"
                                    control={control}
                                    render={({ field }) => (
                                        <Dropdown
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.value)}
                                            options={paymentMethodOptions}
                                            placeholder="Select payment method"
                                            className="w-full"
                                        />
                                    )}
                                />
                            </div>
                            {errors.paymentMethod && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.paymentMethod.message}
                                </small>
                            )}
                        </div>
                    </div>
                </div>

                {/* Purchase Items */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <i className="pi pi-list text-blue-600"></i>
                            Purchase Items
                        </h3>
                        <Button
                            type="button"
                            label="Add Item"
                            icon="pi pi-plus"
                            onClick={addItem}
                            className="bg-blue-500 text-white border-0 px-3 py-2 text-sm"
                            size="small"
                        />
                    </div>

                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-gray-700">
                                    Item #{index + 1}
                                </h4>
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        icon="pi pi-trash"
                                        onClick={() => removeItem(index)}
                                        className="bg-red-500 text-white border-0 p-2"
                                        size="small"
                                        rounded
                                        outlined
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Product */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Product <span className="text-red-500">*</span>
                                    </label>
                                    <Controller
                                        name={`items.${index}.productId`}
                                        control={control}
                                        render={({ field }) => (
                                            <Dropdown
                                                value={field.value}
                                                onChange={async (e) => {
                                                    field.onChange(e.value);
                                                    const newProd = products.find(p => p._id === e.value);
                                                    const unit = newProd?.unit?.toString()?.toUpperCase();
                                                    // If product is litre, fetch tanks for that product
                                                    if (unit === 'LITRE' || unit === 'LITER') {
                                                        try {
                                                            setItemTankLoading(prev => ({ ...prev, [index]: true }));
                                                            const res = await axiosInstance.get(`/api/tank/tanks-by-product/${e.value}`);
                                                            const data = res.data?.data || [];
                                                            setItemTanks(prev => ({ ...prev, [index]: data }));
                                                            if (data.length > 0) {
                                                                setValue(`items.${index}.tankId`, data[0]._id);
                                                            } else {
                                                                setValue(`items.${index}.tankId`, null);
                                                            }
                                                        } catch (err) {
                                                            console.error("Failed to fetch tanks", err);
                                                            setItemTanks(prev => ({ ...prev, [index]: [] }));
                                                            setValue(`items.${index}.tankId`, null);
                                                        } finally {
                                                            setItemTankLoading(prev => ({ ...prev, [index]: false }));
                                                        }
                                                    } else {
                                                        setItemTanks(prev => ({ ...prev, [index]: [] }));
                                                        setValue(`items.${index}.tankId`, null);
                                                    }
                                                }}
                                                options={productOptions}
                                                placeholder="Select product"
                                                filter
                                                className="w-full"
                                            />
                                        )}
                                    />
                                    {errors.items?.[index]?.productId && (
                                        <small className="text-red-500 flex items-center gap-1">
                                            <i className="pi pi-exclamation-circle"></i>
                                            {errors.items[index]?.productId?.message}
                                        </small>
                                    )}
                                </div>

                                {/* Quantity */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <Controller
                                        name={`items.${index}.quantity`}
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                value={field.value}
                                                onValueChange={(e) => field.onChange(e.value ?? 1)}
                                                placeholder="Enter quantity"
                                                min={1}
                                                className="w-full"
                                            />
                                        )}
                                    />
                                    {errors.items?.[index]?.quantity && (
                                        <small className="text-red-500 flex items-center gap-1">
                                            <i className="pi pi-exclamation-circle"></i>
                                            {errors.items[index]?.quantity?.message}
                                        </small>
                                    )}
                                </div>

                                {/* Tank (only for LITRE products) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Tank
                                    </label>
                                    {(() => {
                                        const selectedProductId = watchedItems?.[index]?.productId;
                                        const selectedProduct = products.find(p => p._id === selectedProductId);
                                        const unit = selectedProduct?.unit?.toString()?.toUpperCase();
                                        const showTank = unit === 'LITRE' || unit === 'LITER';
                                        
                                        if (!showTank) {
                                            return <div className="text-sm text-gray-500 pt-2">Not applicable</div>;
                                        }
                                        
                                        const options = (itemTanks[index] || []).map((t) => ({ 
                                            label: `${t.tankName} - Capacity: ${t.capacity}`, 
                                            value: t._id 
                                        }));
                                        
                                        return (
                                            <>
                                                {itemTankLoading[index] ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                                                        <i className="pi pi-spin pi-spinner"></i>
                                                        Loading tanks...
                                                    </div>
                                                ) : options.length === 0 ? (
                                                    <div className="text-sm text-gray-600 pt-2">No tank available</div>
                                                ) : (
                                                    <Controller
                                                        name={`items.${index}.tankId`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Dropdown
                                                                value={field.value}
                                                                onChange={(e) => field.onChange(e.value)}
                                                                options={options}
                                                                placeholder="Select tank"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {errors.items && typeof errors.items.message === 'string' && (
                        <small className="text-red-500 flex items-center gap-1">
                            <i className="pi pi-exclamation-circle"></i>
                            {errors.items.message}
                        </small>
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
                        label={isSubmitting ? "Creating..." : "Create Purchase"}
                        icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default PurchaseForm;
