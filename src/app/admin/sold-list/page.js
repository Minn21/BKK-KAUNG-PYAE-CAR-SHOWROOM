"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function SoldListPage() {
  const [soldCars, setSoldCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const parseCurrency = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Math.round(value);
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : Math.round(parsed);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numeric = parseCurrency(value);
    return `฿${numeric.toLocaleString()}`;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const loadSoldCarsFromStorage = () => {
      try {
        const savedSoldCars = localStorage.getItem('soldCars');
        if (savedSoldCars) {
          return JSON.parse(savedSoldCars);
        }
      } catch (error) {
        console.error("Failed to load sold cars from localStorage:", error);
      }
      return [];
    };

    const fetchSoldCarsFromApi = async () => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Using localStorage fallback.");
        const storageCars = loadSoldCarsFromStorage();
        setSoldCars(storageCars);
        setLoading(false);
        return;
      }

      try {
        // Get token from localStorage for authentication
        const token = localStorage.getItem('token');
        
        const headers = {};
        
        // Add Authorization header if token exists
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/cars/sold`, { 
          cache: "no-store",
          headers: headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Unauthorized: Token is missing or invalid");
            // Fallback to localStorage
            const storageCars = loadSoldCarsFromStorage();
            setSoldCars(storageCars);
            setLoading(false);
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const apiCars = Array.isArray(data.data) ? data.data : [];

        if (!Array.isArray(apiCars)) {
          console.warn("Unexpected response shape when fetching cars:", data);
          const storageCars = loadSoldCarsFromStorage();
          setSoldCars(storageCars);
          setLoading(false);
          return;
        }

        // Cars from /api/cars/sold are already filtered to sold cars (have sale or installment)
        // Normalize the API response to match expected format
        const normalizedSoldCars = apiCars.map((car, index) => {
          const normalizedPrice =
            typeof car.priceToSell === "number"
              ? `฿${car.priceToSell.toLocaleString("en-US")}`
              : car.priceToSell ?? "";

          // Determine if it's a paid sale or installment
          const isPaidSale = car.sale != null;
          const isInstallment = car.installment != null;
          
          // Get buyer info from sale or installment
          const buyer = car.sale?.buyer || car.installment?.buyer || null;
          
          // Get sold price: from sale.price or priceToSell for installment
          const soldPrice = isPaidSale 
            ? (typeof car.sale.price === 'number' ? Math.round(car.sale.price) : car.sale.price)
            : isInstallment 
              ? (typeof car.priceToSell === 'number' ? Math.round(car.priceToSell) : car.priceToSell)
              : null;
          
          // Get sold date: from sale.date or installment.startDate
          const soldDate = isPaidSale
            ? car.sale.date
            : isInstallment
              ? car.installment.startDate
              : null;
          
          // Format sold date if it exists
          const formattedSoldDate = soldDate 
            ? new Date(soldDate).toLocaleDateString('en-GB')
            : "";

          return {
            ...car,
            id: car.id ?? car._id ?? index,
            licenseNo: car.licenseNo ?? car.licensePlate ?? car.license ?? "",
            brand: car.brand ?? car.make ?? "",
            model: car.model ?? car.name ?? "",
            price: normalizedPrice,
            originalPrice: car.purchasePrice ?? car.priceToBuy ?? car.originalPrice ?? "",
            wd: car.wheelDrive ?? car.wd ?? "",
            soldPrice: soldPrice,
            customerName: buyer?.name ?? "",
            phoneNumber: buyer?.phone ?? "",
            passportNumber: buyer?.passport ?? "",
            soldDate: formattedSoldDate,
            transferCompleted: car.transferCompleted ?? false,
            transferDate: car.transferDate ?? "",
            boughtType: car.boughtType ?? (isPaidSale ? "Paid" : isInstallment ? "Installment" : null)
          };
        });

        setSoldCars(normalizedSoldCars);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sold cars from API:", error);
        // Fallback to localStorage
        const storageCars = loadSoldCarsFromStorage();
        setSoldCars(storageCars);
        setLoading(false);
      }
    };

    fetchSoldCarsFromApi();

    // Listen for storage changes (when cars are marked as sold from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'soldCars') {
        const storageCars = loadSoldCarsFromStorage();
        setSoldCars(storageCars);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [API_BASE_URL]);

  const handleTransferMark = async (car) => {
    if (window.confirm(`Transfer the owner book for ${car.brand} ${car.model} (${car.licenseNo})?`)) {
      // Update API if available
      if (API_BASE_URL && car.id) {
        try {
          const token = localStorage.getItem('token');
          const headers = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`${API_BASE_URL}/api/car/${car.id}/owner-book-transfer`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ notes: "" })
          });
          
          const result = await response.json().catch(() => ({}));
          
          if (!response.ok || result.success === false) {
            const message = result.message || result.error || `Request failed with status ${response.status}`;
            alert(`Failed to transfer owner book: ${message}`);
            return;
          }
          
          // Success - reload the page to show updated data
          alert('✅ Owner book transferred successfully!');
          window.location.reload();
        } catch (error) {
          console.error("Error transferring owner book:", error);
          alert(`Error: ${error.message || "Failed to transfer owner book"}`);
        }
      } else {
        alert("API base URL is not configured.");
      }
    }
  };

  const handleMoveBackToCarList = async (car) => {
    if (window.confirm(`Move ${car.brand} ${car.model} (${car.licenseNo}) back to the car list?`)) {
      // Update API if available - relist the car (remove sale/installment data)
      if (API_BASE_URL && car.id) {
        try {
          const token = localStorage.getItem('token');
          const headers = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          // Use edit endpoint to relist the car
          // According to schema: set sale=null, installment=null, boughtType=null, isAvailable=true
          const response = await fetch(`${API_BASE_URL}/api/car/${car.id}/edit`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
              sale: null,
              installment: null,
              boughtType: null,
              isAvailable: true
            })
          });
          
          if (!response.ok) {
            console.error("Failed to update car in API:", response.status);
            // Continue with localStorage update as fallback
          } else {
            // If API update successful, remove from sold list and refresh
            const updatedSoldCars = soldCars.filter(c => c.id !== car.id);
            setSoldCars(updatedSoldCars);
            localStorage.setItem('soldCars', JSON.stringify(updatedSoldCars));
            alert('Car moved back to car list successfully!');
            return;
          }
        } catch (error) {
          console.error("Error updating car in API:", error);
          // Continue with localStorage update as fallback
        }
      }
      
      // Fallback: Remove sold-specific fields and move back to car list (localStorage only)
      const { soldDate, soldPrice, customerName, phoneNumber, passportNumber, transferCompleted, transferDate, boughtType, ...carData } = car;
      
      // Add to car list
      const existingCars = JSON.parse(localStorage.getItem('cars') || '[]');
      const updatedCars = [...existingCars, carData];
      localStorage.setItem('cars', JSON.stringify(updatedCars));
      
      // Remove from sold list
      const updatedSoldCars = soldCars.filter(c => c.id !== car.id);
      setSoldCars(updatedSoldCars);
      localStorage.setItem('soldCars', JSON.stringify(updatedSoldCars));
      
      alert('Car moved back to car list successfully!');
    }
  };

  const handleLogout = () => {
    window.location.href = '/admin/login';
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
            <Link href="/admin/sold-list" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
              Sold List
            </Link>
            <Link href="/admin/analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Analysis
            </Link>
            <Link href="/admin/installment-analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Installment Analysis
            </Link>
            <Link href="/admin/money-manager" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Money Manager
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Sold Cars</h2>
          </div>

          {/* Sold Cars Table */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-black/20 backdrop-blur-2xl">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Passport Number
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Sold Price
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center text-white/70">
                        Loading sold cars...
                      </td>
                    </tr>
                  ) : soldCars.length > 0 ? (
                    soldCars.map((car, index) => (
                      <tr key={car.id} className="hover:bg-black/30 backdrop-blur-2xl">
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {index + 1}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.licenseNo}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.brand || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.model || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.customerName || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.phoneNumber || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.passportNumber || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {car.soldPrice 
                            ? (typeof car.soldPrice === 'number' 
                                ? `฿${Math.round(car.soldPrice).toLocaleString()}` 
                                : `฿${Math.round(parseFloat(car.soldPrice) || 0).toLocaleString()}`)
                            : 'N/A'
                          }
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                          {(() => {
                            // First, check if there's a saved profit calculation from the profit calculator
                            const savedCalculations = JSON.parse(localStorage.getItem('profitCalculations') || '[]');
                            const savedCalculation = savedCalculations.find(calc => calc.carId === car.id);
                            
                            if (savedCalculation) {
                              // Use the saved profit calculation from profit calculator
                              const profit = savedCalculation.profit;
                              const profitFormatted = profit >= 0 ? `฿${profit.toLocaleString()}` : `-฿${Math.abs(profit).toLocaleString()}`;
                              const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
                              return (
                                <span className={profitColor} title={`From Profit Calculator (${savedCalculation.lastUpdated})`}>
                                  {profitFormatted}
                                </span>
                              );
                            }
                            
                            // Check if profit was calculated during installment transfer
                            if (car.profit !== undefined) {
                              const profit = car.profit;
                              const profitFormatted = profit >= 0 ? `฿${profit.toLocaleString()}` : `-฿${Math.abs(profit).toLocaleString()}`;
                              const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
                              return (
                                <span
                                  className={profitColor}
                                  title={`From Installment Transfer (Original: ${formatCurrency(car.originalPrice)}, Sold: ${formatCurrency(car.soldPrice)}, Expenses: ${formatCurrency(car.totalExpenses)})`}
                                >
                                  {profitFormatted}
                                </span>
                              );
                            }
                            
                            // Fallback to basic calculation if no saved calculation exists
                            if (car.soldPrice && (car.originalPrice || car.price)) {
                              // Use the same calculation logic as profit calculator
                              const originalPrice = parseCurrency(car.originalPrice || car.price);
                              const soldPrice = parseCurrency(car.soldPrice);
                              const financeFee = car.financeFee ? parseCurrency(car.financeFee) : 0;
                              // Calculate total expenses (repair costs, fees, etc.)
                              const totalExpenses = financeFee;
                              
                              // Calculate profit using the same formula as profit calculator
                              // Profit = Selling Price - (Original Price + Total Expenses)
                              const profit = soldPrice - (originalPrice + totalExpenses);
                              
                              const profitFormatted = profit >= 0 ? `฿${profit.toLocaleString()}` : `-฿${Math.abs(profit).toLocaleString()}`;
                              const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
                              return (
                                <span
                                  className={profitColor}
                                  title={`Basic calculation (Original: ${formatCurrency(originalPrice)}, Sold: ${formatCurrency(soldPrice)}, Expenses: ${formatCurrency(totalExpenses)})`}
                                >
                                  {profitFormatted}
                                </span>
                              );
                            }
                            return 'N/A';
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">
                          {car.ownerBookTransfer && car.ownerBookTransfer.transferred ? (
                            <span className="bg-green-600/20 backdrop-blur-md text-green-400 px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium border border-green-500/30">
                              ✅ Completed
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handleTransferMark(car);
                              }}
                              className="bg-black/20 backdrop-blur-md text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-black/30 hover:text-green-500 font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                            >
                              Transfer Owner Book
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center text-white/70">
                        No sold cars found. Mark cars as sold from the car details or edit car page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}