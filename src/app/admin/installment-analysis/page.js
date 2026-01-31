"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from "react";

export default function InstallmentAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly"); // monthly | sixMonths | yearly
  const [summary, setSummary] = useState({
    totalGeneralProfit: 0,
    totalDetailedProfit: 0,
    totalPenaltyFees: 0,
  });
  const [carsData, setCarsData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleLogout = () => {
    window.location.href = '/admin/login';
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "N/A";
    return dt.toLocaleDateString("en-GB");
  };

  const getReportDate = (car) => {
    // Backend report might use different date keys depending on implementation.
    // Try the common ones in order.
    const candidate =
      car?.reportDate ??
      car?.ownerBookTransfer?.transferDate ??
      car?.soldOutDate ??
      car?.soldDate ??
      car?.saleDate ??
      car?.sale?.date ??
      car?.sale?.soldDate ??
      car?.installmentStartDate ??
      car?.installment?.startDate ??
      car?.startDate ??
      car?.date ??
      null;

    if (!candidate) return null;

    // Support common non-ISO formats like "DD/MM/YYYY" (often used in UI strings)
    // because `new Date("27/01/2026")` is not reliably parsed across browsers.
    if (typeof candidate === "string") {
      const s = candidate.trim();
      const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/YYYY
      if (m1) {
        const [, dd, mm, yyyy] = m1;
        const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
      const m2 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
      if (m2) {
        const [, dd, mm, yyyy] = m2;
        const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }

    const dt = new Date(candidate);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const normalizeReportCar = (car) => {
    // Make frontend tolerant to backend shape changes.
    // New installment analysis API returns:
    // - reportDate
    // - soldPrice, contractValue
    // - generalProfit, detailedProfit
    // - paymentBreakdown (penaltyFeesTotal, etc.)
    const normalized = { ...(car || {}) };

    const derivedSoldPrice =
      car?.soldPrice ??
      car?.priceToSell ??
      car?.salePrice ??
      car?.sellingPrice ??
      car?.installment?.priceToSell ??
      car?.installment?.soldPrice ??
      car?.sale?.price ??
      null;

    const derivedContractValue =
      car?.contractValue ??
      car?.installment?.contractValue ??
      null;

    normalized.soldPrice = toNumber(derivedSoldPrice);
    normalized.purchasePrice = toNumber(car?.purchasePrice ?? car?.priceToBuy ?? car?.originalPrice ?? 0);
    normalized.totalRepairs = toNumber(car?.totalRepairs ?? car?.repairsTotal ?? car?.repairCostTotal ?? 0);
    normalized.contractValue = toNumber(derivedContractValue);
    normalized.paymentBreakdown = car?.paymentBreakdown || {};
    normalized.reportDate = car?.reportDate ?? normalized.reportDate ?? null;
    normalized.totalSales = toNumber(
      car?.paymentBreakdown?.totalSales ??
        car?.totalSales ??
        normalized.totalSales ??
        0
    );

    // Prefer backend numbers, but compute safe fallbacks for consistency.
    const computedGeneralProfit =
      toNumber(normalized.soldPrice) - toNumber(normalized.purchasePrice) - toNumber(normalized.totalRepairs);
    const computedDetailedProfit =
      (toNumber(normalized.contractValue) > 0 ? toNumber(normalized.contractValue) : toNumber(normalized.soldPrice)) -
      toNumber(normalized.purchasePrice) -
      toNumber(normalized.totalRepairs);

    normalized.generalProfit =
      Number.isFinite(toNumber(car?.generalProfit)) ? toNumber(car?.generalProfit) : computedGeneralProfit;
    normalized.detailedProfit =
      Number.isFinite(toNumber(car?.detailedProfit)) ? toNumber(car?.detailedProfit) : computedDetailedProfit;

    return normalized;
  };

  const groupDataByPeriod = (cars, period) => {
    const grouped = {};

    cars.forEach((car) => {
      const dt = getReportDate(car);
      if (!dt) return;

      let key;
      if (period === "monthly" || period === "6months") {
        key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      } else if (period === "yearly") {
        key = dt.getFullYear().toString();
      }
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          [period === "yearly" ? "year" : "month"]: key,
          profit: 0,
          soldCars: 0,
          totalCars: 0,
        };
      }

      // Installment analysis should always use DETAILED profit (includes financing + penalties)
      grouped[key].profit += toNumber(car?.detailedProfit);
      grouped[key].soldCars += 1;
      grouped[key].totalCars += 1;
    });

    const values = Object.values(grouped);

    // Fill empty periods so the chart looks stable.
    const now = new Date();
    if (period === "monthly") {
      const filled = [];
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const existing = values.find((v) => v.month === monthKey);
        filled.push(existing || { month: monthKey, profit: 0, soldCars: 0, totalCars: 0 });
      }
      return filled;
    }

    if (period === "6months") {
      const filled = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const existing = values.find((v) => v.month === monthKey);
        filled.push(existing || { month: monthKey, profit: 0, soldCars: 0, totalCars: 0 });
      }
      return filled;
    }

    if (period === "yearly") {
      const filled = [];
      for (let i = 4; i >= 0; i -= 1) {
        const yearKey = (now.getFullYear() - i).toString();
        const existing = values.find((v) => v.year === yearKey);
        filled.push(existing || { year: yearKey, profit: 0, soldCars: 0, totalCars: 0 });
      }
      return filled;
    }

    return values;
  };

  const getCurrentData = () => {
    const apiPeriod = selectedPeriod === "sixMonths" ? "6months" : selectedPeriod;
    return groupDataByPeriod(carsData || [], apiPeriod);
  };

  const getTotalCars = () => (typeof count === "number" && count > 0 ? count : (carsData || []).length);

  const getTotalSoldPrice = () =>
    (carsData || []).reduce((total, car) => total + toNumber(car?.soldPrice), 0);

  const getTotalContractValue = () =>
    (carsData || []).reduce((total, car) => total + toNumber(car?.contractValue), 0);

  const getTotalSales = () =>
    (carsData || []).reduce((total, car) => total + toNumber(car?.totalSales), 0);

  const getTotalProfit = () => {
    const fromSummary = toNumber(summary.totalDetailedProfit);
    if (fromSummary !== 0) return fromSummary;
    // Fallback (in case backend didn't send summary for some reason)
    return (carsData || []).reduce((sum, c) => sum + toNumber(c?.detailedProfit), 0);
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const groupedData = getCurrentData();

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "INSTALLMENT PROFIT ANALYSIS REPORT\n\n";
      csvContent += `Period,${selectedPeriod === "sixMonths" ? "6 Months" : selectedPeriod}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;

      csvContent += "SUMMARY\n";
      csvContent += `Total Profit (Detailed),฿${toNumber(summary.totalDetailedProfit).toLocaleString()}\n`;
      csvContent += `Total Penalty Fees,฿${toNumber(summary.totalPenaltyFees).toLocaleString()}\n`;
      csvContent += `Total Cars,${getTotalCars()}\n`;
      csvContent += `Total Sold Price,฿${getTotalSoldPrice().toLocaleString()}\n`;
      csvContent += `Total Sales,฿${getTotalSales().toLocaleString()}\n`;
      csvContent += `Avg Profit/Car,฿${(getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()) : 0).toLocaleString()}\n\n`;

      csvContent += "PERIOD BREAKDOWN\n";
      csvContent += "Period,Detailed Profit,Cars Sold,Avg Profit\n";
      groupedData.forEach((item) => {
        const period = selectedPeriod === "yearly" ? item.year : item.month;
        const avgProfit = item.totalCars > 0 ? (item.profit / item.totalCars) : 0;
        csvContent += `${period},฿${item.profit.toLocaleString()},${item.soldCars},฿${avgProfit.toLocaleString()}\n`;
      });

      csvContent += "\nCAR DETAILS\n";
      csvContent += "No,License No,Brand,Purchase Price,Sold Price,Total,Total Repairs,Detailed Profit,Report Date\n";
      (carsData || []).forEach((car, idx) => {
        const dt = getReportDate(car);
        csvContent += `${idx + 1},${car?.licenseNo || "N/A"},${car?.brand || "N/A"},฿${toNumber(car?.purchasePrice).toLocaleString()},฿${toNumber(car?.soldPrice).toLocaleString()},฿${toNumber(car?.totalSales).toLocaleString()},฿${toNumber(car?.totalRepairs).toLocaleString()},฿${toNumber(car?.detailedProfit).toLocaleString()},${formatDate(dt)}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `installment_profit_analysis_${selectedPeriod}_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);

      const groupedData = getCurrentData();

      const formatCurrency = (amount) => `฿${(Number(amount) || 0).toLocaleString()}`;

      const reportWindow = window.open("", "_blank");
      if (!reportWindow) return;

      reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Installment Profit Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 6px; }
            .subtitle { color: #666; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin: 14px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 12px 0; }
            .summary-item { border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
            .summary-label { color: #666; font-size: 12px; }
            .summary-value { font-size: 18px; font-weight: bold; }
            .profit-positive { color: #28a745; font-weight: bold; }
            .profit-negative { color: #dc3545; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Installment Profit Analysis</h1>
          <div class="subtitle">Period: ${selectedPeriod === "sixMonths" ? "6 Months" : selectedPeriod} • Generated: ${new Date().toLocaleString()}</div>

          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Profit</div>
              <div class="summary-value">${formatCurrency(getTotalProfit())}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Cars</div>
              <div class="summary-value">${getTotalCars()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Sales</div>
              <div class="summary-value">${formatCurrency(getTotalSales())}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Avg Profit/Car</div>
              <div class="summary-value">${formatCurrency(getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()) : 0)}</div>
            </div>
          </div>

          <h2>Period Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Profit</th>
                <th>Cars Sold</th>
                <th>Avg Profit</th>
              </tr>
            </thead>
            <tbody>
              ${groupedData
                .map((item) => {
                  const period = selectedPeriod === "yearly" ? item.year : item.month;
                  const avgProfit = item.totalCars > 0 ? (item.profit / item.totalCars) : 0;
                  const profitClass = item.profit >= 0 ? "profit-positive" : "profit-negative";
                  return `
                    <tr>
                      <td>${period}</td>
                      <td class="${profitClass}">${formatCurrency(item.profit)}</td>
                      <td>${item.soldCars}</td>
                      <td>${formatCurrency(avgProfit)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>

          <h2>Car Details</h2>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>License No</th>
                <th>Brand</th>
                <th>Purchase Price</th>
                <th>Sold Price</th>
                <th>Total Repairs</th>
                <th>Profit</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${(carsData || [])
                .map((car, idx) => {
                  const profit = Number(car?.profit) || 0;
                  const profitClass = profit >= 0 ? "profit-positive" : "profit-negative";
                  const dt = getReportDate(car);
                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${car?.licenseNo || "N/A"}</td>
                      <td>${car?.brand || "N/A"}</td>
                      <td>${formatCurrency(car?.purchasePrice || 0)}</td>
                      <td>${formatCurrency(car?.soldPrice || 0)}</td>
                      <td>${formatCurrency(car?.totalRepairs || 0)}</td>
                      <td class="${profitClass}">${formatCurrency(profit)}</td>
                      <td>${formatDate(dt)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `);
      reportWindow.document.close();
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch installment profit analysis data from API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchInstallmentProfit = async (period) => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Cannot fetch installment profit analysis.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const token = localStorage.getItem("token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const apiPeriod = period === "sixMonths" ? "6months" : period;
        const response = await fetch(
          `${API_BASE_URL}/api/analysis/profit/installment?period=${apiPeriod}`,
          { cache: "no-store", headers }
        );

        if (!response.ok) {
          if (response.status === 401) {
            alert("Unauthorized: Please login again.");
            window.location.href = "/admin/login";
            return;
          }
          if (response.status === 400) {
            const errorData = await response.json();
            alert(errorData.message || "Invalid period parameter");
            setLoading(false);
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data?.success) {
          const normalizedCars = (data.cars || []).map(normalizeReportCar);
          setCarsData(normalizedCars);

          const summaryFromApi = data?.summary || {};
          const computedGeneralProfit = normalizedCars.reduce((sum, c) => sum + toNumber(c?.generalProfit), 0);
          const computedDetailedProfit = normalizedCars.reduce((sum, c) => sum + toNumber(c?.detailedProfit), 0);
          const computedPenaltyFees = normalizedCars.reduce(
            (sum, c) => sum + toNumber(c?.paymentBreakdown?.penaltyFeesTotal),
            0
          );
          setSummary({
            totalGeneralProfit: toNumber(summaryFromApi.totalGeneralProfit) || computedGeneralProfit,
            totalDetailedProfit: toNumber(summaryFromApi.totalDetailedProfit) || computedDetailedProfit,
            totalPenaltyFees: toNumber(summaryFromApi.totalPenaltyFees) || computedPenaltyFees,
          });

          setCount(typeof data.count === "number" ? data.count : normalizedCars.length);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading installment profit analysis:", err);
        alert(`Failed to load installment profit analysis: ${err.message}`);
        setLoading(false);
      }
    };

    fetchInstallmentProfit(selectedPeriod);
  }, [API_BASE_URL, selectedPeriod]);

  const currentData = useMemo(() => getCurrentData(), [carsData, selectedPeriod]);

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: 'url(/View.png)' }}>
      {/* Top Navigation Bar */}
      <nav className="bg-black/70 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl sm:text-2xl font-bold text-white">BKK KAUNG PYAE CAR SHOWROOM</h1>
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
            <Link href="/admin/dashboard" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Car List
            </Link>
            <Link href="/admin/installments" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Installments
            </Link>
            <Link href="/admin/installment-calculator" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Installment Calculator
            </Link>
            <Link href="/admin/sold-list" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Sold List
            </Link>
            <Link href="/admin/analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Analysis
            </Link>
            <Link href="/admin/installment-analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
              Installment Analysis
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-white text-xl">Loading installment profit analysis...</div>
            </div>
          ) : (
            <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Installment Profit Analysis</h2>
                  <p className="text-white/70 text-sm mt-1">
                    Total cars: <span className="text-white font-semibold">{getTotalCars()}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Export Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={exportToExcel}
                      disabled={isExporting}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all cursor-pointer"
                    >
                      {isExporting ? "Exporting..." : "CSV"}
                    </button>
                    <button
                      onClick={exportToPDF}
                      disabled={isExporting}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all cursor-pointer"
                    >
                      {isExporting ? "Exporting..." : "PDF"}
                    </button>
                  </div>

                  {/* Period Selection */}
                  <div className="flex bg-black/30 backdrop-blur-md rounded-lg p-1">
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

                  {/* Profit Mode Selection removed (always Detailed Profit) */}
            </div>
          </div>

          {/* Stats Cards (from API summary) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <div className="text-sm sm:text-base font-medium text-gray-300">Total Profit</div>
                      <div className="text-2xl sm:text-3xl font-semibold text-white">฿{toNumber(summary.totalDetailedProfit).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <div className="text-sm sm:text-base font-medium text-gray-300">Total Cars</div>
                      <div className="text-2xl sm:text-3xl font-semibold text-white">{getTotalCars()}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <div className="text-sm sm:text-base font-medium text-gray-300">Total Penalty Fees</div>
                      <div className="text-2xl sm:text-3xl font-semibold text-white">฿{toNumber(summary.totalPenaltyFees).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Chart */}
              <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">
                  Profit Trend -{" "}
                  {selectedPeriod === "monthly" ? "Last 12 Months" : selectedPeriod === "sixMonths" ? "Last 6 Months" : "Last 5 Years"}
                </h3>
                <div className="h-64 sm:h-80 bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-end justify-between h-full space-x-2">
                    {currentData.map((item, idx) => {
                      const maxProfit = Math.max(...currentData.map((d) => d.profit));
                      const height = maxProfit > 0 ? (item.profit / maxProfit) * 100 : 0;
                      const period = selectedPeriod === "yearly" ? item.year : item.month;
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1">
                          <div className="text-xs sm:text-sm text-gray-300 mb-2 text-center">
                            {selectedPeriod === "yearly" ? period : period.split("-")[1]}
                          </div>
                          <div
                            className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t transition-all duration-500 hover:from-red-500 hover:to-red-300"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${period}: ฿${item.profit.toLocaleString()}`}
                          />
                          <div className="text-xs text-gray-400 mt-2 text-center">
                            ฿{toNumber(item.profit) > 1000 ? `${(toNumber(item.profit) / 1000).toFixed(1)}k` : toNumber(item.profit).toFixed(0)}
            </div>
            </div>
                      );
                    })}
            </div>
            </div>
          </div>

              {/* Period Breakdown Table */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-4 sm:py-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Period Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-black/20 backdrop-blur-2xl">
                    <tr>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Period</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Profit</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Cars</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Avg Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                        {currentData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-white">
                              No data
                      </td>
                    </tr>
                        ) : (
                          currentData.map((item, idx) => {
                            const period = selectedPeriod === "yearly" ? item.year : item.month;
                            const avgProfit = item.totalCars > 0 ? item.profit / item.totalCars : 0;
                            return (
                              <tr key={idx} className="hover:bg-black/30 backdrop-blur-2xl">
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">{period}</td>
                                <td className={`px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base font-semibold ${item.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  ฿{(item.profit || 0).toLocaleString()}
                      </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">{item.soldCars}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">฿{avgProfit.toLocaleString()}</td>
                    </tr>
                            );
                          })
                        )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

              {/* Car Details Table */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md">
            <div className="px-4 sm:px-6 py-4 sm:py-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Car Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-black/20 backdrop-blur-2xl">
                    <tr>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">No</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">License No</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Brand</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Purchase</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Sold</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Total</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Repairs</th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                        {(carsData || []).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 sm:px-6 py-6 text-center text-white">
                              No cars in this period
                      </td>
                    </tr>
                        ) : (
                          (carsData || []).map((car, idx) => {
                            const detailed = toNumber(car?.detailedProfit);
                            return (
                              <tr key={car?.id || car?._id || idx} className="hover:bg-black/30 backdrop-blur-2xl">
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">{idx + 1}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">{car?.licenseNo || "N/A"}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">{car?.brand || "N/A"}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">฿{toNumber(car?.purchasePrice).toLocaleString()}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">฿{toNumber(car?.soldPrice).toLocaleString()}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">฿{toNumber(car?.totalSales).toLocaleString()}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">฿{toNumber(car?.totalRepairs).toLocaleString()}</td>
                                <td className={`px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base font-semibold ${detailed >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  ฿{detailed.toLocaleString()}
                                </td>
                    </tr>
                            );
                          })
                        )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
