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
  const [confirmedPenalties, setConfirmedPenalties] = useState({});
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [bulkActionMessage, setBulkActionMessage] = useState("");
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showMarkAllPaidConfirmation, setShowMarkAllPaidConfirmation] = useState(false);
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
        console.log("Installment details (edit page)", data);

        const root = data.data || data;
        const carData = root.car || {};
        const installment = root.installment || {};
        const buyer = installment.buyer || {};
        const summaryData = root.paymentSummary || {};
        
        // Get months and monthly payment
        const months = installment.months || 0;
        const monthlyPayment = installment.monthlyPayment || summaryData.monthlyPayment || 0;
        
        // Calculate total price (downPayment + remainingAmount)
        // Use the original car price (priceToSell) - same as shown in other pages
        const carPrice = carData.priceToSell || 0;
        
        // Convert start date to YYYY-MM-DD format for date input
        let formattedDate = "";
        if (installment.startDate) {
          try {
            const date = new Date(installment.startDate);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toISOString().split("T")[0];
            }
          } catch (e) {
            console.error("Error parsing date:", e);
          }
        }

          setFormData({
          customerName: buyer.name || "",
          passportNumber: buyer.passport || "",
          phoneNumber: buyer.phone || "",
          carPrice: carPrice.toString(),
          downPayment: (installment.downPayment || 0).toString(),
          monthlyPayment: monthlyPayment.toString(),
          installmentPeriod: months.toString(),
          carModel: `${carData.brand || ""} ${carData.model || ""}`.trim(),
          licensePlate: carData.licenseNo || "",
          carListNo: carData.carList || "",
          purchasedDate: formattedDate,
        });

        // Initialize paid months based on payment history / summary,
        // so the payment management UI matches the real process
        const paidMonthsSet = new Set();
        const paymentHistory = installment.paymentHistory || [];

        if (paymentHistory.length > 0 && paymentHistory[0].month !== undefined) {
          // Use explicit month field from payment history
          paymentHistory.forEach((payment) => {
            if (payment.month && payment.month <= months) {
              paidMonthsSet.add(payment.month);
            }
          });
        } else {
          // Fallback: use paymentsMade from payment summary or number of history entries
          const paymentsCount =
            summaryData.paymentsMade || paymentHistory.length || 0;
          for (let i = 1; i <= paymentsCount && i <= months; i++) {
            paidMonthsSet.add(i);
          }
        }

        setPaidMonths(paidMonthsSet);

        // Initialize owner book status similar to InstallmentDetails
        if (summaryData.isFullyPaid || (summaryData.paymentProgress || 0) >= 100) {
          setOwnerBookStatus("ready");
        } else {
          setOwnerBookStatus("pending");
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading installment data:", error);
        alert(`Failed to load installment data: ${error.message}`);
        setLoading(false);
      }
    };

    fetchInstallmentData();
  }, [installmentId, API_BASE_URL, router]);

  // Auto-update owner book status based on payment progress:
  // - Pending while not all months are paid
  // - Ready when all months are paid
  // - Once transferred, keep 'transferred'
  useEffect(() => {
    const totalMonths = parseInt(formData.installmentPeriod) || 0;
    if (ownerBookStatus === "transferred") return;

    if (totalMonths > 0 && paidMonths.size >= totalMonths) {
      setOwnerBookStatus("ready");
    } else {
      setOwnerBookStatus("pending");
    }
  }, [paidMonths, formData.installmentPeriod, ownerBookStatus]);

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

  // Record a single monthly payment as PAID via API
  const handleMonthlyPayment = async (monthNumber, options = {}) => {
    const { silent = false } = options;
    if (!API_BASE_URL) {
      if (!silent) {
        alert("API base URL is not configured.");
      }
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

      // Calculate payment amount (monthly payment + penalty fee if any)
      const monthlyPayment = parseFloat(formData.monthlyPayment) || 0;
      const penaltyFee = penaltyFees[monthNumber] || 0;
      const totalAmount = monthlyPayment + penaltyFee;

      console.log('💰 Payment Data for Month', monthNumber, ':', {
        monthlyPayment,
        penaltyFee,
        totalAmount,
        penaltyFeesState: penaltyFees
      });

      // Prepare payment data according to API validation requirements
      const paymentData = {
        monthNumber: monthNumber,
        amount: totalAmount,
        paid: true,
        paymentDate: new Date().toISOString(),
      };

      // Add penalty fee if it exists
      if (penaltyFee > 0) {
        paymentData.penaltyFee = penaltyFee;
        console.log('✅ Including penalty fee in payment:', penaltyFee);
      } else {
        console.log('❌ No penalty fee for this month');
      }

      const response = await fetch(`${API_BASE_URL}/api/car/${installmentId}/installment/monthly-payment`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (!silent) {
            alert("Unauthorized: Please login again.");
          }
          router.push('/admin/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        
        // Handle validation errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          if (!silent) {
            alert(`Validation errors:\n${errorMessages}`);
          } else {
            console.error("Validation errors (monthly payment):", errorMessages);
          }
          return;
        }
        
        throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        // Handle validation errors in response
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          if (!silent) {
            alert(`Validation errors:\n${errorMessages}`);
          } else {
            console.error("Validation errors (monthly payment):", errorMessages);
          }
          return;
        }
        
        if (!silent) {
          alert(`Failed to record payment: ${result.message || 'Unknown error occurred'}`);
        } else {
          console.error("Failed to record payment:", result.message || 'Unknown error occurred');
        }
        return;
      }

      // Update local state to reflect the payment
      setPaidMonths(prev => {
        const newPaidMonths = new Set(prev);
        newPaidMonths.add(monthNumber);
        return newPaidMonths;
      });

      // Clear penalty fee for this month after successful payment
      setPenaltyFees(prev => {
        const newPenaltyFees = { ...prev };
        delete newPenaltyFees[monthNumber];
        return newPenaltyFees;
      });

      // Show success message
      if (!silent) {
        alert(`Payment for Month ${monthNumber} recorded successfully!`);
      }
      
      // Optionally refresh the installment data to get updated payment history
      // You can uncomment this if you want to refresh the data
      // window.location.reload();
      
    } catch (error) {
      console.error("Failed to record payment:", error);
      if (!silent) {
        alert(`Failed to record payment: ${error.message || 'An unexpected error occurred. Please try again.'}`);
      }
    }
  };

  // Reset a single monthly payment to UNPAID via API
  const handleResetMonthlyPayment = async (monthNumber) => {
    if (!API_BASE_URL) {
      alert("API base URL is not configured.");
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // When resetting, mark paid=false and amount=0 for that month
      const paymentData = {
        monthNumber: monthNumber,
        amount: 0,
        paid: false,
      };

      const response = await fetch(`${API_BASE_URL}/api/car/${installmentId}/installment/monthly-payment`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized: Please login again.");
          router.push('/admin/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));

        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          alert(`Validation errors:\n${errorMessages}`);
          return;
        }

        throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          alert(`Validation errors:\n${errorMessages}`);
          return;
        }

        alert(`Failed to reset payment: ${result.message || 'Unknown error occurred'}`);
        return;
      }

      // Update local state: remove this month from paidMonths
      setPaidMonths(prev => {
        const newPaidMonths = new Set(prev);
        newPaidMonths.delete(monthNumber);
        return newPaidMonths;
      });

      // Clear penalty fee for this month
      setPenaltyFees(prev => {
        const newPenaltyFees = { ...prev };
        delete newPenaltyFees[monthNumber];
        return newPenaltyFees;
      });
    } catch (error) {
      console.error("Failed to reset payment:", error);
      alert(`Failed to reset payment: ${error.message || 'An unexpected error occurred. Please try again.'}`);
    }
    };

  // Mark car as sold / owner book transferred (moves to Sold List)
  const handleTransferOwnerBook = async () => {
    if (!API_BASE_URL) {
      alert("API base URL is not configured.");
      return;
    }

    // Confirm transfer
    if (!window.confirm("Are you sure you want to transfer the owner book?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/car/${installmentId}/owner-book-transfer`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ notes: "" }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        const message =
          result.message ||
          result.error ||
          `Request failed with status ${response.status}`;
        alert(`Failed to transfer owner book: ${message}`);
        return;
      }

      // Update UI status
      setOwnerBookStatus("transferred");
      setBulkActionMessage("✅ Owner book transferred successfully!");

      // Refresh the page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to transfer owner book:", error);
      alert(
        `Failed to transfer owner book: ${
          error.message || "An unexpected error occurred. Please try again."
        }`
      );
    }
  };

  const handleConfirmResetAll = async () => {
    setShowResetConfirmation(false);
    setBulkActionInProgress(true);
    setBulkActionMessage("Resetting all payments...");
    
    const totalMonths = parseInt(formData.installmentPeriod) || 0;
    // Reset only months that are currently marked as paid
    for (let month = 1; month <= totalMonths; month++) {
      if (paidMonths.has(month)) {
        // eslint-disable-next-line no-await-in-loop
        await handleResetMonthlyPayment(month);
      }
    }
    
    setBulkActionInProgress(false);
    setBulkActionMessage("All payments have been reset.");
  };

  const handleConfirmMarkAllPaid = async () => {
    setShowMarkAllPaidConfirmation(false);
    setBulkActionInProgress(true);
    setBulkActionMessage("Marking all months as paid...");
    
    const totalMonths = parseInt(formData.installmentPeriod) || 0;
    for (let month = 1; month <= totalMonths; month++) {
      if (!paidMonths.has(month)) {
        // eslint-disable-next-line no-await-in-loop
        await handleMonthlyPayment(month, { silent: true });
      }
    }
    
    setBulkActionInProgress(false);
    setBulkActionMessage("All months have been marked as paid.");
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

      // Parse numeric fields
      const downPayment = formData.downPayment !== "" ? Number(formData.downPayment) : undefined;
      const monthlyPayment = formData.monthlyPayment !== "" ? Number(formData.monthlyPayment) : undefined;
      const installmentPeriod = formData.installmentPeriod !== "" ? Number(formData.installmentPeriod) : undefined;

      // Prepare payload according to editInstallmentInfo controller
      const installmentData = {
        buyer: {
          name: formData.customerName || undefined,
          phone: formData.phoneNumber || undefined,
          email: undefined, // add email support in UI if needed
          passport: formData.passportNumber || undefined, // required when updating buyer
        },
        downPayment,
        // remainingAmount is managed by backend / existing data; we don't override it here
        months: installmentPeriod,
        startDate: formData.purchasedDate || undefined,
        monthlyPayment,
      };

      // Clean undefined fields (top-level)
      Object.keys(installmentData).forEach((key) => {
        if (
          installmentData[key] === undefined ||
          (typeof installmentData[key] === "object" &&
            installmentData[key] !== null &&
            Object.values(installmentData[key]).every((v) => v === undefined))
        ) {
          delete installmentData[key];
        }
      });

      // Update installment via correct API route
      const response = await fetch(`${API_BASE_URL}/api/car/${installmentId}/edit-installment`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(installmentData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized: Please login again.");
          router.push('/admin/login');
          return;
        }

        if (result && result.message) {
          alert(`Failed to update installment: ${result.message}`);
        } else {
          alert(`Failed to update installment: Request failed with status ${response.status}`);
        }
        return;
      }

      if (result && result.success === false) {
        alert(`Failed to update installment: ${result.message || 'Unknown error occurred'}`);
        return;
      }

      alert("Installment info updated successfully!");
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
        <Link href={`/admin/installment-details/${installmentId}`} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
          ← Back to Details
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Edit Installment</h2>
            <div className="flex space-x-4">
              <Link href={`/admin/installment-details/${installmentId}`} className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer">
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
                        type="text"
                        inputMode="numeric"
                        id="carPrice"
                        name="carPrice"
                        value={formData.carPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="downPayment" className="block text-sm font-medium text-white mb-2">
                        Down Payment (฿) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="downPayment"
                        name="downPayment"
                        value={formData.downPayment}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="monthlyPayment" className="block text-sm font-medium text-white mb-2">
                        Monthly Payment (฿) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="monthlyPayment"
                        name="monthlyPayment"
                        value={formData.monthlyPayment}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-textfield"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="installmentPeriod" className="block text-sm font-medium text-white mb-2">
                        Installment Period (Months) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="installmentPeriod"
                        name="installmentPeriod"
                        value={formData.installmentPeriod}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
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
                            onClick={() => setShowResetConfirmation(true)}
                            disabled={bulkActionInProgress}
                            className={`bg-black/20 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer border border-white/30 transition-all duration-200 ${
                              bulkActionInProgress
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-black/30 hover:text-red-500"
                            }`}
                          >
                            {bulkActionInProgress ? "Working..." : "Reset All"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMarkAllPaidConfirmation(true)}
                            disabled={bulkActionInProgress}
                            className={`bg-black/20 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer border border-white/30 transition-all duration-200 ${
                              bulkActionInProgress
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-black/30 hover:text-green-500"
                            }`}
                          >
                            {bulkActionInProgress ? "Working..." : "Mark All Paid"}
                          </button>
                        </div>
                      </div>
                      
                      {bulkActionMessage && (
                        <div className="mb-4 max-w-md mx-auto">
                          <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-blue-400 bg-blue-500/10 text-blue-100 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg leading-none">✔</span>
                              <div className="text-xs sm:text-sm font-medium">
                                {bulkActionMessage}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBulkActionMessage("")}
                              className="text-xs text-blue-200 hover:text-white transition-colors cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}

                      <div
                        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-all duration-300 ${
                          bulkActionInProgress ? "opacity-70 animate-pulse" : ""
                        }`}
                      >
                        {Array.from({ length: parseInt(formData.installmentPeriod) || 0 }, (_, index) => {
                          const monthNumber = index + 1;
                          const isPaid = paidMonths.has(monthNumber);
                          
                          // Calculate the next available box (first unpaid month)
                          const totalMonths = parseInt(formData.installmentPeriod) || 0;
                          let nextAvailableMonth = null;
                          for (let i = 1; i <= totalMonths; i++) {
                            if (!paidMonths.has(i)) {
                              nextAvailableMonth = i;
                              break;
                            }
                          }
                          
                          // Box is enabled only if it's the next available month or already paid
                          const isEnabled = isPaid || monthNumber === nextAvailableMonth;
                          const isDisabled = !isEnabled;
                          
                          // Calculate due date from purchased date
                          const dueDate = new Date(formData.purchasedDate);
                          dueDate.setMonth(dueDate.getMonth() + monthNumber);
                          
                          return (
                            <div
                              key={monthNumber}
                              className={`bg-black/30 rounded-lg p-3 border transition-all duration-200 ${
                                isPaid 
                                  ? 'border-green-500 bg-green-900/20' 
                                  : isDisabled
                                  ? 'border-gray-700 bg-black/20 opacity-50 cursor-not-allowed'
                                  : 'border-gray-600 hover:border-gray-500 cursor-pointer'
                              }`}
                              onClick={() => {
                                if (!isDisabled && !isPaid) {
                                  handleMonthlyPayment(monthNumber);
                                }
                              }}
                            >
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <p className={`text-sm ${isDisabled ? 'text-gray-500' : 'text-gray-300'}`}>
                                    Month {monthNumber}
                                  </p>
                                  <button
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDisabled && !isPaid) {
                                        handleMonthlyPayment(monthNumber);
                                        }
                                    }}
                                    className={isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                  >
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      isPaid
                                        ? 'bg-green-100 text-green-800'
                                        : isDisabled
                                        ? 'bg-gray-100 text-gray-500'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {isPaid ? 'Paid' : isDisabled ? 'Locked' : 'Pending'}
                                    </span>
                                  </button>
                                </div>
                                <div className="mb-2">
                                  <p className="text-xs text-gray-400 mb-1">Monthly Payment</p>
                                  <p className={`text-lg font-bold ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
                                  {formatCurrency(parseInt(formData.monthlyPayment) || 0)}
                                </p>
                                </div>
                                
                                {!isPaid && !isDisabled && (
                                  <div 
                                    className="mt-3 mb-2 pt-3 border-t border-gray-600"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <label className="block text-xs font-medium text-red-300 mb-1">Add Penalty Fee (if overdue)</label>
                                    <p className="text-xs text-gray-400 mb-2 italic">Enter amount, then click box to save</p>
                                    <div className="flex gap-1">
                                      <div className="flex-1 relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">฿</span>
                                    <input
                                          type="text"
                                          inputMode="numeric"
                                      value={penaltyFees[monthNumber] || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            // Allow only numbers and empty string
                                            if (value === '' || /^\d+$/.test(value)) {
                                              handlePenaltyFeeChange(monthNumber, value);
                                            }
                                          }}
                                      placeholder="0"
                                          className="w-full pl-6 pr-2 py-2 text-sm border border-red-400 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                      onClick={(e) => e.stopPropagation()}
                                          onFocus={(e) => {
                                            e.stopPropagation();
                                            e.target.select();
                                          }}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              e.target.blur();
                                            }
                                          }}
                                    />
                                  </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const currentValue = penaltyFees[monthNumber] || 0;
                                          if (currentValue > 0) {
                                            setConfirmedPenalties(prev => ({
                                              ...prev,
                                              [monthNumber]: true
                                            }));
                                            setTimeout(() => {
                                              setConfirmedPenalties(prev => ({
                                                ...prev,
                                                [monthNumber]: false
                                              }));
                                            }, 2000);
                                          }
                                          document.activeElement?.blur();
                                        }}
                                        className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors cursor-pointer font-medium"
                                      >
                                        ✓
                                      </button>
                                    </div>
                                    {confirmedPenalties[monthNumber] && (
                                      <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-center">
                                        <span className="text-green-400 text-xs font-medium">✓ Penalty fee added!</span>
                                      </div>
                                    )}
                                    {penaltyFees[monthNumber] > 0 && !confirmedPenalties[monthNumber] && (
                                      <div className="mt-2 pt-2 border-t border-red-400/30">
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-gray-400">Total with Penalty:</span>
                                          <span className="text-red-300 font-bold">
                                            ฿{((parseInt(formData.monthlyPayment) || 0) + (penaltyFees[monthNumber] || 0)).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <p className={`text-xs ${isDisabled ? 'text-gray-600' : 'text-gray-400'} ${!isPaid && !isDisabled ? 'mt-2' : 'mt-0'}`}>
                                  Due: {dueDate.toLocaleDateString('en-GB')}
                                </p>
                                {isDisabled && !isPaid && (
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    Complete previous months first
                                  </p>
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
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  ownerBookStatus === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : ownerBookStatus === "ready"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {ownerBookStatus === "pending"
                                  ? "Pending Payment"
                                  : ownerBookStatus === "ready"
                                  ? "Ready for Transfer"
                                  : "Transferred to Owner"}
                            </span>
                          </div>
                        </div>
                        
                          {/* When fully paid and not yet transferred, show a single Transfer button */}
                          {ownerBookStatus !== "transferred" &&
                            ownerBookStatus === "ready" && (
                          <button
                            type="button"
                                onClick={handleTransferOwnerBook}
                                className="px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border border-green-400 bg-green-500/10 text-green-200 hover:bg-green-500/20"
                          >
                                Transfer
                          </button>
                            )}
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

      {/* Reset All Confirmation Modal */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-600">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Reset All Payments</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to reset all payments for this installment? This action will clear all payment records.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowResetConfirmation(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmResetAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark All Paid Confirmation Modal */}
      {showMarkAllPaidConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-600">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Mark All as Paid</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to mark ALL months as paid? This will update all remaining unpaid months.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowMarkAllPaidConfirmation(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMarkAllPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors cursor-pointer"
                >
                  Mark All Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
