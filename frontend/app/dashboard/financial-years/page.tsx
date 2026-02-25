"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { formatDate } from "@/helper/DateTime";
import FinancialYearForm from "@/components/financial-year/FinancialYearForm";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">📅</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Financial Year Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any financial years yet. Once you create a financial year, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [financialYearData, setFinancialYearData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<any | null>(null);
  const [editFinancialYearId, setEditFinancialYearId] = useState<string | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

 
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  
  useEffect(() => {
    financialYearDataGet();
  }, [pagination.page, pagination.rows, debouncedSearch]);


  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const financialYearDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/financial-year/all-financials", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setFinancialYearData(res.data.financialYears || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalYears || 0,
      }));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

 
  const handleAddFinancialYear = () => {
    setEditFinancialYearId(null);
    setSelectedFinancialYear(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: any) => {
    setEditFinancialYearId(rowData._id);
    setSelectedFinancialYear(rowData);
    setVisible(true);
  };


  

  /* ================= COLUMN TEMPLATES ================= */
  const imageTemplate = (rowData: any) => {
    const getInitials = (name?: string) => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const stringToBg = (str?: string) => {
      const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-red-500",
        "bg-yellow-500",
        "bg-indigo-500",
        "bg-pink-500",
        "bg-teal-500",
        "bg-orange-500",
      ];
      if (!str) return colors[0];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const initials = getInitials(rowData?.name || "");
    const bgClass = stringToBg(rowData?.name || "");

    return (
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${bgClass}`}>
        {initials}
      </div>
    );
  };

  const statusTemplate = (rowData: any) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        rowData.isActive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {rowData.isActive ? "Active" : "Inactive"}
    </span>
  );

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        aria-label="More actions"
        onClick={(e) => showRowMenu(e, rowData)}
      />
    </div>
  );

  const showRowMenu = (event: any, rowData: any) => {
    event.stopPropagation();
    setSelectedFinancialYear(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedFinancialYear) handleUpdate(selectedFinancialYear);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Financial Years</h2>
        <p className="text-sm text-black">Manage financial years</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search financial year"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add Financial Year"
          icon="pi pi-plus"
          onClick={handleAddFinancialYear}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={financialYearData}
          header={header}
          lazy
          paginator
          first={(pagination.page - 1) * pagination.rows}
          rows={pagination.rows}
          totalRecords={pagination.total}
          loading={loading}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPage={(e) =>
            setPagination((prev) => ({
              ...prev,
              page: (e.page ?? 0) + 1,
              rows: e.rows ?? prev.rows,
            }))
          }
          responsiveLayout="scroll"
          emptyMessage={EmptyState}
        >
          <Column field="name" header="Year" sortable />
          <Column header="Start Date" body={(row: any) => formatDate(row.startDate)} />
          <Column header="End Date" body={(row: any) => formatDate(row.endDate)} />
          <Column header="Status" body={statusTemplate} />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog 
          header={editFinancialYearId ? "Edit Financial Year" : "Add Financial Year"} 
          visible={visible} 
          style={{ width: "50vw" }} 
          onHide={() => {
            setVisible(false);
            setEditFinancialYearId(null);
            setSelectedFinancialYear(null);
          }}
        >
          <FinancialYearForm
            financialYearId={editFinancialYearId}
            onClose={() => {
              setVisible(false);
              setEditFinancialYearId(null);
              setSelectedFinancialYear(null);
            }}
            onSuccess={() => {
              financialYearDataGet();
              setVisible(false);
              setEditFinancialYearId(null);
              setSelectedFinancialYear(null);
            }}
          />
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;