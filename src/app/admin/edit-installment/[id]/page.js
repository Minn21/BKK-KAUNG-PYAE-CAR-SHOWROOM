"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditInstallment() {
  const params = useParams();
  const router = useRouter();
  const installmentId = params.id;

  const [formData, setFormData] = useState({
    customerName: "",
    passportNumber: "",
    phoneNumber: "",
    carPrice: "",
    downPayment: "",
    monthlyPayment: "",
    installmentPeriod: "",
    carModel: "",
    licensePlate: "",
    carListNo: "",
    purchasedDate: ""
  });
  const [loading, setLoading] = useState(true);
  const [paidMonths, setPaidMonths] = useState(new Set());
  const [ownerBookStatus, setOwnerBookStatus] = useState('pending');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [penaltyFees, setPenaltyFees] = useState({});
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fetchInstallmentData = async () => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Cannot fetch installment data.");
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
        
        // Fetch installment data from API
        const response = await fetch(`${API_BASE_URL}/api/car/${installmentId}/installment`, {
          cache: "no-store",
          headers: headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            alert("Unauthorized: Please login again.");
            router.push('/admin/login');
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Data",data);
        const car = data.data || data;
        const installment = car.installment || {};
        const buyer = installment.buyer || {};
        
        // Calculate total price (downPayment + remainingAmount)
        const totalPrice = (installment.downPayment || 0) + (installment.remainingAmount || 0);
        
        // Get monthly payment from car or calculate it
        const months = installment.months || 0;
        const remainingAmount = installment.remainingAmount || 0;
        const monthlyPayment = car.installmentMonthlyPayment || (months > 0 ? remainingAmount / months : 0);
        
        // Convert date to YYYY-MM-DD format for date input
        let formattedDate = "";
        if (installment.startDate) {
          try {
            const date = new Date(installment.startDate);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Error parsing date:", e);
          }
        }

        setFormData({
          customerName: buyer.name || "",
          passportNumber: buyer.passport || "",
          phoneNumber: buyer.phone || "",
          carPrice: car.car.priceToSell.toString(),
          downPayment: (installment.downPayment || 0).toString(),
          monthlyPayment: installment.monthlyPayment.toString(),
          installmentPeriod: installment.months.toString(),
          carModel: `${car.car.brand || ''} ${car.car.model || ''}`.trim(),
          licensePlate: car.car.licenseNo || "",
          carListNo: car.carList || "",
          purchasedDate: formattedDate
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading installment data:", error);
        alert(`Failed to load installment data: ${error.message}`);
        setLoading(false);
      }
    };

    fetchInstallmentData();
  }, [installmentId, API_BASE_URL, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePenaltyFeeChange = (monthNumber, value) => {
    setPenaltyFees(prev => ({
      ...prev,
      [monthNumber]: value ? Number(value) : 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!API_BASE_URL) {
      alert("API base URL is not configured.");
      return;
    }

    try {
      // Get token from localStorage for authentication
      const token = localStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Calculate remaining amount
      const carPrice = Number(formData.carPrice) || 0;
      const downPayment = Number(formData.downPayment) || 0;
      const remainingAmount = carPrice - downPayment;

      // Parse monthly payment and installment period
      const monthlyPayment = Number(formData.monthlyPayment);
      const installmentPeriod = Number(formData.installmentPeriod);

      // Prepare installment data in the required format
      const installmentData = {
        installment: {
          downPayment: downPayment,
          remainingAmount: remainingAmount,
          months: installmentPeriod,
          startDate: formData.purchasedDate,
          monthlyPayment: monthlyPayment,
          buyer: {
            name: formData.customerName,
            passport: formData.passportNumber,
            phone: formData.phoneNumber,
            email: "" // Add email if needed
          }
        }
      };

      // Update installment via API
      const response = await fetch(`${API_BASE_URL}/api/car/${installmentId}/sell-installment`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(installmentData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized: Please login again.");
          router.push('/admin/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      alert("Installment updated successfully!");
      router.push(`/admin/installment-details/${installmentId}`);
    } catch (error) {
      console.error("Failed to update installment:", error);
      alert(`Failed to update installment: ${error.message}`);
    }
  };

  const handleLogout = () => {
    window.location.href = '/admin/login';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-white text-xl">Loading installment details...</div>
        </div>
      </div>
    );
  }

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
        <Link href="/admin/installments" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
          ← Back to Installments
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Edit Installment</h2>
            <div className="flex space-x-4">
              <Link href="/admin/installments" className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer">
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-white mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="passportNumber" className="block text-sm font-medium text-white mb-2">
                        Passport Number *
                      </label>
                      <input
                        type="text"
                        id="passportNumber"
                        name="passportNumber"
                        value={formData.passportNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-white mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Financial Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="carPrice" className="block text-sm font-medium text-white mb-2">
                        Car Price (฿) *
                      </label>
                      <input
                        type="number"
                        id="carPrice"
                        name="carPrice"
                        value={formData.carPrice}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="downPayment" className="block text-sm font-medium text-white mb-2">
                        Down Payment (฿) *
                      </label>
                      <input
                        type="number"
                        id="downPayment"
                        name="downPayment"
                        value={formData.downPayment}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="monthlyPayment" className="block text-sm font-medium text-white mb-2">
                        Monthly Payment (฿) *
                      </label>
                      <input
                        type="number"
                        id="monthlyPayment"
                        name="monthlyPayment"
                        value={formData.monthlyPayment}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="installmentPeriod" className="block text-sm font-medium text-white mb-2">
                        Installment Period (Months) *
                      </label>
                      <input
                        type="number"
                        id="installmentPeriod"
                        name="installmentPeriod"
                        value={formData.installmentPeriod}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Vehicle Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="carModel" className="block text-sm font-medium text-white mb-2">
                        Car Model *
                      </label>
                      <input
                        type="text"
                        id="carModel"
                        name="carModel"
                        value={formData.carModel}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="licensePlate" className="block text-sm font-medium text-white mb-2">
                        License Plate *
                      </label>
                      <input
                        type="text"
                        id="licensePlate"
                        name="licensePlate"
                        value={formData.licensePlate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* <div>
                      <label htmlFor="carListNo" className="block text-sm font-medium text-white mb-2">
                        Car List No. *
                      </label>
                      <input
                        type="text"
                        id="carListNo"
                        name="carListNo"
                        value={formData.carListNo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div> */}
                    <div>
                      <label htmlFor="purchasedDate" className="block text-sm font-medium text-white mb-2">
                        Purchased Date *
                      </label>
                      <input
                        type="date"
                        id="purchasedDate"
                        name="purchasedDate"
                        value={formData.purchasedDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>



                {/* Payment Status Management */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Payment Status Management</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-black/30 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-white">
                          Payment Schedule ({formData.installmentPeriod} months)
                        </h4>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setPaidMonths(new Set())}
                            className="bg-black/20 backdrop-blur-md text-white px-3 py-1.5 rounded-md hover:bg-black/30 text-sm font-medium cursor-pointer border border-white/30 transition-all duration-200"
                          >
                            Reset All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const allMonths = Array.from({ length: parseInt(formData.installmentPeriod) || 0 }, (_, index) => index + 1);
                              setPaidMonths(new Set(allMonths));
                            }}
                            className="bg-black/20 backdrop-blur-md text-white px-3 py-1.5 rounded-md hover:bg-black/30 text-sm font-medium cursor-pointer border border-white/30 transition-all duration-200"
                          >
                            Mark All Paid
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: parseInt(formData.installmentPeriod) || 0 }, (_, index) => {
                          const monthNumber = index + 1;
                          const isPaid = paidMonths.has(monthNumber);
                          
                          // Calculate due date from purchased date
                          const dueDate = new Date(formData.purchasedDate);
                          dueDate.setMonth(dueDate.getMonth() + monthNumber);
                          
                          return (
                            <div
                              key={monthNumber}
                              className={`bg-black/30 rounded-lg p-3 border border-gray-600 transition-all duration-200 ${
                                isPaid ? 'border-green-500 bg-green-900/20' : 'hover:border-gray-500'
                              }`}
                            >
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <p className="text-sm text-gray-300">Month {monthNumber}</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaidMonths(prev => {
                                        const newPaidMonths = new Set(prev);
                                        if (newPaidMonths.has(monthNumber)) {
                                          newPaidMonths.delete(monthNumber);
                                        } else {
                                          newPaidMonths.add(monthNumber);
                                        }
                                        return newPaidMonths;
                                      });
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      isPaid
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {isPaid ? 'Paid' : 'Pending'}
                                    </span>
                                  </button>
                                </div>
                                <p className="text-white text-base font-bold mb-2">
                                  {formatCurrency(parseInt(formData.monthlyPayment) || 0)}
                                </p>
                                <p className="text-xs text-gray-400 mb-2">
                                  Due: {dueDate.toLocaleDateString('en-GB')}
                                </p>
                                {!isPaid && (
                                  <div className="mt-2">
                                    <label className="block text-xs text-gray-300 mb-1">Penalty Fee (Overdue)</label>
                                    <input
                                      type="number"
                                      value={penaltyFees[monthNumber] || ''}
                                      onChange={(e) => handlePenaltyFeeChange(monthNumber, e.target.value)}
                                      placeholder="0"
                                      min="0"
                                      className="w-full px-2 py-1 text-sm border border-gray-500 rounded-md bg-black/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment Summary */}
                      <div className="mt-4 p-3 bg-black/30 rounded-lg border border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-300">Monthly Payment</p>
                            <p className="text-white text-base font-bold">
                              {formatCurrency(parseInt(formData.monthlyPayment) || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-300">Paid Amount</p>
                            <p className="text-green-400 text-base font-bold">
                              {formatCurrency((parseInt(formData.monthlyPayment) || 0) * paidMonths.size)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-300">Remaining</p>
                            <p className="text-yellow-400 text-base font-bold">
                              {formatCurrency((parseInt(formData.monthlyPayment) || 0) * ((parseInt(formData.installmentPeriod) || 0) - paidMonths.size))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Book Status Management */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Owner Book Status Management</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-black/30 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-sm text-gray-300 mb-1">Current Status</p>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              ownerBookStatus === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : ownerBookStatus === 'ready'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {ownerBookStatus === 'pending' ? 'Pending Payment' : 
                               ownerBookStatus === 'ready' ? 'Ready for Transfer' : 
                               'Transferred to Owner'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setOwnerBookStatus('pending')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border border-white/30 ${
                              ownerBookStatus === 'pending'
                                ? 'bg-black/40 backdrop-blur-md text-white'
                                : 'bg-black/20 backdrop-blur-md text-white hover:bg-black/30'
                            }`}
                          >
                            Pending
                          </button>
                          <button
                            type="button"
                            onClick={() => setOwnerBookStatus('ready')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border border-white/30 ${
                              ownerBookStatus === 'ready'
                                ? 'bg-black/40 backdrop-blur-md text-white'
                                : 'bg-black/20 backdrop-blur-md text-white hover:bg-black/30'
                            }`}
                          >
                            Ready
                          </button>
                          <button
                            type="button"
                            onClick={() => setOwnerBookStatus('transferred')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border border-white/30 ${
                              ownerBookStatus === 'transferred'
                                ? 'bg-black/40 backdrop-blur-md text-white'
                                : 'bg-black/20 backdrop-blur-md text-white hover:bg-black/30'
                            }`}
                          >
                            Transferred
                          </button>
                        </div>
                      </div>

                      {/* Status Information */}
                      <div className="text-sm text-gray-300 space-y-2">
                        {ownerBookStatus === 'pending' && (
                          <p>• Owner book will be transferred after all payments are completed</p>
                        )}
                        {ownerBookStatus === 'ready' && (
                          <p>• All payments completed. Owner book is ready for transfer</p>
                        )}
                        {ownerBookStatus === 'transferred' && (
                          <p>• Owner book has been transferred to the customer</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
