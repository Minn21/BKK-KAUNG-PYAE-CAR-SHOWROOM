"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function AnalysisPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [profitData, setProfitData] = useState({
    monthly: [],
    sixMonths: [],
    yearly: []
  });
  const [totalProfit, setTotalProfit] = useState(0);
  const [carsData, setCarsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const handleLogout = () => {
    window.location.href = '/admin/login';
  };

  // Fetch profit analysis data from API
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fetchProfitAnalysis = async (period) => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Cannot fetch profit analysis.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get token from localStorage for authentication
        const token = localStorage.getItem('token');
        
        const headers = {};
        
        // Add Authorization header if token exists
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Convert frontend period to backend period format
        const apiPeriod = period === 'sixMonths' ? '6months' : period;
        
        // Fetch profit analysis from API with period parameter
        const response = await fetch(`${API_BASE_URL}/api/analysis/profit?period=${apiPeriod}`, {
          cache: "no-store",
          headers: headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            alert("Unauthorized: Please login again.");
            window.location.href = '/admin/login';
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

        console.log('data', data);
        
        if (data.success) {
          // Set cars data and total profit from API response
          setCarsData(data.cars || []);
          setTotalProfit(data.totalProfit || 0);
          
          // Group data by period for display
          const groupedData = groupDataByPeriod(data.cars || [], apiPeriod);
          const stateKey = period === 'sixMonths' ? 'sixMonths' : period;
          
          setProfitData(prev => ({
            ...prev,
            [stateKey]: groupedData
          }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading profit analysis:", error);
        alert(`Failed to load profit analysis: ${error.message}`);
        setLoading(false);
      }
    };

    // Fetch data for the selected period
    fetchProfitAnalysis(selectedPeriod);
  }, [API_BASE_URL, selectedPeriod]);

  // Group cars data by period for display
  const groupDataByPeriod = (cars, period) => {
    const now = new Date();
    const grouped = {};

    cars.forEach(car => {
      const soldDate = new Date(car.soldOutDate);
      if (isNaN(soldDate.getTime())) return;

      let key;
      if (period === 'monthly') {
        key = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === '6months') {
        key = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'yearly') {
        key = soldDate.getFullYear().toString();
      }

      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          [period === 'yearly' ? 'year' : 'month']: key,
          profit: 0,
          soldCars: 0,
          totalCars: 0
        };
      }

      grouped[key].profit += car.profit || 0;
      grouped[key].soldCars += 1;
      grouped[key].totalCars += 1;
    });

    // Convert to array and sort
    const result = Object.values(grouped).sort((a, b) => {
      const keyA = period === 'yearly' ? a.year : a.month;
      const keyB = period === 'yearly' ? b.year : b.month;
      return keyA.localeCompare(keyB);
    });

    // For monthly and 6months, fill in missing months
    if (period === 'monthly' || period === '6months') {
      const months = period === 'monthly' ? 12 : 6;
      const filled = [];
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = result.find(r => r.month === monthKey);
        filled.unshift(existing || {
          month: monthKey,
          profit: 0,
          soldCars: 0,
          totalCars: 0
        });
      }
      return filled;
    }

    // For yearly, fill in missing years
    if (period === 'yearly') {
      const filled = [];
      for (let i = 0; i < 5; i++) {
        const year = (now.getFullYear() - i).toString();
        const existing = result.find(r => r.year === year);
        filled.unshift(existing || {
          year: year,
          profit: 0,
          soldCars: 0,
          totalCars: 0
        });
      }
      return filled;
    }

    return result;
  };

  // Get current period data
  const getCurrentData = () => {
    switch (selectedPeriod) {
      case 'monthly':
        return profitData.monthly;
      case 'sixMonths':
        return profitData.sixMonths;
      case 'yearly':
        return profitData.yearly;
      default:
        return profitData.monthly;
    }
  };

  // Calculate total profit for current period (from API response)
  const getTotalProfit = () => {
    return totalProfit;
  };

  // Calculate total cars for current period (from API response)
  const getTotalCars = () => {
    return carsData.length;
  };

  // Calculate total sales (from API response)
  const getTotalSales = () => {
    return carsData.reduce((total, car) => total + (car.soldPrice || 0), 0);
  };

  // Export to CSV (Excel compatible)
  const exportToExcel = () => {
    setIsExporting(true);
    
    try {
      const periodText = selectedPeriod === 'monthly' ? 'Last 12 Months' : 
                        selectedPeriod === 'sixMonths' ? 'Last 6 Months' : 'Last 5 Years';
      const periodLabel = selectedPeriod === 'yearly' ? 'Year' : 'Month';
      const groupedData = getCurrentData();
      
      // Create CSV content with BOM for Excel UTF-8 support
      let csvContent = '\uFEFF'; // UTF-8 BOM
      
      // Header Section
      csvContent += `BKK KAUNG PYAE CAR SHOWROOM - Profit Analysis Report\n`;
      csvContent += `Period: ${periodText}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `\n`;
      
      // Summary Section
      csvContent += `SUMMARY\n`;
      csvContent += `Total Profit,฿${getTotalProfit().toLocaleString()}\n`;
      csvContent += `Total Sold Cars,${getTotalCars()}\n`;
      csvContent += `Total Sales,฿${getTotalSales().toLocaleString()}\n`;
      csvContent += `Average Profit per Car,฿${getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()).toLocaleString() : '0'}\n`;
      csvContent += `Profit Margin,${getTotalSales() > 0 ? ((getTotalProfit() / getTotalSales()) * 100).toFixed(2) : '0'}%\n`;
      csvContent += `\n`;
      
      // Grouped Data by Period
      csvContent += `PROFIT BY ${periodLabel.toUpperCase()}\n`;
      csvContent += `${periodLabel},Profit (฿),Sold Cars,Average Profit per Car (฿)\n`;
      
      groupedData.forEach(item => {
        const period = selectedPeriod === 'yearly' ? item.year : item.month;
        const avgProfit = item.totalCars > 0 ? (item.profit / item.totalCars) : 0;
        csvContent += `${period},฿${item.profit.toLocaleString()},${item.soldCars},฿${avgProfit.toLocaleString()}\n`;
      });
      
      csvContent += `\n`;
      
      // Detailed Car List
      csvContent += `DETAILED CAR PROFIT REPORT\n`;
      csvContent += `No.,License No.,Brand,Purchase Price (฿),Sold Price (฿),Total Repairs (฿),Profit (฿),Sold Date\n`;
      
      carsData.forEach((car, index) => {
        const soldDate = car.soldOutDate ? new Date(car.soldOutDate).toLocaleDateString('en-GB') : 'N/A';
        csvContent += `${index + 1},${car.licenseNo || 'N/A'},${car.brand || 'N/A'},฿${(car.purchasePrice || 0).toLocaleString()},฿${(car.soldPrice || 0).toLocaleString()},฿${(car.totalRepairs || 0).toLocaleString()},฿${(car.profit || 0).toLocaleString()},${soldDate}\n`;
      });
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `BKK_Profit_Analysis_${selectedPeriod}_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => setIsExporting(false), 1000);
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export CSV: ' + error.message);
      setIsExporting(false);
    }
  };

  // Export to PDF using browser print functionality
  const exportToPDF = () => {
    setIsExporting(true);
    
    try {
      const groupedData = getCurrentData();
      const periodText = selectedPeriod === 'monthly' ? 'Last 12 Months' : 
                        selectedPeriod === 'sixMonths' ? 'Last 6 Months' : 'Last 5 Years';
      const periodLabel = selectedPeriod === 'yearly' ? 'Year' : 'Month';
      
      // Format date for display
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
          return new Date(dateString).toLocaleDateString('en-GB');
        } catch {
          return dateString;
        }
      };
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BKK KAUNG PYAE CAR SHOWROOM - Profit Analysis Report</title>
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 3px solid #dc3545;
              padding-bottom: 15px;
            }
            .title { 
              font-size: 24px; 
              font-weight: bold; 
              color: #dc3545;
              margin-bottom: 5px;
            }
            .subtitle { 
              font-size: 16px; 
              color: #666;
              margin-top: 5px;
            }
            .info { 
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
            }
            .info-item {
              display: inline-block;
            }
            .summary { 
              background-color: #f8f9fa; 
              padding: 15px; 
              border-radius: 5px; 
              margin-bottom: 20px;
              border-left: 4px solid #dc3545;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-top: 10px;
            }
            .summary-item {
              padding: 10px;
              background: white;
              border-radius: 3px;
            }
            .summary-label {
              font-size: 11px;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 18px;
              font-weight: bold;
              color: #dc3545;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #dc3545; 
              color: white;
              font-weight: bold;
              text-align: center;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .profit-positive {
              color: #28a745;
              font-weight: bold;
            }
            .profit-negative {
              color: #dc3545;
              font-weight: bold;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #333;
              margin: 25px 0 10px 0;
              padding-bottom: 5px;
              border-bottom: 2px solid #dc3545;
            }
            .footer { 
              margin-top: 30px; 
              font-size: 10px; 
              color: #666;
              text-align: center;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .page-break {
              page-break-before: always;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BKK KAUNG PYAE CAR SHOWROOM</div>
            <div class="subtitle">Profit Analysis Report</div>
          </div>
          
          <div class="info">
            <div class="info-item">
              <strong>Period:</strong> ${periodText}
            </div>
            <div class="info-item">
              <strong>Generated:</strong> ${new Date().toLocaleString()}
            </div>
          </div>
          
          <div class="summary">
            <h3 style="margin-top: 0;">Executive Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Profit</div>
                <div class="summary-value">฿${getTotalProfit().toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Sold Cars</div>
                <div class="summary-value">${getTotalCars()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Sales</div>
                <div class="summary-value">฿${getTotalSales().toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Average Profit per Car</div>
                <div class="summary-value">฿${getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()).toLocaleString() : '0'}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Profit Margin</div>
                <div class="summary-value">${getTotalSales() > 0 ? ((getTotalProfit() / getTotalSales()) * 100).toFixed(2) : '0'}%</div>
              </div>
            </div>
          </div>
          
          <div class="section-title">Profit by ${periodLabel}</div>
          <table>
            <thead>
              <tr>
                <th>${periodLabel}</th>
                <th>Profit (฿)</th>
                <th>Sold Cars</th>
                <th>Avg Profit/Car (฿)</th>
              </tr>
            </thead>
            <tbody>
              ${groupedData.map(item => {
                const period = selectedPeriod === 'yearly' ? item.year : item.month;
                const avgProfit = item.totalCars > 0 ? (item.profit / item.totalCars) : 0;
                return `
                  <tr>
                    <td>${period}</td>
                    <td class="profit-positive">฿${item.profit.toLocaleString()}</td>
                    <td>${item.soldCars}</td>
                    <td>฿${avgProfit.toLocaleString()}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="section-title page-break">Detailed Car Profit Report</div>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>License No.</th>
                <th>Brand</th>
                <th>Purchase Price (฿)</th>
                <th>Sold Price (฿)</th>
                <th>Repairs (฿)</th>
                <th>Profit (฿)</th>
                <th>Sold Date</th>
              </tr>
            </thead>
            <tbody>
              ${carsData.map((car, index) => {
                const profit = car.profit || 0;
                const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${car.licenseNo || 'N/A'}</td>
                    <td>${car.brand || 'N/A'}</td>
                    <td>฿${(car.purchasePrice || 0).toLocaleString()}</td>
                    <td>฿${(car.soldPrice || 0).toLocaleString()}</td>
                    <td>฿${(car.totalRepairs || 0).toLocaleString()}</td>
                    <td class="${profitClass}">฿${profit.toLocaleString()}</td>
                    <td>${formatDate(car.soldOutDate)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()} | BKK KAUNG PYAE CAR SHOWROOM</p>
            <p>This report contains confidential business information.</p>
          </div>
        </body>
        </html>
      `;
      
      // Open new window with content and trigger print
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        setIsExporting(false);
      }, 500);
      
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF: ' + error.message);
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
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
            <Link href="/admin/analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
              Analysis
            </Link>
            <Link href="/admin/installment-analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
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
              <div className="text-white text-xl">Loading analysis data...</div>
            </div>
          ) : (
            <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Profit Analysis</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Export Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isExporting ? 'Exporting...' : 'CSV'}
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isExporting ? 'Exporting...' : 'PDF'}
                </button>
              </div>
              
              {/* Period Selection */}
              <div className="flex bg-black/30 backdrop-blur-md rounded-lg p-1">
                <button
                  onClick={() => setSelectedPeriod('monthly')}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all ${
                    selectedPeriod === 'monthly' 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedPeriod('sixMonths')}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all ${
                    selectedPeriod === 'sixMonths' 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setSelectedPeriod('yearly')}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all ${
                    selectedPeriod === 'yearly' 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
                  <div className="text-2xl sm:text-3xl font-semibold text-white">฿{getTotalProfit().toLocaleString()}</div>
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
                  <div className="text-sm sm:text-base font-medium text-gray-300">Sold Cars</div>
                  <div className="text-2xl sm:text-3xl font-semibold text-white">{getTotalCars()}</div>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <div className="text-sm sm:text-base font-medium text-gray-300">Avg Profit/Car</div>
                  <div className="text-2xl sm:text-3xl font-semibold text-white">
                    ฿{getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()).toLocaleString() : '0'}
                  </div>
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
                  <div className="text-sm sm:text-base font-medium text-gray-300">Total Sales</div>
                  <div className="text-2xl sm:text-3xl font-semibold text-white">฿{getTotalSales().toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Profit Chart */}
          <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">
              Profit Trend - {selectedPeriod === 'monthly' ? 'Last 12 Months' : selectedPeriod === 'sixMonths' ? 'Last 6 Months' : 'Last 5 Years'}
            </h3>
            <div className="h-64 sm:h-80 bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-end justify-between h-full space-x-2">
                {getCurrentData().map((item, index) => {
                  const maxProfit = Math.max(...getCurrentData().map(d => d.profit));
                  const height = maxProfit > 0 ? (item.profit / maxProfit) * 100 : 0;
                  const period = selectedPeriod === 'yearly' ? item.year : item.month;
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="text-xs sm:text-sm text-gray-300 mb-2 text-center">
                        {selectedPeriod === 'yearly' ? period : period.split('-')[1]}
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t transition-all duration-500 hover:from-red-500 hover:to-red-300"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${period}: ฿${item.profit.toLocaleString()}`}
                      ></div>
                      <div className="text-xs text-gray-400 mt-2 text-center">
                        ฿{item.profit > 1000 ? `${(item.profit/1000).toFixed(1)}k` : item.profit.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Profit Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Sold Cars Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="text-white font-medium">Total Sold Cars</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      ฿{getTotalProfit().toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {getTotalCars()} cars
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-white font-medium">Average Profit per Car</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      ฿{getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()).toLocaleString() : '0'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {getTotalSales() > 0 ? ((getTotalProfit() / getTotalSales()) * 100).toFixed(1) : '0'}% margin
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Profit Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Profit per Car:</span>
                  <span className="text-white font-semibold">
                    ฿{getTotalCars() > 0 ? (getTotalProfit() / getTotalCars()).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Highest Month/Year:</span>
                  <span className="text-white font-semibold">
                    {getCurrentData().length > 0 ? 
                      (selectedPeriod === 'yearly' ? 
                        getCurrentData().reduce((max, item) => item.profit > max.profit ? item : max).year :
                        getCurrentData().reduce((max, item) => item.profit > max.profit ? item : max).month
                      ) : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Periods:</span>
                  <span className="text-white font-semibold">{getCurrentData().length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Active Periods:</span>
                  <span className="text-white font-semibold">
                    {getCurrentData().filter(item => item.profit > 0).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profit List */}
          <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">
              Profit Details - {selectedPeriod === 'monthly' ? 'Monthly' : selectedPeriod === 'sixMonths' ? '6 Months' : 'Yearly'}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">
                      {selectedPeriod === 'yearly' ? 'Year' : 'Month'}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Sold Cars
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Avg Profit/Car
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900/30 divide-y divide-gray-700">
                  {getCurrentData().map((item, index) => (
                    <tr key={index} className="hover:bg-gray-800/50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-white">
                        {selectedPeriod === 'yearly' ? item.year : item.month}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-green-400 font-semibold">
                        ฿{item.profit.toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-yellow-300">
                        {item.soldCars}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-blue-300">
                        ฿{item.totalCars > 0 ? (item.profit / item.totalCars).toLocaleString() : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
