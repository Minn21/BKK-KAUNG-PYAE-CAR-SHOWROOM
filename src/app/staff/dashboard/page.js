"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function StaffDashboard() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCars = async () => {
      try {
        // Try to fetch from API first
        if (API_BASE_URL) {
          const response = await fetch(`${API_BASE_URL}/api/public/cars`, { cache: "no-store" });
          const data = await response.json();
          const apiCars = Array.isArray(data.data) ? data.data : [];

          if (Array.isArray(apiCars) && apiCars.length > 0) {
            const normalizedCars = apiCars.map((car, index) => {
              const normalizedPrice =
                typeof car.priceToSell === "number"
                  ? `฿${car.priceToSell.toLocaleString("en-US")}`
                  : car.priceToSell ?? "";

              return {
                ...car,
                id: car.id ?? car._id ?? index,
                price: normalizedPrice,
                wd: car.wheelDrive,
              };
            });
            
            // Filter to show only available cars (same as admin dashboard logic)
            const availableCars = normalizedCars.filter(car => car.isAvailable !== false);
            setCars(availableCars);
            setLoading(false);
            return;
          }
        }

        // Fallback to localStorage
        const savedCars = localStorage.getItem("cars");
        if (savedCars) {
          const parsedCars = JSON.parse(savedCars);
          setCars(parsedCars);
        } else {
          // Default cars
          const defaultCars = [
            { id: 1, licenseNo: "ABC-123", brand: "Toyota", model: "Camry", engine: "2.5L", color: "White", wd: "FWD", gear: "Auto", price: "฿25,000" },
            { id: 2, licenseNo: "XYZ-789", brand: "Honda", model: "Civic", engine: "1.8L", color: "Blue", wd: "FWD", gear: "Manual", price: "฿22,000" },
            { id: 3, licenseNo: "DEF-456", brand: "Ford", model: "Focus", engine: "2.0L", color: "Red", wd: "FWD", gear: "Auto", price: "฿20,000" },
          ];
          setCars(defaultCars);
        }
      } catch (error) {
        console.error("Failed to load cars:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCars();
  }, [API_BASE_URL]);

  const handleLogout = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex items-center justify-center" style={{ backgroundImage: "url('/View.png')" }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

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

      {/* Secondary Navigation Bar */}
      <nav className="bg-black/70 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-nowrap space-x-4 sm:space-x-8 h-12 sm:h-14 overflow-x-auto scrollbar-hide">
            <Link href="/staff/dashboard" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
              Car List
            </Link>
            <Link href="/staff/installment-calculator" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Installment Calculator
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Car Inventory</h2>
          </div>

          {/* Car Table */}
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
                      Engine
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      WD
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Gear
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                  {cars.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-white">
                        No cars available
                      </td>
                    </tr>
                  ) : (
                    cars.map((car, index) => (
                      <tr key={car.id} className="hover:bg-black/30 backdrop-blur-2xl">
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base font-medium text-white cursor-pointer font-numeric" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {index + 1}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.licenseNo || car.licensePlate || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.brand || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.model || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.enginePower || car.engine || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.color || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.wd || car.wheelDrive || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.gear || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer font-numeric" onClick={() => window.location.href = `/staff/car-details/${car.id}`}>
                          {car.price || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">
                          <Link 
                            href={`/staff/car-details/${car.id}`} 
                            className="bg-black/20 backdrop-blur-md text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-black/30 hover:text-red-500 font-medium border border-white/30 transition-all duration-200 cursor-pointer inline-block"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))
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

