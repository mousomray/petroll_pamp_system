"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

// Simple schema matching exact payload requirements
const simplePurchaseSchema = z.object({
    supplierId: z.string().min(1, "Supplier is required"),
    purchaseDate: z.date(),
    invoiceNo: z.string().optional(),
    paymentMethod: z.enum(["CASH", "BANK", "UPI", "CARD"]),
    items: z.array(z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.number().positive("Quantity must be greater than 0"),
        tankId: z.string().nullable(),
        tankDistributions: z.array(z.object({
            tankId: z.string().min(1, "Tank is required"),
            quantity: z.number().nonnegative("Quantity must be >= 0"),
        })).optional(),
    })).min(1, "At least one item is required"),
});

type CreatePurchaseFormData = z.infer<typeof simplePurchaseSchema>;

type PurchaseFormProps = {
    onClose: () => void;
    onSuccess: () => void;
    editId?: string;
    initialData?: any;
};

function PurchaseForm({ onClose, onSuccess, editId, initialData }: PurchaseFormProps) {
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
                invoiceNo: "",
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

    // When initialData is provided (edit mode), populate the form
    useEffect(() => {
        const loadInitial = async () => {
            if (!initialData) return;

            try {
                setLoading(true);
                    const mapped: any = {
                    supplierId: initialData.supplier?._id || initialData.supplierId || "",
                    invoiceNo: initialData.invoiceNo || "",
                    purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate) : new Date(),
                    paymentMethod: initialData.paymentMethod || "CASH",
                    items: (initialData.items || []).map((it: any) => {
                        const prodId = it.productId || it.product?._id || "";
                        const qty = Number(it.quantity) || 0;
                        const tankId = it.tankId || it.tank?._id || null;
                        let dists: any[] = [];
                        if (Array.isArray(it.tankDistributions) && it.tankDistributions.length > 0) {
                            dists = it.tankDistributions.map((d: any) => ({ tankId: d.tankId, quantity: Number(d.quantity) || 0 }));
                        } else if (tankId) {
                            // fallback: convert single tankId into distributions
                            dists = [{ tankId, quantity: qty }];
                        }

                        return {
                            productId: prodId,
                            quantity: qty,
                            tankId: tankId,
                            tankDistributions: dists,
                        };
                    }),
                };

                // reset form values
                reset(mapped);

                // fetch tanks for each item product and set itemTanks
                const items = mapped.items || [];
                await Promise.all(items.map(async (it: any, ix: number) => {
                    if (!it.productId) return;
                    try {
                        setItemTankLoading(prev => ({ ...prev, [ix]: true }));
                        const resp = await axiosInstance.get(`/api/tank/tanks-by-product/${it.productId}`);
                        const data = resp.data?.data || [];
                        setItemTanks(prev => ({ ...prev, [ix]: data }));
                    } catch (e) {
                        setItemTanks(prev => ({ ...prev, [ix]: [] }));
                    } finally {
                        setItemTankLoading(prev => ({ ...prev, [ix]: false }));
                    }
                }));
            } catch (err) {
                console.error('Failed to load initial purchase data', err);
            } finally {
                setLoading(false);
            }
        };

        loadInitial();
    }, [initialData, reset]);

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
                invoiceNo: data.invoiceNo,
                supplierId: data.supplierId,
                purchaseDate: formattedDate,
                paymentMethod: data.paymentMethod,
                items: data.items.map((item) => ({
                    productId: item.productId,
                    quantity: Number(item.quantity),
                    tankDistributions: (item.tankDistributions || []).map((d: any) => ({
                        tankId: d.tankId,
                        quantity: Number(d.quantity) || 0,
                    })),
                })),
            };

            let res;
            if (editId) {
                // update existing purchase
                res = await axiosInstance.put(`/api/purchase/update-purchase/${editId}`, payload);
                toast.success(res.data.message || "Purchase updated successfully!");
            } else {
                res = await axiosInstance.post("/api/purchase/create-product-purchase", payload);
                toast.success(res.data.message || "Purchase created successfully!");
            }

            reset();
            onSuccess();
        } catch (error: any) {
            console.error("Purchase save error:", error);
            toast.error(error.response?.data?.message || "Failed to save purchase");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItem = () => {
        const nextIndex = fields.length;
        append({
            productId: "",
            quantity: 1,
            tankId: null,
            tankDistributions: [],
        });
        // ensure itemTanks and loading have an entry for the new index
        setItemTanks(prev => ({ ...prev, [nextIndex]: [] }));
        setItemTankLoading(prev => ({ ...prev, [nextIndex]: false }));
    };

    const removeItem = (index: number) => {
        if (fields.length > 1) {
            remove(index);
            // shift itemTanks and itemTankLoading indexes to remain in sync with fields
            setItemTanks(prev => {
                const next: Record<number, any[]> = {};
                Object.keys(prev).map(k => Number(k)).sort((a,b)=>a-b).forEach((k) => {
                    if (k < index) next[k] = prev[k];
                    else if (k > index) next[k-1] = prev[k];
                });
                return next;
            });
            setItemTankLoading(prev => {
                const next: Record<number, boolean> = {};
                Object.keys(prev).map(k => Number(k)).sort((a,b)=>a-b).forEach((k) => {
                    if (k < index) next[k] = prev[k];
                    else if (k > index) next[k-1] = prev[k];
                });
                return next;
            });
        } else {
            toast.warning("At least one item is required");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-4">
                <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
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
        <div className="px-4 pt-2 pb-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Purchase Information */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-shopping-cart text-blue-600"></i>
                        Purchase Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Invoice No */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Invoice No
                            </label>
                            <Controller
                                name="invoiceNo"
                                control={control}
                                render={({ field }) => (
                                    <InputText
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        placeholder="Invoice No"
                                        className="w-full"
                                    />
                                )}
                            />
                        </div>
                        {/* Supplier */}
                        <div className="space-y-1">
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
                <div className="space-y-3">
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
                            className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50"
                        >
                            <div className="flex items-center justify-between mb-1">
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
                            
                            {/* Product and Quantity in 2 columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Product */}
                                <div className="space-y-1">
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
                                                            // Initialize one distribution for better UX
                                                            if (data.length > 0) {
                                                                setValue(`items.${index}.tankId`, data[0]._id);
                                                                setValue(`items.${index}.tankDistributions`, [{ tankId: data[0]._id, quantity: 0 }]);
                                                            } else {
                                                                setValue(`items.${index}.tankId`, null);
                                                                setValue(`items.${index}.tankDistributions`, []);
                                                            }
                                                        } catch (err) {
                                                            console.error("Failed to fetch tanks", err);
                                                            setItemTanks(prev => ({ ...prev, [index]: [] }));
                                                            setValue(`items.${index}.tankId`, null);
                                                            setValue(`items.${index}.tankDistributions`, []);
                                                        } finally {
                                                            setItemTankLoading(prev => ({ ...prev, [index]: false }));
                                                        }
                                                    } else {
                                                        setItemTanks(prev => ({ ...prev, [index]: [] }));
                                                        setValue(`items.${index}.tankId`, null);
                                                        setValue(`items.${index}.tankDistributions`, []);
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
                                <div className="space-y-1">
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
                            </div>

                            {/* Tank Distributions - Full Width Section Below */}
                            {(() => {
                                const selectedProductId = watchedItems?.[index]?.productId;
                                const selectedProduct = products.find(p => p._id === selectedProductId);
                                const unit = selectedProduct?.unit?.toString()?.toUpperCase();
                                const showTank = unit === 'LITRE' || unit === 'LITER';
                                
                                if (!showTank) {
                                    return null;
                                }
                                
                                const options = (itemTanks[index] || []).map((t) => ({ 
                                    label: `${t.tankName} - Capacity: ${t.capacity}`, 
                                    value: t._id 
                                }));
                                
                                return (
                                    <div className="mt-3 space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <i className="pi pi-database text-blue-600"></i>
                                            Tank Distributions
                                        </label>
                                        
                                        {itemTankLoading[index] ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-white border rounded-md">
                                                <i className="pi pi-spin pi-spinner"></i>
                                                Loading tanks...
                                            </div>
                                        ) : options.length === 0 ? (
                                            <div className="text-sm text-gray-600 p-3 bg-white border rounded-md">
                                                No tanks available for this product
                                            </div>
                                        ) : (
                                            <div className="border rounded-md p-3 bg-white space-y-2">
                                                {(() => {
                                                    const current = (watchedItems && watchedItems[index]?.tankDistributions) || [];
                                                    const totalDist = current.reduce((s: number, t: any) => s + (Number(t.quantity) || 0), 0);
                                                    const totalQty = Number(watchedItems?.[index]?.quantity) || 0;

                                                    return (
                                                        <>
                                                            {current.map((dist: any, dIdx: number) => (
                                                                <div key={`${index}-${dIdx}`} className="grid grid-cols-12 gap-2 items-start">
                                                                    <div className="col-span-7">
                                                                        <label className="text-xs text-gray-600 mb-1 block">Tank</label>
                                                                        <Dropdown
                                                                            value={dist.tankId}
                                                                            options={options}
                                                                            onChange={(ev) => {
                                                                                const all = JSON.parse(JSON.stringify(watchedItems || []));
                                                                                if (!all[index].tankDistributions) all[index].tankDistributions = [];
                                                                                all[index].tankDistributions[dIdx].tankId = ev.value;
                                                                                setValue('items', all);
                                                                            }}
                                                                            optionLabel="label"
                                                                            optionValue="value"
                                                                            placeholder="Select tank"
                                                                            className="w-full"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-4">
                                                                        <label className="text-xs text-gray-600 mb-1 block">Quantity</label>
                                                                        <InputNumber
                                                                            value={dist.quantity}
                                                                            onValueChange={(ev) => {
                                                                                const all = JSON.parse(JSON.stringify(watchedItems || []));
                                                                                if (!all[index].tankDistributions) all[index].tankDistributions = [];
                                                                                all[index].tankDistributions[dIdx].quantity = ev.value ?? 0;
                                                                                setValue('items', all);
                                                                            }}
                                                                            className="w-full"
                                                                            min={0}
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-1 pt-5">
                                                                        <Button
                                                                            type="button"
                                                                            icon="pi pi-trash"
                                                                            severity="danger"
                                                                            text
                                                                            rounded
                                                                            onClick={() => {
                                                                                const all = JSON.parse(JSON.stringify(watchedItems || []));
                                                                                all[index].tankDistributions.splice(dIdx, 1);
                                                                                setValue('items', all);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="flex items-center justify-between pt-2 border-t">
                                                                <Button
                                                                    type="button"
                                                                    label="Add Distribution"
                                                                    icon="pi pi-plus"
                                                                    size="small"
                                                                    outlined
                                                                    onClick={() => {
                                                                        const all = JSON.parse(JSON.stringify(watchedItems || []));
                                                                        if (!all[index]) all[index] = { productId: '', quantity: 0, tankDistributions: [] };
                                                                        if (!all[index].tankDistributions) all[index].tankDistributions = [];
                                                                        all[index].tankDistributions.push({ tankId: options[0]?.value || "", quantity: 0 });
                                                                        setValue('items', all);
                                                                    }}
                                                                />

                                                                <div className="text-sm">
                                                                    <span className="text-gray-600">Total Distributed: </span>
                                                                    <span className={`font-semibold ${totalQty > 0 && totalDist !== totalQty ? 'text-red-600' : 'text-green-600'}`}>
                                                                        {totalDist} / {totalQty}
                                                                    </span>
                                                                    {totalQty > 0 && totalDist !== totalQty && (
                                                                        <span className="text-xs text-red-500 ml-2">
                                                                            <i className="pi pi-exclamation-triangle"></i> Mismatch
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
