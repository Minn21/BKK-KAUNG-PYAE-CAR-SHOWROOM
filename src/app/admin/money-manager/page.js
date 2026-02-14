"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

function toNumber(value) {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDateInput(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(value) {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-GB");
}

function getPeriodDateRange(period) {
  const now = new Date();
  let startDate;
  if (period === "monthly") startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period === "6months") startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  else startDate = new Date(now.getFullYear(), 0, 1); // yearly

  // Include the whole day for endDate comparisons
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

function getExpenseDate(exp) {
  const raw = exp?.expenseDate ?? exp?.date ?? exp?.createdAt ?? null;
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function MoneyManagerPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [selectedPeriod, setSelectedPeriod] = useState("monthly"); // monthly | sixMonths | yearly
  const apiPeriod = useMemo(
    () => (selectedPeriod === "sixMonths" ? "6months" : selectedPeriod),
    [selectedPeriod]
  );

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [expensesDateRange, setExpensesDateRange] = useState(null);
  const [periodGroups, setPeriodGroups] = useState([]); // from /period: daily groups (monthly) OR month summary (6months/yearly)

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    description: "",
    amount: "",
    expenseDate: formatDateInput(new Date()),
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const [confirmDialog, setConfirmDialog] = useState(null);
  // confirmDialog: { type: "update" | "delete", title, message, confirmLabel, confirmVariant, payload }

  const authHeaders = useMemo(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const handleLogout = () => {
    window.location.href = "/admin/login";
  };

  const openCreateModal = () => {
    setEditingExpense(null);
    setExpenseForm({
      title: "",
      description: "",
      amount: "",
      expenseDate: formatDateInput(new Date()),
    });
    setFormError("");
    setShowExpenseModal(true);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setExpenseForm({
      title: exp?.title || "",
      description: exp?.description || "",
      amount: String(exp?.amount ?? ""),
      expenseDate: formatDateInput(exp?.expenseDate || exp?.date || exp?.createdAt),
    });
    setFormError("");
    setShowExpenseModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowExpenseModal(false);
    setEditingExpense(null);
    setFormError("");
  };

  const fetchAll = async () => {
    if (!API_BASE_URL) {
      console.warn("API base URL is not set. Cannot fetch money manager data.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1) Fetch grouped data using your backend period controller.
      const periodRes = await fetch(
        `${API_BASE_URL}/api/general-expenses/period?period=${encodeURIComponent(apiPeriod)}`,
        {
          cache: "no-store",
          headers: authHeaders,
        }
      );

      if (periodRes.status === 401) {
        alert("Unauthorized: Please login again.");
        window.location.href = "/admin/login";
        return;
      }

      if (!periodRes.ok) {
        const t = await periodRes.text().catch(() => "");
        throw new Error(`Period request failed (${periodRes.status}). ${t}`);
      }

      const periodJson = await periodRes.json();
      const serverRangeStart = periodJson?.dateRange?.startDate ? new Date(periodJson.dateRange.startDate) : null;
      const serverRangeEnd = periodJson?.dateRange?.endDate ? new Date(periodJson.dateRange.endDate) : null;
      const startDate = serverRangeStart && !Number.isNaN(serverRangeStart.getTime()) ? serverRangeStart : null;
      const endDate = serverRangeEnd && !Number.isNaN(serverRangeEnd.getTime()) ? serverRangeEnd : null;

      setPeriodGroups(Array.isArray(periodJson?.data) ? periodJson.data : []);

      // 2) Fetch raw expenses list using date range (for the editable table).
      // Backend caps limit at 100, so loop pagination.
      const fallback = getPeriodDateRange(apiPeriod);
      const rangeStart = startDate || fallback.startDate;
      const rangeEnd = endDate || fallback.endDate;

      const start = encodeURIComponent(rangeStart.toISOString());
      const end = encodeURIComponent(rangeEnd.toISOString());

      const all = [];
      const limit = 100;
      let page = 1;
      let pages = 1;

      while (page <= pages && page <= 50) {
        const expRes = await fetch(
          `${API_BASE_URL}/api/general-expenses?startDate=${start}&endDate=${end}&page=${page}&limit=${limit}`,
          {
            cache: "no-store",
            headers: authHeaders,
          }
        );

        if (expRes.status === 401) {
          alert("Unauthorized: Please login again.");
          window.location.href = "/admin/login";
          return;
        }

        if (!expRes.ok) {
          const t = await expRes.text().catch(() => "");
          throw new Error(`Expenses request failed (${expRes.status}). ${t}`);
        }

        const expJson = await expRes.json();
        const list = Array.isArray(expJson?.data) ? expJson.data : [];
        all.push(...list);

        pages = Number(expJson?.pagination?.pages) || 1;
        page += 1;

        if (list.length === 0) break;
      }

      setExpenses(all);
      setExpensesDateRange({ startDate: rangeStart.toISOString(), endDate: rangeEnd.toISOString() });

      setLoading(false);
    } catch (e) {
      console.error("Money manager load failed:", e);
      showToast(`Failed to load money manager data: ${e.message}`, "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL, apiPeriod]);

  const performSaveExpense = async ({ isEdit, id, title, description, amount, expenseDate }) => {
    if (!API_BASE_URL) {
      setFormError("API base URL is not configured.");
      return;
    }

    try {
      setSaving(true);

      const url = isEdit
        ? `${API_BASE_URL}/api/general-expenses/${id}`
        : `${API_BASE_URL}/api/general-expenses`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          amount,
          expenseDate,
        }),
      });

      if (res.status === 401) {
        alert("Unauthorized: Please login again.");
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || `Request failed (${res.status})`);
      }

      setConfirmDialog(null);
      closeModal();
      await fetchAll();
      showToast(isEdit ? "Expense updated successfully." : "Expense created successfully.", "success");
    } catch (err) {
      console.error("Save expense failed:", err);
      setFormError(err.message || "Failed to save expense.");
      showToast(err.message || "Failed to save expense.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();

    setFormError("");

    const title = (expenseForm.title || "").trim();
    const description = (expenseForm.description || "").trim();
    const amount = toNumber(expenseForm.amount);
    const expenseDate = expenseForm.expenseDate;

    if (!title) {
      setFormError("Title is required.");
      return;
    }
    if (!expenseDate) {
      setFormError("Expense date is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be a positive number.");
      return;
    }

    const isEdit = Boolean(editingExpense?._id || editingExpense?.id);
    const id = editingExpense?._id || editingExpense?.id;

    // Professional confirmation modal for EDIT only.
    if (isEdit) {
      setConfirmDialog({
        type: "update",
        title: "Confirm Update",
        message: `${title}\n฿${amount.toLocaleString()}`,
        confirmLabel: "Update",
        confirmVariant: "primary",
        payload: { isEdit, id, title, description, amount, expenseDate },
      });
      return;
    }

    await performSaveExpense({ isEdit, id, title, description, amount, expenseDate });
  };

  const performDeleteExpense = async (exp) => {
    const id = exp?._id || exp?.id;
    if (!id) return;

    if (!API_BASE_URL) {
      showToast("API base URL is not configured.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/general-expenses/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (res.status === 401) {
        alert("Unauthorized: Please login again.");
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || `Delete failed (${res.status})`);
      }

      setConfirmDialog(null);
      await fetchAll();
      showToast("Expense deleted successfully.", "success");
    } catch (err) {
      console.error("Delete expense failed:", err);
      showToast(`Failed to delete expense: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (exp) => {
    if (!exp) return;
    setConfirmDialog({
      type: "delete",
      title: "Confirm Delete",
      message: `${exp?.title || "Untitled"}\n฿${toNumber(exp?.amount).toLocaleString()}`,
      confirmLabel: "Delete",
      confirmVariant: "danger",
      payload: exp,
    });
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/View.png')" }}
    >
      {/* Top Navigation Bar */}
      <nav className="bg-black/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <h1 className="text-xl sm:text-2xl font-semibold text-white">BKK KAUNG PYAE CAR SHOWROOM</h1>
            <button
              onClick={handleLogout}
              className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation Bar */}
      <nav className="bg-black/70 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-nowrap space-x-4 sm:space-x-8 h-12 sm:h-14 overflow-x-auto scrollbar-hide">
            <Link
              href="/admin/dashboard"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0"
            >
              Car List
            </Link>
            <Link
              href="/admin/installments"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0"
            >
              Installments
            </Link>
            <Link
              href="/admin/installment-calculator"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0"
            >
              Installment Calculator
            </Link>
            <Link
              href="/admin/sold-list"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0"
            >
              Sold List
            </Link>
            <Link
              href="/admin/analysis"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0"
            >
              Analysis
            </Link>
            <Link
              href="/admin/installment-analysis"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0"
            >
              Installment Analysis
            </Link>
            <Link
              href="/admin/money-manager"
              className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0"
            >
              Money Manager
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Money Manager</h2>
              <div className="text-sm sm:text-base text-gray-300 mt-1">
                Period:{" "}
                <span className="font-medium text-white">
                  {selectedPeriod === "sixMonths" ? "6 Months" : selectedPeriod}
                </span>
                {expensesDateRange?.startDate && expensesDateRange?.endDate ? (
                  <span className="ml-2">
                    ({formatDateDisplay(expensesDateRange.startDate)} -{" "}
                    {formatDateDisplay(expensesDateRange.endDate)})
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              {/* Period Selection */}
              <div className="flex bg-black/30 backdrop-blur-md rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedPeriod("monthly")}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all cursor-pointer ${
                    selectedPeriod === "monthly" ? "bg-red-600 text-white" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedPeriod("sixMonths")}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all cursor-pointer ${
                    selectedPeriod === "sixMonths" ? "bg-red-600 text-white" : "text-gray-300 hover:text-white"
                  }`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setSelectedPeriod("yearly")}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all cursor-pointer ${
                    selectedPeriod === "yearly" ? "bg-red-600 text-white" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Yearly
                </button>
              </div>

              <button
                onClick={openCreateModal}
                className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-green-400 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer w-full sm:w-auto"
              >
                + Add Expense
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-white text-xl">Loading money manager...</div>
          ) : (
            <>
              {/* Period Summary (from /period endpoint) */}
              {apiPeriod === "monthly" ? (
                <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md mb-6">
                  <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Daily Summary</h3>
                    <div className="text-sm text-gray-300">
                      Days:{" "}
                      <span className="font-numeric text-white">
                        {Array.isArray(periodGroups) ? periodGroups.length : 0}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-black/20 backdrop-blur-2xl">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Count
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                        {(!Array.isArray(periodGroups) || periodGroups.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-white">
                              No summary data.
                            </td>
                          </tr>
                        )}
                        {(periodGroups || []).map((g, idx) => {
                          const list = Array.isArray(g?.expenses) ? g.expenses : [];
                          const total = list.reduce((sum, e) => sum + toNumber(e?.amount), 0);
                          return (
                            <tr key={g?.date || idx} className="hover:bg-black/30">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                                {g?.date || "N/A"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric">
                                {list.length}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric font-semibold">
                                ฿{total.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : apiPeriod === "6months" ? (
                <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md mb-6">
                  <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Monthly Summary</h3>
                    <div className="text-sm text-gray-300">
                      Months:{" "}
                      <span className="font-numeric text-white">
                        {Array.isArray(periodGroups) ? periodGroups.length : 0}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-black/20 backdrop-blur-2xl">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Count
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                        {(!Array.isArray(periodGroups) || periodGroups.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-white">
                              No summary data.
                            </td>
                          </tr>
                        )}
                        {(periodGroups || []).map((m, idx) => (
                          <tr key={m?.month || idx} className="hover:bg-black/30">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                              {m?.month || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric">
                              {toNumber(m?.count)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric font-semibold">
                              ฿{toNumber(m?.totalAmount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md mb-6">
                  <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Yearly Summary</h3>
                    <div className="text-sm text-gray-300">
                      Years:{" "}
                      <span className="font-numeric text-white">
                        {Array.isArray(periodGroups) ? periodGroups.length : 0}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-black/20 backdrop-blur-2xl">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                            Year
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Count
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                        {(!Array.isArray(periodGroups) || periodGroups.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-white">
                              No summary data.
                            </td>
                          </tr>
                        )}
                        {(periodGroups || []).map((y, idx) => (
                          <tr key={y?.year || idx} className="hover:bg-black/30">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                              {y?.year || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric">
                              {toNumber(y?.count)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric font-semibold">
                              ฿{toNumber(y?.totalAmount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expenses Table (hide in Yearly view) */}
              {apiPeriod !== "yearly" && (
                <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md">
                  <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">General Expenses</h3>
                    <div className="text-sm text-gray-300">
                      Showing{" "}
                      <span className="font-numeric text-white">{Array.isArray(expenses) ? expenses.length : 0}</span>{" "}
                      items
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-black/20 backdrop-blur-2xl">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                            Title
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-white uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                        {(!Array.isArray(expenses) || expenses.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-white">
                              No expenses found for this period.
                            </td>
                          </tr>
                        )}

                        {(expenses || []).map((exp, idx) => (
                          <tr key={exp?._id || exp?.id || idx} className="hover:bg-black/30">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                              {formatDateDisplay(exp?.expenseDate || exp?.date || exp?.createdAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">
                              {exp?.title || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-200 max-w-[520px]">
                              <div className="line-clamp-2">{exp?.description || "-"}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-right font-numeric font-semibold">
                              ฿{toNumber(exp?.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-white">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(exp)}
                                  className="bg-black/20 backdrop-blur-md text-white px-3 py-1.5 rounded hover:bg-black/30 hover:text-blue-400 font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(exp)}
                                  className="bg-black/20 backdrop-blur-md text-white px-3 py-1.5 rounded hover:bg-black/30 hover:text-red-400 font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-100 rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h3>

              {formError ? <div className="mb-3 text-sm text-red-700">{formError}</div> : null}

              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Office Rent - February"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Add context for this expense..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-numeric"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
                    <input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, expenseDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-numeric"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hover:text-red-500 font-medium cursor-pointer disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-red-200 font-medium cursor-pointer disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editingExpense ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Edit/Delete) */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-100 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">{confirmDialog.title}</h3>
              <div className="text-sm text-gray-700 whitespace-pre-line">{confirmDialog.message}</div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hover:text-red-500 font-medium cursor-pointer disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (confirmDialog.type === "update") {
                      performSaveExpense(confirmDialog.payload);
                      return;
                    }
                    if (confirmDialog.type === "delete") {
                      performDeleteExpense(confirmDialog.payload);
                    }
                  }}
                  className={`px-4 py-2 text-white rounded-md font-medium cursor-pointer disabled:opacity-60 ${
                    confirmDialog.confirmVariant === "danger"
                      ? "bg-red-600 hover:bg-red-700 hover:text-red-200"
                      : "bg-blue-600 hover:bg-blue-700 hover:text-blue-200"
                  }`}
                >
                  {saving ? "Please wait..." : confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[70] max-w-sm">
          <div
            className={`rounded-lg px-4 py-3 shadow-lg border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-green-600/20 border-green-400/40 text-green-100"
                : "bg-red-600/20 border-red-400/40 text-red-100"
            }`}
          >
            <div className="text-sm font-medium">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

