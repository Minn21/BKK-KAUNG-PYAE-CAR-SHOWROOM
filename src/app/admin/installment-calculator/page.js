"use client";
import Link from "next/link";
import { useState } from "react";

export default function InstallmentCalculatorPage() {
  const [formData, setFormData] = useState({
    carValue: '',
    vatPercent: '7', // Fixed at 7%
    downPaymentAmount: '',
    interestPerMonth: '',
    financeFees: '',
    installmentMonths: ''
  });
  const [result, setResult] = useState(null);

  const handleLogout = () => {
    window.location.href = '/admin/login';
  };

  // BKK KAUNG PYAE Car Showroom Installment Formula (Flexible)
  const calculateCarInstallment = (car_value, vat_percent, down_payment_amount, interest_per_month_percent, finance_fees, total_month_for_installment) => {
    // 1. Total with VAT
    const total_with_vat = car_value + (car_value * (vat_percent / 100));

    // 2. Add finance fees
    const total_with_vat_and_fees = total_with_vat + finance_fees;

    // 3. Down payment (exact amount)
    const down_payment = down_payment_amount;

    // 4. Installment left to pay (remaining amount)
    const installment_left_to_pay = total_with_vat_and_fees - down_payment;

    // 5. Interest per month (manual percentage)
    const interest_per_month = installment_left_to_pay * (interest_per_month_percent / 100);

    // 6. Total interest over all months
    const total_interest = interest_per_month * total_month_for_installment;

    // 7. Total to pay (installment left + total interest)
    const total_to_pay = installment_left_to_pay + total_interest;

    // 8. Monthly installment
    const monthly_installment = total_to_pay / total_month_for_installment;

    // 9. Total amount customer will pay
    const total_customer_payment = down_payment + total_to_pay;

    // 10. Calculate down payment percentage for display
    const down_payment_percentage = (down_payment / total_with_vat_and_fees) * 100;

    return {
      total_with_vat,
      total_with_vat_and_fees,
      down_payment,
      down_payment_percentage,
      installment_left_to_pay,
      interest_per_month,
      total_interest,
      total_to_pay,
      monthly_installment,
      total_customer_payment
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const carValue = parseFloat(formData.carValue);
    const vatPercent = parseFloat(formData.vatPercent);
    const downPaymentAmount = parseFloat(formData.downPaymentAmount);
    const interestPerMonth = parseFloat(formData.interestPerMonth);
    const financeFees = parseFloat(formData.financeFees) || 0;
    const installmentMonths = parseInt(formData.installmentMonths);

    if (carValue && vatPercent && downPaymentAmount && interestPerMonth && installmentMonths) {
      const calculation = calculateCarInstallment(carValue, vatPercent, downPaymentAmount, interestPerMonth, financeFees, installmentMonths);
      setResult({
        ...calculation,
        // Format all numbers to 2 decimal places
        total_with_vat: calculation.total_with_vat.toFixed(2),
        total_with_vat_and_fees: calculation.total_with_vat_and_fees.toFixed(2),
        down_payment: calculation.down_payment.toFixed(2),
        down_payment_percentage: calculation.down_payment_percentage.toFixed(2),
        installment_left_to_pay: calculation.installment_left_to_pay.toFixed(2),
        interest_per_month: calculation.interest_per_month.toFixed(2),
        total_interest: calculation.total_interest.toFixed(2),
        total_to_pay: calculation.total_to_pay.toFixed(2),
        monthly_installment: calculation.monthly_installment.toFixed(2),
        total_customer_payment: calculation.total_customer_payment.toFixed(2)
      });
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
            <Link href="/admin/installment-calculator" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
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
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">BKK KAUNG PYAE Installment Calculator</h2>
            <div className="bg-black/30 backdrop-blur-md rounded-lg p-4 max-w-5xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-2">Installment Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-300">
                <div className="bg-green-900/30 p-3 rounded">
                  <div className="font-semibold text-green-300">VAT</div>
                  <div>Fixed at 7%</div>
                </div>
                <div className="bg-red-900/30 p-3 rounded">
                  <div className="font-semibold text-red-300">Down Payment</div>
                  <div>Manual amount input</div>
                </div>
                <div className="bg-blue-900/30 p-3 rounded">
                  <div className="font-semibold text-blue-300">Monthly Interest</div>
                  <div>Manual % input</div>
                </div>
                <div className="bg-yellow-900/30 p-3 rounded">
                  <div className="font-semibold text-yellow-300">Finance Fees</div>
                  <div>Manual amount input</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Calculator Form */}
            <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Car Value (฿)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.carValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, carValue: value});
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black text-sm sm:text-base placeholder:text-gray-400"
                    placeholder="100000"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">
                    VAT Percentage (%) 
                    <span className="text-green-400 ml-2">[Fixed: 7%]</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.vatPercent}
                    onChange={(e) => setFormData({...formData, vatPercent: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black text-sm sm:text-base placeholder:text-gray-400"
                    placeholder="7"
                    required
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Finance Fees (฿)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.financeFees}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, financeFees: value});
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black text-sm sm:text-base placeholder:text-gray-400"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">
                    60% of (Car Value + VAT + Finance Fees) (฿)
                    <span className="text-green-400 ml-2">[Auto-calculated]</span>
                  </label>
                  <input
                    type="number"
                    value={(() => {
                      const carValue = parseFloat(formData.carValue) || 0;
                      const vatPercent = parseFloat(formData.vatPercent) || 7;
                      const financeFees = parseFloat(formData.financeFees) || 0;
                      const totalWithVat = carValue + (carValue * (vatPercent / 100));
                      const totalWithFees = totalWithVat + financeFees;
                      return totalWithFees > 0 ? (totalWithFees * 0.6).toFixed(2) : '';
                    })()}
                    readOnly
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md bg-gray-200 text-gray-700 text-sm sm:text-base cursor-not-allowed"
                    placeholder="Auto-calculated"
                  />
                </div>
                
                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Down Payment Amount (฿)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.downPaymentAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, downPaymentAmount: value});
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black text-sm sm:text-base placeholder:text-gray-400"
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Interest Per Month (%)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.interestPerMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, interestPerMonth: value});
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black text-sm sm:text-base placeholder:text-gray-400"
                    placeholder="2.5"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-base sm:text-lg font-medium text-white mb-2 sm:mb-3">Installment Months</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.installmentMonths}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers (no decimal for months)
                      if (value === '' || /^\d*$/.test(value)) {
                        setFormData({...formData, installmentMonths: value});
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black text-sm sm:text-base placeholder:text-gray-400"
                    placeholder="12"
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-md hover:bg-red-700 transition-colors text-base sm:text-lg font-medium"
                  >
                    Calculate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ 
                        carValue: '', 
                        vatPercent: '7', 
                        downPaymentAmount: '', 
                        interestPerMonth: '', 
                        financeFees: '', 
                        installmentMonths: '' 
                      });
                      setResult(null);
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-md hover:bg-gray-700 transition-colors text-base sm:text-lg font-medium"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* Results */}
            <div className="bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Installment Breakdown</h3>
              
              {result ? (
                <div className="space-y-4">
                  {/* Main Results */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 sm:p-6 rounded-lg border border-red-200">
                    <div className="text-3xl sm:text-4xl font-bold text-red-900 mb-2">฿{result.monthly_installment}</div>
                    <div className="text-base sm:text-lg font-semibold text-red-700">Monthly Installment</div>
                    <div className="text-sm text-red-600 mt-1">Pay this amount for {formData.installmentMonths} months</div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">฿{result.down_payment}</div>
                    <div className="text-base sm:text-lg font-semibold text-blue-700">Down Payment (฿{formData.downPaymentAmount})</div>
                    <div className="text-sm text-blue-600 mt-1">Pay this exact amount upfront</div>
                    <div className="text-xs text-blue-500 mt-1">({result.down_payment_percentage}% of total price)</div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Calculation Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Car Value:</span>
                        <span className="font-medium">฿{parseFloat(formData.carValue).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">VAT ({formData.vatPercent}%):</span>
                        <span className="font-medium">฿{(result.total_with_vat - formData.carValue).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800 font-medium">Total with VAT:</span>
                        <span className="font-bold text-gray-900">฿{result.total_with_vat}</span>
                      </div>
                      {formData.financeFees && parseFloat(formData.financeFees) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Finance Fees:</span>
                          <span className="font-medium">฿{formData.financeFees}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-800 font-medium">Total with Fees:</span>
                        <span className="font-bold text-gray-900">฿{result.total_with_vat_and_fees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Installment Amount:</span>
                        <span className="font-medium">฿{result.installment_left_to_pay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest per Month ({formData.interestPerMonth}%):</span>
                        <span className="font-medium">฿{result.interest_per_month}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Interest:</span>
                        <span className="font-medium">฿{result.total_interest}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-800 font-medium">Total Payable:</span>
                        <span className="font-bold text-gray-900">฿{result.total_to_pay}</span>
                      </div>
                    </div>
                  </div>

                  {/* Final Summary */}
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200">
                    <div className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">฿{result.total_customer_payment}</div>
                    <div className="text-base sm:text-lg font-semibold text-green-700">Total Customer Payment</div>
                    <div className="text-sm text-green-600 mt-1">Down payment + All installments</div>
                  </div>

                  {/* Quick Summary */}
                  <div className="bg-yellow-50 p-4 sm:p-6 rounded-lg border border-yellow-200">
                    <h4 className="text-lg font-semibold text-yellow-800 mb-2">Payment Summary</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <div>• Pay <strong>฿{result.down_payment}</strong> immediately</div>
                      <div>• Then pay <strong>฿{result.monthly_installment}</strong> for <strong>{formData.installmentMonths} months</strong></div>
                      <div>• Total interest: <strong>฿{result.total_interest}</strong></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-300 text-base sm:text-lg mb-4">
                    Enter car details and click Calculate to see installment breakdown
                  </div>
                  <div className="text-gray-400 text-sm">
                    <div>• VAT fixed at 7%</div>
                    <div>• Down payment amount (manual input)</div>
                    <div>• Monthly interest percentage (manual input)</div>
                    <div>• Finance fees (optional manual input)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
