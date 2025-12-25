"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PhotoViewer from "@/app/components/PhotoViewer";

export default function StaffCarDetails() {
  const params = useParams();
  const carId = params.id;
  
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load car data
    const loadCar = async () => {
      try {
        // Try API first
        if (API_BASE_URL) {
          const response = await fetch(`${API_BASE_URL}/api/car/${carId}`, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json();
            const carData = data.data || data;
            
            // Extract URL from image object array (always one object)
            carData.carPhoto = carData.carPhoto?.[0]?.url || carData.photo?.[0]?.url || carData.carPhoto || carData.photo || null;
            
            setCar(carData);
            setLoading(false);
            return;
          }
        }

        // Fallback to localStorage
        const savedCars = localStorage.getItem('cars');
        if (savedCars) {
          const cars = JSON.parse(savedCars);
          const foundCar = cars.find(c => c.id.toString() === carId || c._id?.toString() === carId);
          if (foundCar) {
            setCar(foundCar);
          }
        }
      } catch (error) {
        console.error("Error loading car:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCar();
  }, [carId, API_BASE_URL]);

  const handleLogout = () => {
    window.location.href = "/";
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

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "number") return `฿${value.toLocaleString()}`;
    return value;
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
      {/* Top Navigation Bar */}
      <nav className="bg-black/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <h1 className="text-xl sm:text-2xl font-semibold text-white">BKK KAUNG PYAE CAR SHOWROOM - Staff</h1>
            <button 
              onClick={handleLogout}
              className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Back Button */}
      <div className="absolute left-2 sm:left-4 top-16 sm:top-20 z-10">
        <Link 
          href="/staff/dashboard" 
          className="text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Car Details</h2>
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
                      alt={`${car.brand || ""} ${car.model || ""}`}
                      className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">License No.</label>
                      <p className="text-white text-lg font-semibold">{car.licenseNo || car.licensePlate || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Brand</label>
                        <p className="text-white text-lg font-semibold">{car.brand || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                        <p className="text-white text-lg font-semibold">{car.model || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
                        <p className="text-white text-lg font-semibold">{car.year || "N/A"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                        <p className="text-white text-lg font-semibold">{car.color || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Purchased Kilo</label>
                        <p className="text-white text-lg font-semibold">{car.purchasedKilo || "N/A"} {car.purchasedKilo ? "km" : ""}</p>
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
                    <p className="text-white text-lg font-semibold">{car.engine || car.enginePower || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Wheel Drive (WD)</label>
                    <p className="text-white text-lg font-semibold">{car.wd || car.wheelDrive || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Gear Type</label>
                    <p className="text-white text-lg font-semibold">{car.gear || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Selling Price</label>
                    <p className="text-white text-lg font-semibold">{formatCurrency(car.price || car.priceToSell)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Selling Price</label>
                    <p className="text-white text-lg font-semibold">{formatCurrency(car.price || car.priceToSell)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Finance Fee</label>
                    <p className="text-white text-lg font-semibold">{car.financeFee || "N/A"}</p>
                  </div>
                </div>
              </div>

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
                          return (
                            <div key={index} className="bg-black/30 border border-gray-600/50 rounded-md p-3">
                              {item.details && (
                                <p className="text-white text-base font-medium">{item.details}</p>
                              )}
                              {item.amount && (
                                <p className="text-gray-300 text-sm mt-1">
                                  Cost: ฿{parseFloat(item.amount).toLocaleString()}
                                </p>
                              )}
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
    </div>
  );
}

