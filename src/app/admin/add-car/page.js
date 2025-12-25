"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoViewer from "@/app/components/PhotoViewer";

export default function AddCar() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    licenseNo: "3276",
    brand: "toyota",
    model: "yaris",
    engine: "1.2",
    color: "grey",
    wd: "",
    gear: "Automatic",
    price: "180000",
    originalPrice: "160000",
    year: "2014",
    purchasedKilo: "210000",
    purchaseDate: "2025-09-30",
    repairHistory: [],
    carPhoto: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRepairHistory, setShowRepairHistory] = useState(false);
  const [repairHistory, setRepairHistory] = useState([]);
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      carPhoto: file
    }));
  };

  const addRepairHistory = () => {
    setRepairHistory(prev => [...prev, { details: '', amount: '', repairDate: '' }]);
  };

  const removeRepairHistory = (index) => {
    setRepairHistory(prev => prev.filter((_, i) => i !== index));
  };

  const updateRepairHistory = (index, field, value) => {
    setRepairHistory(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Try to create via API first
      if (API_BASE_URL) {
        try {
          // Get token from localStorage for authentication
          const token = localStorage.getItem('token');
          
          // Debug: Log form data before sending
          console.log('Form data before sending:', formData);
          console.log('Repair history:', repairHistory);
          
          // Map wheelDrive - ensure it's one of the valid values
          let wheelDriveValue = formData.wd || '';
          if (wheelDriveValue === 'front-wheel') {
            wheelDriveValue = 'FWD';
          } else if (wheelDriveValue === 'rear-wheel') {
            wheelDriveValue = 'RWD';
          } else if (wheelDriveValue === 'all-wheel') {
            wheelDriveValue = 'AWD';
          } else if (wheelDriveValue === 'four-wheel') {
            wheelDriveValue = '4WD';
          }
          // If already FWD, RWD, AWD, or 4WD, keep it as is
          
          // Map gear values to backend expected format: "Manual" or "Automatic"
          let gearValue = formData.gear || '';
          if (gearValue === 'Auto' || gearValue === 'CVT' || gearValue === 'Semi-Auto') {
            gearValue = 'Automatic';
          } else if (gearValue === 'Manual') {
            gearValue = 'Manual';
          }
          
          // Prepare numeric fields - send as numbers, not strings
          const priceToSellNum = formData.price ? parseInt(formData.price) : null;
          const priceToSell = (priceToSellNum !== null && !isNaN(priceToSellNum)) ? priceToSellNum : null;
          
          const purchasePriceNum = formData.originalPrice ? parseInt(formData.originalPrice) : null;
          const purchasePrice = (purchasePriceNum !== null && !isNaN(purchasePriceNum)) ? purchasePriceNum : null;
          
          const yearNum = formData.year ? parseInt(formData.year) : null;
          const year = (yearNum !== null && !isNaN(yearNum)) ? yearNum : null;
          
          const kiloNum = formData.purchasedKilo ? parseInt(formData.purchasedKilo) : null;
          const kilo = (kiloNum !== null && !isNaN(kiloNum)) ? kiloNum : null;
          
          // Add purchaseDate - convert to ISO string format for backend
          let purchaseDate = formData.purchaseDate || new Date().toISOString();
          // If it's in YYYY-MM-DD format, convert to ISO string
          if (purchaseDate && !purchaseDate.includes('T')) {
            purchaseDate = new Date(purchaseDate).toISOString();
          }
          
          // Transform repair history to match backend schema
          // Backend expects: description, repairDate, cost
          const transformedRepairs = repairHistory.map(repair => {
            // Convert date to ISO string format (YYYY-MM-DD to ISO string)
            let repairDateValue = repair.repairDate || new Date().toISOString();
            // If it's already in YYYY-MM-DD format, convert to ISO string
            if (repairDateValue && !repairDateValue.includes('T')) {
              repairDateValue = new Date(repairDateValue).toISOString();
            }
            
            return {
              description: String(repair.details || '').trim(),
              repairDate: repairDateValue,
              cost: repair.amount ? Number(repair.amount) : 0
            };
          });
          
          // Validate required fields before sending
          const licenseNo = String(formData.licenseNo || '').trim();
          const brand = String(formData.brand || '').trim();
          const model = String(formData.model || '').trim();
          const enginePower = String(formData.engine || '').trim();
          const color = String(formData.color || '').trim();
          
          // Validate required fields
          if (!licenseNo || licenseNo.length < 2) {
            throw new Error('License number is required and must be at least 2 characters');
          }
          if (!brand || brand.length === 0) {
            throw new Error('Brand is required');
          }
          if (!model || model.length === 0) {
            throw new Error('Model is required');
          }
          if (!enginePower || enginePower.length === 0) {
            throw new Error('Engine power is required');
          }
          if (!color || color.length === 0) {
            throw new Error('Color is required');
          }
          if (!wheelDriveValue) {
            throw new Error('Wheel drive is required');
          }
          if (!gearValue) {
            throw new Error('Gear type is required');
          }
          if (!purchaseDate) {
            throw new Error('Purchase date is required');
          }
          // Validate purchaseDate is a valid date
          const purchaseDateObj = new Date(purchaseDate);
          if (isNaN(purchaseDateObj.getTime())) {
            throw new Error('Purchase date must be a valid date');
          }
          if (year === null || isNaN(year) || year < 1900 || year > 2030) {
            throw new Error('Valid year is required (1900-2030)');
          }
          if (kilo === null || isNaN(kilo) || kilo < 0) {
            throw new Error('Valid kilometer reading is required');
          }
          if (priceToSell === null || isNaN(priceToSell) || priceToSell <= 0) {
            throw new Error('Valid selling price is required');
          }
          if (purchasePrice === null || isNaN(purchasePrice) || purchasePrice <= 0) {
            throw new Error('Valid purchase price is required');
          }
          
          // Use FormData to send files properly (backend expects req.files from multer)
          const formDataToSend = new FormData();
          
          // Append all required fields (validated above) - ensure no empty strings
          // Backend validation might check before parsing, so ensure all values are non-empty
          formDataToSend.append('licenseNo', licenseNo || '');
          formDataToSend.append('brand', brand || '');
          formDataToSend.append('model', model || '');
          formDataToSend.append('enginePower', enginePower || '');
          formDataToSend.append('color', color || '');
          formDataToSend.append('wheelDrive', wheelDriveValue || '');
          formDataToSend.append('gear', gearValue || '');
          formDataToSend.append('purchaseDate', purchaseDate || '');
          formDataToSend.append('year', year !== null ? String(year) : '');
          formDataToSend.append('kilo', kilo !== null ? String(kilo) : '');
          formDataToSend.append('priceToSell', priceToSell !== null ? String(priceToSell) : '');
          formDataToSend.append('purchasePrice', purchasePrice !== null ? String(purchasePrice) : '');
          
          // Send repairs as JSON string - backend needs to parse it
          // Always send repairs array, even if empty
          formDataToSend.append('repairs', JSON.stringify(transformedRepairs || []));
          
          // Append the image file if uploaded (backend expects req.files from multer)
          // Use field name 'images' (plural) to match backend expectation
          if (formData.carPhoto) {
            formDataToSend.append('images', formData.carPhoto);
            console.log('Car photo added to FormData:', formData.carPhoto.name, formData.carPhoto.size, 'bytes');
          }
          
          const headers = {};
          
          // Add Authorization header if token exists
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
          
          // Log the FormData contents for debugging - verify all values
          console.log("=== FormData being sent ===");
          const formDataEntries = [];
          for (let pair of formDataToSend.entries()) {
            if (pair[1] instanceof File) {
              console.log(pair[0] + ': [File]', pair[1].name, pair[1].size, 'bytes');
              formDataEntries.push({ key: pair[0], value: `[File: ${pair[1].name}, ${pair[1].size} bytes]` });
            } else {
              console.log(pair[0] + ':', pair[1], `(type: ${typeof pair[1]}, length: ${String(pair[1]).length})`);
              formDataEntries.push({ key: pair[0], value: pair[1], type: typeof pair[1], length: String(pair[1]).length });
            }
          }
          console.log("=== End FormData ===");
          console.log("FormData summary:", formDataEntries);
          
          const response = await fetch(`${API_BASE_URL}/api/create-car`, {
            method: 'POST',
            headers: headers,
            body: formDataToSend
          });

          if (response.ok) {
            const result = await response.json();
            
            // Also save to localStorage as backup
            
            
            alert(`Car "${formData.brand} ${formData.model}" added successfully!`);
            
            // Reset form
            setFormData({
              licenseNo: "",
              brand: "",
              model: "",
              engine: "",
              color: "",
              wd: "",
              gear: "",
              price: "",
              originalPrice: "",
              year: "",
              purchasedKilo: "",
              purchaseDate: "",
              repairHistory: [],
              carPhoto: null
            });
            setRepairHistory([]);
            
            // Redirect to dashboard
            router.push('/admin/dashboard');
            return;
          } else {
            const errorText = await response.text();
            console.log('Backend error response:', errorText);
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
              console.log('Parsed error data:', errorData);
            } catch {
              errorData = { message: errorText || `API creation failed: ${response.status}` };
            }
            
            // Format validation errors for user-friendly display
            let errorMessage = errorData.message || errorData.error || `API creation failed: ${response.status}`;
            if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
              console.log('Validation errors:', errorData.errors);
              const errorMessages = errorData.errors.map(err => 
                `${err.field}: ${err.message}${err.value !== undefined ? ` (received: ${JSON.stringify(err.value)})` : ''}`
              ).join('\n');
              errorMessage = `Validation errors:\n${errorMessages}`;
            }
            
            throw new Error(errorMessage);
          }
        } catch (apiError) {
          alert(`Error creating car: ${apiError.message || "Please try again."}`);
          throw apiError; // Re-throw to be caught by outer catch
        }
      } else {
        // If API_BASE_URL is not set, show error
        alert("API endpoint is not configured. Please set NEXT_PUBLIC_API_BASE_URL.");
        throw new Error("API endpoint not configured");
      }
      
    } catch (error) {
      alert(`Error adding car: ${error.message || "Please try again."}`);
    } finally {
      setIsSubmitting(false);
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



      {/* Back Button - Responsive Positioning */}
      <div className="absolute left-2 sm:left-4 top-16 sm:top-20 z-10">
        <Link href="/admin/dashboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Add New Car</h2>
          </div>

          {/* Form */}
          <div className="bg-black/20 backdrop-blur-2xl shadow overflow-hidden sm:rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="licenseNo" className="block text-base font-medium text-white mb-2">
                    License No. *
                  </label>
                  <input
                    type="text"
                    id="licenseNo"
                    name="licenseNo"
                    value={formData.licenseNo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., ABC-123"
                  />
                </div>

                <div>
                  <label htmlFor="brand" className="block text-base font-medium text-white mb-2">
                    Brand *
                  </label>
                  <input
                    type="text"
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Toyota"
                  />
                </div>

                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-white mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Camry"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-base font-medium text-white mb-2">
                    Selling Price (฿) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 25000"
                  />
                </div>

                <div>
                  <label htmlFor="originalPrice" className="block text-base font-medium text-white mb-2">
                    Original Price (฿)
                  </label>
                  <input
                    type="number"
                    id="originalPrice"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 20000"
                  />
                </div>

                <div>
                  <label htmlFor="color" className="block text-base font-medium text-white mb-2">
                    Color *
                  </label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., White"
                  />
                </div>

                <div>
                  <label htmlFor="engine" className="block text-base font-medium text-white mb-2">
                    Engine Power *
                  </label>
                  <input
                    type="text"
                    id="engine"
                    name="engine"
                    value={formData.engine}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 2.5L"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-base font-medium text-white mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    min="1900"
                    max="2030"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 2023"
                  />
                </div>

                <div>
                  <label htmlFor="purchasedKilo" className="block text-base font-medium text-white mb-2">
                    Purchased Kilo (km) *
                  </label>
                  <input
                    type="number"
                    id="purchasedKilo"
                    name="purchasedKilo"
                    value={formData.purchasedKilo}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 50000"
                  />
                </div>

                <div>
                  <label htmlFor="purchaseDate" className="block text-base font-medium text-white mb-2">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    id="purchaseDate"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="wd" className="block text-base font-medium text-white mb-2">
                    WD *
                  </label>
                  <select
                    id="wd"
                    name="wd"
                    value={formData.wd}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select WD</option>
                    <option value="FWD">Front Wheel Drive (FWD)</option>
                    <option value="RWD">Rear Wheel Drive (RWD)</option>
                    <option value="AWD">All Wheel Drive (AWD)</option>
                    <option value="4WD">Four Wheel Drive (4WD)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="gear" className="block text-base font-medium text-white mb-2">
                    Gear Type *
                  </label>
                  <select
                    id="gear"
                    name="gear"
                    value={formData.gear}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select Gear Type</option>
                    <option value="Manual">Manual</option>
                    <option value="Auto">Automatic</option>
                    <option value="CVT">CVT</option>
                    <option value="Semi-Auto">Semi-Automatic</option>
                  </select>
                </div>

              </div>

              {/* Car Photo Upload */}
              <div>
                <label htmlFor="carPhoto" className="block text-base font-medium text-white mb-2">
                  Car Photo
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md bg-black/30">
                  <div className="space-y-1 text-center">
                    {formData.carPhoto ? (
                      <div className="space-y-2">
                        <PhotoViewer 
                          src={URL.createObjectURL(formData.carPhoto)} 
                          alt="Car preview" 
                          className="mx-auto h-32 w-auto rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="flex justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, carPhoto: null }))}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Remove Photo
                          </button>
                          <label
                            htmlFor="carPhoto"
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 cursor-pointer"
                          >
                            Change Photo
                            <input
                              id="carPhoto"
                              name="carPhoto"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label
                          htmlFor="carPhoto"
                          className="cursor-pointer"
                        >
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400 hover:text-red-500 transition-colors"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <input
                            id="carPhoto"
                            name="carPhoto"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <div className="flex text-sm text-gray-400">
                          <label
                            htmlFor="carPhoto"
                            className="relative cursor-pointer bg-black/50 rounded-md font-medium text-red-500 hover:text-red-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="carPhoto"
                              name="carPhoto"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Repair History */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-bold text-white">Repair History</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newShowState = !showRepairHistory;
                      setShowRepairHistory(newShowState);
                      // Auto-add first repair entry when opening
                      if (newShowState && repairHistory.length === 0) {
                        setRepairHistory([{ details: '', amount: '', repairDate: '' }]);
                      }
                    }}
                    className="flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    {showRepairHistory ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>
                {showRepairHistory && (
                  <div className="space-y-4">
                    {repairHistory.map((item, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Repair details"
                            value={item.details}
                            onChange={(e) => updateRepairHistory(index, 'details', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div className="w-44 min-w-[176px]">
                          <input
                            type="date"
                            value={item.repairDate}
                            onChange={(e) => updateRepairHistory(index, 'repairDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            placeholder="Amount (฿)"
                            value={item.amount}
                            onChange={(e) => updateRepairHistory(index, 'amount', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRepairHistory(index)}
                          className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRepairHistory}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      + Add Repair
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Link href="/admin/dashboard" className="bg-black/20 backdrop-blur-md text-white px-6 py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base font-medium border border-white/30 transition-all duration-200 cursor-pointer">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black/20 backdrop-blur-md text-white px-6 py-3 rounded-lg hover:bg-black/30 hover:text-red-500 disabled:bg-black/10 disabled:cursor-not-allowed text-base font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                >
                  {isSubmitting ? "Adding..." : "Add Car"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
