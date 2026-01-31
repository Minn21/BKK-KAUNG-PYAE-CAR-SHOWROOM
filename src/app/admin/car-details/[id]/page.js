"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PhotoViewer from "@/app/components/PhotoViewer";

export default function CarDetails() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id;
  
  // Mock car data - in a real app, this would come from an API or database
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [kiloAtSale, setKiloAtSale] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    customerName: "",
    phoneNumber: "",
    passportNumber: ""
  });
  const [isSoldCar, setIsSoldCar] = useState(false);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const fetchCarData = async () => {
      setLoading(true);
      
      // Try to fetch from API first
      if (API_BASE_URL) {
        try {
          // Get token from localStorage for authentication
          const token = localStorage.getItem('token');
          
          const headers = {};
          
          // Add Authorization header if token exists
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`${API_BASE_URL}/api/car/${carId}`, { 
            cache: "no-store",
            headers: headers
          });
          
          if (response.ok) {
            const data = await response.json();
            const apiCar = data.data || data;

            console.log('apiCar', apiCar);
            
            if (apiCar) {
              const soldFlag = apiCar?.isAvailable === false;

              // Handle carPhoto - extract URL from image object array (always one object)
              const carPhotoUrl = apiCar.images?.[0]?.url || null;

              const isPaidSale = apiCar.sale != null;
              const isInstallment = apiCar.installment != null;
              const buyer = apiCar.sale?.buyer || apiCar.installment?.buyer || null;

              const rawSoldDate = isPaidSale
                ? (apiCar.sale?.date || apiCar.sale?.soldDate)
                : isInstallment
                  ? apiCar.installment?.startDate
                  : null;

              let formattedSoldDate = "";
              if (rawSoldDate) {
                try {
                  formattedSoldDate = new Date(rawSoldDate).toLocaleDateString("en-GB");
                } catch {
                  formattedSoldDate = String(rawSoldDate);
                }
              }

              const soldPriceValue = isPaidSale
                ? (apiCar.sale?.price ?? null)
                : isInstallment
                  ? (apiCar.priceToSell ?? null)
                  : null;

              const transferCompleted = Boolean(apiCar.ownerBookTransfer?.transferred);
              const rawTransferDate = apiCar.ownerBookTransfer?.transferDate;
              let formattedTransferDate = "";
              if (rawTransferDate) {
                try {
                  formattedTransferDate = new Date(rawTransferDate).toLocaleDateString("en-GB");
                } catch {
                  formattedTransferDate = String(rawTransferDate);
                }
              }
              
              // Normalize the API response to match expected format
              const normalizedCar = {
                id: apiCar.id || apiCar._id || carId,
                isAvailable: apiCar.isAvailable,
                boughtType: apiCar.boughtType,
                licenseNo: apiCar.licenseNo || apiCar.licensePlate || apiCar.license || "",
                brand: apiCar.brand || apiCar.make || "",
                model: apiCar.model || apiCar.name || "",
                engine: apiCar.enginePower || apiCar.engine || "",
                color: apiCar.color || "",
                wd: apiCar.wheelDrive || apiCar.wd || "",
                gear: apiCar.gear || apiCar.gearType || "",
                price: apiCar.priceToSell 
                  ? (typeof apiCar.priceToSell === 'number' 
                      ? `฿${apiCar.priceToSell.toLocaleString()}` 
                      : apiCar.priceToSell)
                  : apiCar.price || "",
                financeFee:
                  apiCar.financeFee ??
                  apiCar.financeFees ??
                  apiCar.finance_fee ??
                  apiCar.finance?.fee ??
                  apiCar.finance?.financeFee ??
                  "",
                originalPrice: apiCar.originalPrice || apiCar.priceToBuy || apiCar.price || "",
                year: apiCar.year || "",
                purchasedKilo: apiCar.kilo || "",
                repairHistory: apiCar.repairs || [],
                carPhoto: carPhotoUrl,
                carList: apiCar.carList || apiCar.carListNo || "",
                sale: apiCar.sale || null,
                installment: apiCar.installment || null,

                // Fields used by the existing "Sale Information" UI (localStorage shape)
                soldOutDate: formattedSoldDate,
                soldPrice: soldPriceValue,
                customerName: buyer?.name ?? "",
                phoneNumber: buyer?.phone ?? "",
                passportNumber: buyer?.passport ?? "",
                transferCompleted: transferCompleted,
                transferDate: formattedTransferDate,

                // Optional profit field (some APIs may return this)
                profit: apiCar.profit ?? apiCar.sale?.profit ?? apiCar.installment?.profit,
              };
              
              setCar(normalizedCar);
              setIsSoldCar(soldFlag);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching car from API:", error);
          // Continue to localStorage fallback
        }
      }
      
      // Fallback to localStorage - check both regular cars and sold cars
      const savedCars = localStorage.getItem('cars');
      const savedSoldCars = localStorage.getItem('soldCars');
      
      let foundCar = null;
      let carIsSold = false;

      // First check regular cars
      if (savedCars) {
        const cars = JSON.parse(savedCars);
        foundCar = cars.find(car => car.id.toString() === carId.toString() || car._id?.toString() === carId.toString());
      }

      // If not found in regular cars, check sold cars
      if (!foundCar && savedSoldCars) {
        const soldCars = JSON.parse(savedSoldCars);
        foundCar = soldCars.find(car => car.id.toString() === carId.toString() || car._id?.toString() === carId.toString());
        if (foundCar) {
          carIsSold = true;
        }
      }

      if (foundCar) {
        console.log(foundCar);
        setCar(foundCar);
        setIsSoldCar(carIsSold);
      }
      
      setLoading(false);
    };

    fetchCarData();
  }, [carId, API_BASE_URL]);

  const parseCurrency = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numeric = parseCurrency(value);
    if (numeric === 0) {
      return "฿0";
    }
    return `฿${numeric.toLocaleString()}`;
  };

  const handleMarkAsSold = () => {
    if (!car) return;
    
    // Set sold price to blank - user will enter manually
    setSoldPrice("");
    // Set default kiloAtSale to current car kilo if available
    setKiloAtSale(car.kilo ? car.kilo.toString() : "");
    setShowSoldModal(true);
  };

  const handleSoldSubmit = async () => {
    if (!soldPrice || soldPrice.trim() === '') {
      alert("Please enter the sold price.");
      return;
    }

    if (!customerInfo.customerName.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    if (!customerInfo.passportNumber || !customerInfo.passportNumber.trim()) {
      alert("Please enter the passport number.");
      return;
    }

    if (!kiloAtSale || kiloAtSale.trim() === '') {
      alert("Please enter the kilometer reading at sale.");
      return;
    }

    // Prepare sold car data in the format expected by backend
    // Backend expects: boughtType, sale.price, sale.soldDate, sale.kiloAtSale, sale.buyer.name, sale.buyer.passport
    const soldCarData = {
      boughtType: 'Paid',
      sale: {
        price: parseInt(soldPrice),
        soldDate: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
        kiloAtSale: parseInt(kiloAtSale),
        buyer: {
          name: customerInfo.customerName.trim(),
          passport: customerInfo.passportNumber.trim(),
          phone: customerInfo.phoneNumber.trim() || undefined // Optional field
        }
      }
    };

    console.log('soldCarData', soldCarData);

    // Call API to mark car as sold
    if (API_BASE_URL) {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/car/${carId}/sell`, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(soldCarData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to mark car as sold: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Car marked as sold:', responseData);

        alert(`"${car.brand} ${car.model}" has been marked as sold for ฿${parseInt(soldPrice).toLocaleString()} and moved to the sold list!`);
        
        // Close modal and redirect to profit calculator
        setShowSoldModal(false);
        setSoldPrice("");
        setKiloAtSale("");
        setCustomerInfo({ customerName: "", phoneNumber: "", passportNumber: "" });
        // router.push(`/admin/profit-calculator/${carId}`);
        router.push(`/admin/sold-list`);
      } catch (error) {
        console.error("Error marking car as sold:", error);
        alert(`Failed to mark car as sold: ${error.message}`);
      }
    }
  };

  const handleSoldCancel = () => {
    setShowSoldModal(false);
    setSoldPrice("");
    setKiloAtSale("");
    setCustomerInfo({ customerName: "", phoneNumber: "", passportNumber: "" });
  };

  const handleLogout = () => {
    window.location.href = '/admin/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-white text-xl">Loading car details...</div>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-white text-xl">Car not found</div>
        </div>
      </div>
    );
  }

  const carPhotoSrc =
    typeof car.carPhoto === "string" && car.carPhoto.trim().length > 0
      ? car.carPhoto
      : "/admin.png";

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



      {/* Back Button - Responsive Positioning */}
      <div className="absolute left-2 sm:left-4 top-16 sm:top-20 z-10">
        <Link 
          href={isSoldCar ? "/admin/sold-list" : "/admin/dashboard"} 
          className="text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          ← Back to {isSoldCar ? "Sold List" : "Dashboard"}
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {isSoldCar ? "Sold Car Details" : "Car Details"}
              </h2>
              {isSoldCar && (
                <p className="text-green-400 text-sm mt-1">✓ This car has been sold</p>
              )}
            </div>
            {!isSoldCar && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href={`/admin/edit-car/${carId}`} className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium w-full sm:w-auto border border-white/30 transition-all duration-200 cursor-pointer text-center">
                  Edit Car
                </Link>
                <button
                  onClick={handleMarkAsSold}
                  className="bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-red-700 hover:text-red-200 text-base sm:text-lg font-medium w-full sm:w-auto transition-all duration-200 cursor-pointer"
                >
                  Mark as Sold
                </button>
              </div>
            )}
          </div>

          {/* Car Details Card */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
            <div className="p-6">
              {/* Car Photo and Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Car Photo */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Car Photo</h3>
                  <div className="bg-black/30 rounded-lg p-4">
                    <PhotoViewer 
                      src={carPhotoSrc} 
                      alt={`${car.brand} ${car.model}`}
                      className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      enableFullScreen={true}
                    />
                    {/* Debug info */}
                    <div className="text-xs text-gray-400 mt-2">
                      Image source: {carPhotoSrc}
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">License No.</label>
                      <p className="text-white text-lg font-semibold">{car.licenseNo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Brand</label>
                        <p className="text-white text-lg font-semibold">{car.brand}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                        <p className="text-white text-lg font-semibold">{car.model}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
                        <p className="text-white text-lg font-semibold">{car.year || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                        <p className="text-white text-lg font-semibold">{car.color || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Purchased Kilo</label>
                        <p className="text-white text-lg font-semibold">{car.purchasedKilo || 'N/A'} {car.purchasedKilo ? 'km' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Technical Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Engine Power</label>
                    <p className="text-white text-lg font-semibold">{car.engine || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Wheel Drive (WD)</label>
                    <p className="text-white text-lg font-semibold">{car.wd || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Gear Type</label>
                    <p className="text-white text-lg font-semibold">{car.gear || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Selling Price</label>
                    <p className="text-white text-lg font-semibold">{car.price || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information (hide for sold cars) */}
              {!isSoldCar && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Financial Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Selling Price</label>
                      <p className="text-white text-lg font-semibold">{formatCurrency(car.price)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Information - Only show for sold cars */}
              {isSoldCar && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Sale Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Sold Date</label>
                      <p className="text-white text-lg font-semibold">{car.soldOutDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Sold Price</label>
                      <p className="text-green-400 text-lg font-semibold">
                        {car.soldPrice 
                          ? (typeof car.soldPrice === 'number' 
                              ? `฿${car.soldPrice.toLocaleString()}` 
                              : car.soldPrice)
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Customer Name</label>
                      <p className="text-white text-lg font-semibold">{car.customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                      <p className="text-white text-lg font-semibold">{car.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Passport Number</label>
                      <p className="text-white text-lg font-semibold">{car.passportNumber || 'N/A'}</p>
                    </div>
                    {car.transferCompleted && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Transfer Status</label>
                        <p className="text-green-400 text-lg font-semibold">✓ Completed</p>
                      </div>
                    )}
                    {car.transferDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Transfer Date</label>
                        <p className="text-white text-lg font-semibold">{car.transferDate}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Profit/Loss Calculation */}
                  {car.soldPrice !== null && car.soldPrice !== undefined && car.soldPrice !== "" && car.price && (
                    <div className="mt-6 p-4 bg-black/30 rounded-lg">
                      <h4 className="text-md font-semibold text-white mb-3">Profit Analysis</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Sold Price</label>
                          <p className="text-green-400 text-lg font-semibold">
                            {car.soldPrice 
                              ? (typeof car.soldPrice === 'number' 
                                  ? `฿${car.soldPrice.toLocaleString()}` 
                                  : car.soldPrice)
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Profit/Loss</label>
                          {(() => {
                            // Match Sold List priority + formula:
                            // 1) Profit Calculator saved value (if exists)
                            // 2) car.profit (if backend provided)
                            // 3) Basic: Profit = Sold Price - (Original Price + Finance Fee)
                            try {
                              const savedCalculations = JSON.parse(localStorage.getItem('profitCalculations') || '[]');
                              const calc = savedCalculations.find((c) => c.carId === (car.id || carId));
                              if (calc && typeof calc.profit === 'number') {
                                const p = calc.profit;
                                const profitFormatted = p >= 0 ? `฿${p.toLocaleString()}` : `-฿${Math.abs(p).toLocaleString()}`;
                                const profitColor = p >= 0 ? 'text-green-400' : 'text-red-400';
                                return (
                                  <p className={`${profitColor} text-lg font-bold`} title={`From Profit Calculator (${calc.lastUpdated})`}>
                                    {profitFormatted}
                                  </p>
                                );
                              }
                            } catch {
                              // ignore localStorage parse errors
                            }

                            if (typeof car.profit === "number") {
                              const p = car.profit;
                              const profitFormatted = p >= 0 ? `฿${p.toLocaleString()}` : `-฿${Math.abs(p).toLocaleString()}`;
                              const profitColor = p >= 0 ? 'text-green-400' : 'text-red-400';
                              return (
                                <p
                                  className={`${profitColor} text-lg font-bold`}
                                  title={`From backend (Original: ${formatCurrency(car.originalPrice || car.price)}, Sold: ${formatCurrency(car.soldPrice)}, Expenses: ${formatCurrency(car.financeFee || 0)})`}
                                >
                                  {profitFormatted}
                                </p>
                              );
                            }

                            const originalPrice = parseCurrency(car.originalPrice || car.price);
                            const soldPrice = parseCurrency(car.soldPrice);
                            const financeFee = car.financeFee ? parseCurrency(car.financeFee) : 0;
                            const totalExpenses = financeFee;

                            const profit = soldPrice - (originalPrice + totalExpenses);
                            const profitFormatted = profit >= 0 ? `฿${profit.toLocaleString()}` : `-฿${Math.abs(profit).toLocaleString()}`;
                            const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
                            return (
                              <p
                                className={`${profitColor} text-lg font-bold`}
                                title={`Basic calculation (Original: ${formatCurrency(originalPrice)}, Sold: ${formatCurrency(soldPrice)}, Expenses: ${formatCurrency(totalExpenses)})`}
                              >
                                {profitFormatted}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Repair History */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Repair History</h3>
                <div className="bg-black/30 rounded-lg p-4 space-y-3">
                  {(() => {
                    if (!car.repairHistory || (Array.isArray(car.repairHistory) && car.repairHistory.length === 0)) {
                      return <p className="text-gray-400 text-base italic">No repair history recorded</p>;
                    }

                    if (Array.isArray(car.repairHistory)) {
                      return car.repairHistory.map((item, index) => {
                        if (typeof item === "string") {
                          return (
                            <p key={index} className="text-white text-base leading-relaxed">
                              {item}
                            </p>
                          );
                        }

                        if (item && typeof item === "object") {
                          // Handle API format: description, repairDate, cost
                          const description = item.description || item.details || "";
                          const cost = item.cost !== undefined ? item.cost : item.amount;
                          const repairDate = item.repairDate;
                          
                          // Format date if present
                          let formattedDate = null;
                          if (repairDate) {
                            try {
                              const date = new Date(repairDate);
                              formattedDate = date.toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            } catch (e) {
                              formattedDate = repairDate;
                            }
                          }
                          
                          return (
                            <div key={index} className="bg-black/30 border border-gray-600/50 rounded-md p-3">
                              {description && (
                                <p className="text-white text-base font-medium">{description}</p>
                              )}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-2">
                                {formattedDate && (
                                  <p className="text-gray-400 text-sm">
                                    Date: {formattedDate}
                                  </p>
                                )}
                                {cost !== undefined && cost !== null && (
                                  <p className="text-gray-300 text-sm">
                                    Cost: ฿{parseFloat(cost).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      });
                    }

                    if (typeof car.repairHistory === "string") {
                      return <p className="text-white text-base leading-relaxed">{car.repairHistory}</p>;
                    }

                    return (
                      <pre className="text-white text-sm bg-black/40 rounded-md p-3 overflow-auto">
                        {JSON.stringify(car.repairHistory, null, 2)}
                      </pre>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sold Price Modal */}
      {showSoldModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-100 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Mark Car as Sold</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Car: {car?.brand} {car?.model} ({car?.licenseNo})
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listed Price: {car?.price}
                  </label>
                </div>

              <div>
                <label htmlFor="soldPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Sold Price *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="soldPrice"
                  value={soldPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setSoldPrice(value);
                    }
                  }}
                  placeholder="Enter sold price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="kiloAtSale" className="block text-sm font-medium text-gray-700 mb-1">
                  Kilometer Reading at Sale (km) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="kiloAtSale"
                  value={kiloAtSale}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*$/.test(value)) {
                      setKiloAtSale(value);
                    }
                  }}
                  placeholder="Enter kilometer reading"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={customerInfo.customerName}
                  onChange={(e) => setCustomerInfo({...customerInfo, customerName: e.target.value})}
                  placeholder="Enter buyer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="passportNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Passport Number *
                </label>
                <input
                  type="text"
                  id="passportNumber"
                  value={customerInfo.passportNumber}
                  onChange={(e) => setCustomerInfo({...customerInfo, passportNumber: e.target.value})}
                  placeholder="Enter passport number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={customerInfo.phoneNumber}
                  onChange={(e) => setCustomerInfo({...customerInfo, phoneNumber: e.target.value})}
                  placeholder="Enter phone number (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSoldCancel}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hover:text-red-500 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSoldSubmit}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-red-200 font-medium cursor-pointer"
                  >
                    Mark as Sold
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
