"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";

type ViewDetailsProps = {
  purchaseId?: string;
  initialData?: any;
  onClose?: () => void;
};

export default function ViewDetails({ purchaseId, initialData, onClose }: ViewDetailsProps) {
  const [data, setData] = useState<any | null>(initialData || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (initialData) return;
      if (!purchaseId) return;
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/purchase/purchase-details/${purchaseId}`);
        setData(res.data?.data || null);
      } catch (err) {
        console.error("Failed to fetch purchase details", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [purchaseId, initialData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-600">No purchase details available.</div>
    );
  }

  const formatCurrency = (v: number) => `₹${(v || 0).toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Purchase #{data.invoiceNo || data._id}</h3>
          <div className="text-sm text-gray-600 mt-1">{data.supplier?.name || "Unknown Supplier"}</div>
          <div className="text-xs text-gray-500 mt-1">{data.supplier?.address}</div>
        </div>

        <div className="w-64 bg-gray-50 p-3 rounded-md border">
          <div className="text-xs text-gray-500">Purchase Date</div>
          <div className="font-medium">{formatDate(data.purchaseDate)}</div>
          <div className="mt-2 text-xs text-gray-500">Payment Method</div>
          <div className="font-medium">{data.paymentMethod}</div>
          <div className="mt-2 text-xs text-gray-500">Payment Status</div>
          <div className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${data.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {data.paymentStatus}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-md">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm">Items</h4>
        </div>
        <div className="p-4 space-y-3">
          {Array.isArray(data.items) && data.items.length > 0 ? (
            data.items.map((it: any, idx: number) => (
              <div key={it._id || idx} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-6">
                  <div className="font-medium">{it.product?.name || it.productName || 'Product'}</div>
                  <div className="text-xs text-gray-500">Unit: {it.product?.unit || '—'}</div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-medium">{it.quantity}</div>
                  <div className="text-xs text-gray-500">Qty</div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-medium">{formatCurrency(it.costPrice || 0)}</div>
                  <div className="text-xs text-gray-500">Rate</div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-semibold">{formatCurrency(it.total || 0)}</div>
                  <div className="text-xs text-gray-500">Line Total</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500">No items found.</div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-white border rounded-md p-4">
          <h5 className="font-semibold text-sm mb-2">Supplier</h5>
          <div className="text-sm font-medium">{data.supplier?.name}</div>
          <div className="text-xs text-gray-500">{data.supplier?.phone}</div>
          <div className="text-xs text-gray-500 mt-2">{data.supplier?.email}</div>
          <div className="text-xs text-gray-500 mt-2">GST: {data.supplier?.gstId || '—'}</div>
        </div>

        <div className="w-72 bg-white border rounded-md p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <div>Sub Total</div>
            <div>{formatCurrency(data.subTotal || 0)}</div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <div>Tax</div>
            <div>{formatCurrency(data.taxAmount || (data.cgstAmount || 0) + (data.sgstAmount || 0))}</div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <div>Round Off</div>
            <div>{formatCurrency(data.roundOff || 0)}</div>
          </div>
          <div className="flex justify-between text-base font-semibold mt-3 border-t pt-3">
            <div>Total</div>
            <div>{formatCurrency(data.totalAmount || 0)}</div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <div>Paid</div>
            <div className="text-green-700">{formatCurrency(data.paidAmount || 0)}</div>
          </div>
          <div className="flex justify-between text-sm text-red-600 mt-1">
            <div>Due</div>
            <div>{formatCurrency(data.dueAmount || 0)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={onClose} />
        <Button label="Print" icon="pi pi-print" className="p-button-outlined" onClick={() => window.print()} />
      </div>
    </div>
  );
}
