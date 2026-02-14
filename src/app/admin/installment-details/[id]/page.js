"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function InstallmentDetails() {
  const params = useParams();
  const installmentId = params.id;
  
  const [installment, setInstallment] = useState(null);
  const [car, setCar] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [paidMonths, setPaidMonths] = useState(new Set());
  const [ownerBookStatus, setOwnerBookStatus] = useState('pending'); // 'pending', 'ready', 'transferred'
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fetchInstallmentDetails = async () => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Cannot fetch installment details.");
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
        
        // Fetch installment details from API
        const response = await fetch(`${API_BASE_URL}/api/car/${installmentId}/installment`, {
          cache: "no-store",
          headers: headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            alert("Unauthorized: Please login again.");
            window.location.href = '/admin/login';
            return;
          }
          if (response.status === 404) {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || "Car or installment not found");
          setLoading(false);
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          const { car: carData, installment: installmentData, paymentSummary: summaryData } = data.data;
          
          // Set car and payment summary
          setCar(carData);
          setPaymentSummary(summaryData);
          
          // Normalize installment data for display
          const buyer = installmentData.buyer || {};
          const months = installmentData.months || 0;
          
          // Format start date
          let formattedDate = "";
          if (installmentData.startDate) {
            try {
              const date = new Date(installmentData.startDate);
              formattedDate = date.toLocaleDateString('en-GB');
            } catch (e) {
              formattedDate = installmentData.startDate;
            }
          }
          
          // Use the original car price (priceToSell) - same as shown in the installments list
          const carPrice = carData.priceToSell || 0;
          
          const normalizedInstallment = {
            id: installmentId,
            customerName: buyer.name || "",
            passportNumber: buyer.passport || "",
            phoneNumber: buyer.phone || "",
            email: buyer.email || "",
            carPrice: carPrice,
            downPayment: installmentData.downPayment || 0,
            monthlyPayment: installmentData.monthlyPayment || summaryData.monthlyPayment || 0,
            installmentPeriod: months,
            purchasedDate: formattedDate,
            carModel: `${carData.brand || ''} ${carData.model || ''}`.trim(),
            licensePlate: carData.licenseNo || "",
            carListNo: carData.carList || "",
            paymentHistory: installmentData.paymentHistory || []
          };
          
          setInstallment(normalizedInstallment);
          
          // Set paid months based on payment history
          const paidMonthsSet = new Set();
          const paymentHistory = installmentData.paymentHistory || [];
          
          // Try to extract month numbers from paymentHistory if available
          if (paymentHistory.length > 0 && paymentHistory[0].month !== undefined) {
            // If paymentHistory has month field, use it
            paymentHistory.forEach(payment => {
              if (payment.month && payment.month <= months) {
                paidMonthsSet.add(payment.month);
              }
            });
          } else {
            // Otherwise, calculate based on number of payments made
            const paymentsCount = summaryData.paymentsMade || paymentHistory.length || 0;
            for (let i = 1; i <= paymentsCount && i <= months; i++) {
              paidMonthsSet.add(i);
            }
          }
          
          setPaidMonths(paidMonthsSet);
          
          // Set owner book status based on payment completion
          if (summaryData.isFullyPaid) {
            setOwnerBookStatus('ready');
          } else if (summaryData.paymentProgress >= 100) {
            setOwnerBookStatus('ready');
        } else {
            setOwnerBookStatus('pending');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading installment details:", error);
        alert(`Failed to load installment details: ${error.message}`);
        setLoading(false);
      }
    };

    fetchInstallmentDetails();
  }, [installmentId, API_BASE_URL]);


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

  const toNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.-]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };



  // Note: This is a read-only details page - no payment modifications allowed

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-white text-xl">Loading installment details...</div>
        </div>
      </div>
    );
  }

  if (!installment) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/View.png')" }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-white text-xl">Installment not found</div>
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
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Installment Details</h2>
            <Link 
              href={`/admin/edit-installment/${installmentId}`}
              className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer"
            >
              Edit Installment
            </Link>
          </div>

          {/* Installment Details Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Customer Information */}
            <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-300">Name</p>
                    <p className="text-white text-lg font-medium">{installment.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Passport Number</p>
                    <p className="text-white text-lg font-medium">{installment.passportNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Phone Number</p>
                    <p className="text-white text-lg font-medium">{installment.phoneNumber}</p>
                  </div>
                  {installment.email && (
                    <div>
                      <p className="text-sm text-gray-300">Email</p>
                      <p className="text-white text-lg font-medium">{installment.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Financial Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-300">Car Price</p>
                    <p className="text-white text-lg font-medium">{installment.carPrice ? `฿${parseInt(installment.carPrice).toLocaleString()}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Down Payment</p>
                    <p className="text-white text-lg font-medium">{installment.downPayment ? `฿${parseInt(installment.downPayment).toLocaleString()}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Monthly Payment</p>
                    <p className="text-white text-lg font-medium">{installment.monthlyPayment ? `฿${parseInt(installment.monthlyPayment).toLocaleString()}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Installment Period</p>
                    <p className="text-white text-lg font-medium">{installment.installmentPeriod || 'N/A'} months</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Vehicle Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-300">Car Model</p>
                    <p className="text-white text-lg font-medium">{installment.carModel || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">License Plate</p>
                    <p className="text-white text-lg font-medium">{installment.licensePlate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Purchased Date</p>
                    <p className="text-white text-lg font-medium">{installment.purchasedDate || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Payment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-300">Total Amount</p>
                  <p className="text-white text-xl font-bold">
                    {paymentSummary ? `฿${(paymentSummary.totalAmount || 0).toLocaleString()}` : 
                     installment.carPrice ? `฿${parseInt(installment.carPrice).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300">Paid Amount</p>
                  <p className="text-green-400 text-xl font-bold">
                    {paymentSummary ? `฿${(paymentSummary.paidAmount || 0).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300">Remaining Amount</p>
                  <p className="text-yellow-400 text-xl font-bold">
                    {installment.monthlyPayment && installment.installmentPeriod ? 
                      `฿${((parseInt(installment.monthlyPayment) || 0) * ((parseInt(installment.installmentPeriod) || 0) - paidMonths.size)).toLocaleString()}` : 
                      paymentSummary ? `฿${(paymentSummary.remainingAmount || 0).toLocaleString()}` : 
                      'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300">Payment Progress</p>
                  <p className="text-white text-xl font-bold">
                    {paymentSummary ? `${(paymentSummary.paymentProgress || 0).toFixed(1)}%` : 'N/A'}
                  </p>
                  {paymentSummary && (
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(paymentSummary.paymentProgress || 0, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
              
              {/* Payment Schedule Display - Read Only */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-white">
                    Payment Schedule ({installment.installmentPeriod || 0} months)
                  </h4>
                  <span className="text-xs text-gray-400 italic">View Only</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: parseInt(installment.installmentPeriod) || 0 }, (_, index) => {
                      const monthNumber = index + 1;
                      const paymentAmount = parseInt(installment.monthlyPayment) || 0;
                      
                      // Calculate due date from start date
                      const dueDate = new Date();
                      if (installment.purchasedDate) {
                        try {
                          // Try parsing as ISO date first (from API)
                          const parsedDate = new Date(installment.purchasedDate);
                          if (!isNaN(parsedDate.getTime())) {
                            dueDate.setTime(parsedDate.getTime());
                          } else {
                            // Fallback to DD/MM/YYYY format
                        const [day, month, year] = installment.purchasedDate.split('/');
                            if (day && month && year) {
                        dueDate.setDate(parseInt(day));
                        dueDate.setMonth(parseInt(month) - 1); // Month is 0-indexed
                        dueDate.setFullYear(parseInt(year));
                            }
                          }
                        } catch (e) {
                          console.error("Error parsing date:", e);
                        }
                      }
                      dueDate.setMonth(dueDate.getMonth() + monthNumber);
                      
                      const isPaid = paidMonths.has(monthNumber);
                      
                      // Find penalty fee from payment history
                      const paymentRecord = installment.paymentHistory?.find(p => p.month === monthNumber);
                      const penaltyFee = paymentRecord?.penaltyFee || 0;
                      const totalAmount = paymentAmount + penaltyFee;
                      
                      return (
                        <div 
                          key={monthNumber} 
                          className={`bg-black/30 rounded-lg p-4 border transition-all duration-200 ${
                            isPaid ? 'border-green-500 bg-green-900/20' : 'border-gray-600'
                          }`}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <p className="text-sm text-gray-300">Month {monthNumber}</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isPaid 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {isPaid ? 'Paid' : 'Pending'}
                                </span>
                            </div>
                            <p className="text-white text-base font-semibold mb-1 font-numeric">
                              ฿{paymentAmount.toLocaleString()}
                            </p>
                            {penaltyFee > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-400">Penalty Fee</p>
                                <p className="text-red-400 text-sm font-semibold font-numeric">
                                  +฿{penaltyFee.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {penaltyFee > 0 && (
                              <div className="pt-2 border-t border-gray-600">
                                <p className="text-xs text-gray-400">Total Paid</p>
                                <p className="text-green-400 text-lg font-bold font-numeric">
                                  ฿{totalAmount.toLocaleString()}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Due: {dueDate.toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {/* Payment Summary */}
                <div className="mt-6 p-4 bg-black/30 rounded-lg border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-300">Monthly Payment</p>
                      <p className="text-white text-lg font-bold font-numeric">
                        ฿{(paymentSummary?.monthlyPayment || parseInt(installment.monthlyPayment) || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-300">Payments Made</p>
                      <p className="text-white text-lg font-bold font-numeric">
                        {paymentSummary?.paymentsMade || paidMonths.size} / {installment.installmentPeriod || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Section */}
          {installment.paymentHistory && installment.paymentHistory.length > 0 && (
            <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-600">
                    <thead className="bg-black/20 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">Penalty Fee</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-black/10 backdrop-blur-2xl divide-y divide-gray-600">
                      {installment.paymentHistory.map((payment, index) => {
                        const paymentDate = payment.paymentDate || payment.date || payment.createdAt;
                        let formattedDate = 'N/A';
                        if (paymentDate) {
                          try {
                            formattedDate = new Date(paymentDate).toLocaleDateString('en-GB');
                          } catch (e) {
                            formattedDate = paymentDate;
                          }
                        }
                        const penaltyFee = toNumber(payment.penaltyFee || 0);
                        const rawAmount = toNumber(payment.amount || 0);
                        const expectedMonthly = toNumber(installment.monthlyPayment || 0);

                        // Our edit page currently posts: amount = (monthly + penalty) and penaltyFee separately.
                        // Some older/back-end records might store amount = monthly only.
                        // Detect which case we have to avoid double-counting in the UI.
                        const amountLooksLikeTotal =
                          penaltyFee > 0 &&
                          expectedMonthly > 0 &&
                          Math.abs(rawAmount - (expectedMonthly + penaltyFee)) < 1;

                        const amountLooksLikeBase =
                          penaltyFee > 0 &&
                          expectedMonthly > 0 &&
                          Math.abs(rawAmount - expectedMonthly) < 1;

                        const amount = amountLooksLikeTotal
                          ? Math.max(rawAmount - penaltyFee, 0)
                          : rawAmount;

                        const total = amountLooksLikeBase ? rawAmount + penaltyFee : rawAmount;
                        
                        return (
                          <tr key={index} className="hover:bg-black/30">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{formattedDate}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-semibold font-numeric">
                              ฿{amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold font-numeric">
                              {penaltyFee > 0 ? (
                                <span className="text-red-400">฿{penaltyFee.toLocaleString()}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400 font-bold font-numeric">
                              ฿{total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Owner Book Status Section */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Owner Book Status</h3>
              
              <div className="space-y-4">
                {/* Status Display */}
                <div className="flex justify-between items-center p-4 bg-black/30 rounded-lg border border-gray-600">
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
                  
                  {/* Read-only: Transfer functionality available in Edit page */}
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
        </div>
      </div>

    </div>
  );
}
