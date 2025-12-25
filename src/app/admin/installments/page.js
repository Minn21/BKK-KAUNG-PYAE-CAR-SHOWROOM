"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fetchInstallments = async () => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Skipping installment fetch.");
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
        
        const response = await fetch(`${API_BASE_URL}/api/cars/sold/installment`, { 
          cache: "no-store",
          headers: headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Unauthorized: Token is missing or invalid");
            setInstallments([]);
            setLoading(false);
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const apiCars = Array.isArray(data.data) ? data.data : [];

        if (!Array.isArray(apiCars)) {
          console.warn("Unexpected response shape when fetching installments:", data);
          setInstallments([]);
          setLoading(false);
          return;
        }

        // Normalize the API response to match expected format
        const normalizedInstallments = apiCars.map((car, index) => {
          // Get installment data
          const installment = car.installment || {};
          const buyer = installment.buyer || {};
          
          // Calculate total price (downPayment + remainingAmount)
          const totalPrice = (installment.downPayment || 0) + (installment.remainingAmount || 0);
          
          // Calculate monthly payment (remainingAmount / months)
          const months = installment.months || 0;
          const remainingAmount = installment.remainingAmount || 0;
          const monthlyPayment = months > 0 ? remainingAmount / months : 0;
          
          // Format start date
          const startDate = installment.startDate 
            ? new Date(installment.startDate).toLocaleDateString('en-GB')
            : '';

          const carId = car.id || car._id || index;
          return {
            id: carId,
            licensePlate: car.licenseNo || '',
            carModel: `${car.brand || ''} ${car.model || ''}`.trim(),
            brand: car.brand || '',
            model: car.model || '',
            customerName: buyer.name || '',
            passportNumber: buyer.passport || '',
            phoneNumber: buyer.phone || '',
            email: buyer.email || '',
            carPrice: totalPrice,
            downPayment: installment.downPayment || 0,
            monthlyPayment: car.installmentMonthlyPayment,
            installmentPeriod: months,
            purchasedDate: startDate,
            carListNo: car.carList || '',
            // Include full car and installment data for details page
            car: car,
            installment: installment
          };
        });

        setInstallments(normalizedInstallments);
      } catch (error) {
        console.error("Failed to fetch installments from API:", error);
        setInstallments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstallments();
  }, [API_BASE_URL]);


  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userType');
    
    // Redirect to login page
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
            <Link href="/admin/installments" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
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
            <Link href="/admin/installment-analysis" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
              Installment Analysis
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Installments Management</h2>
              <p className="text-white/70 text-sm mt-1">
                {loading ? 'Loading...' : `${installments.length} installment${installments.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>

          {/* Installments Table */}
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
                      Customer
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Down Payment
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Monthly Payment
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Date
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
                        Loading installments...
                      </td>
                    </tr>
                  ) : installments.length > 0 ? (
                    installments.map((installment, index) => (
                      <tr key={installment.id} className="hover:bg-black/30 backdrop-blur-2xl">
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {index + 1}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {installment.licensePlate || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {(() => {
                            // Extract brand from carModel (first word) or use existing brand fields
                            if (installment.carBrand || installment.brand) {
                              return installment.carBrand || installment.brand;
                            }
                            if (installment.carModel) {
                              return installment.carModel.split(' ')[0] || 'N/A';
                            }
                            return 'N/A';
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {(() => {
                            // Extract model from carModel (everything after first word) or use existing model field
                            if (installment.carModel && !installment.model) {
                              const parts = installment.carModel.split(' ');
                              return parts.length > 1 ? parts.slice(1).join(' ') : 'N/A';
                            }
                            return installment.model || 'N/A';
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {installment.customerName || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {installment.carPrice ? `฿${parseInt(installment.carPrice).toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {installment.downPayment ? `฿${parseInt(installment.downPayment).toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {installment.monthlyPayment ? `฿${parseInt(installment.monthlyPayment).toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/installment-details/${installment.id}`}>
                          {installment.purchasedDate || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">
                          <Link 
                            href={`/admin/edit-installment/${installment.id}`} 
                            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking Edit button
                            className="bg-black/20 backdrop-blur-md text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-black/30 hover:text-red-500 font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center text-white/70">
                        No installments found. Add cars from the Add New Car page or create new installments here.
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