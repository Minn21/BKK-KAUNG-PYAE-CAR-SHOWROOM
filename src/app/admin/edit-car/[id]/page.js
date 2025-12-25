"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PhotoViewer from "@/app/components/PhotoViewer";

export default function EditCar() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id;
  
  const [formData, setFormData] = useState({
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
    repairHistory: [],
    carPhoto: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRepairHistory, setShowRepairHistory] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    customerName: "",
    phoneNumber: "",
    passportNumber: ""
  });
  const [loading, setLoading] = useState(true);
  const [repairHistory, setRepairHistory] = useState([]);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [originalImagePublicIds, setOriginalImagePublicIds] = useState([]); // Store original image public_ids for backend
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
            const car = data.data || data; 
            
            console.log("Editcar",car); // Handle both {data: {...}} and direct object
            
            if (car) {
              // Normalize the API response to match expected format
              const normalizeCurrency = (value) => {
                if (value === null || value === undefined) return '';
                if (typeof value === 'number') return value.toString();
                return value.toString().replace(/[^\d.-]/g, '');
              };
              
              const priceValue = car.priceToSell !== undefined 
                ? normalizeCurrency(car.priceToSell) 
                : normalizeCurrency(car.price || '');
              
              const originalPriceValue = car.originalPrice !== undefined
                ? normalizeCurrency(car.originalPrice)
                : car.priceToBuy !== undefined
                ? normalizeCurrency(car.priceToBuy)
                : priceValue;
              
              // Extract URL and public_id from image object array
              const carPhotoUrl = car.images?.[0]?.url || null;
              const carPhotoPublicId = car.images?.[0]?.public_id || null;
              
              // Store original image public_ids for backend image management
              const originalPublicIds = car.images && Array.isArray(car.images) 
                ? car.images.map(img => img.public_id).filter(id => id) 
                : [];
              setOriginalImagePublicIds(originalPublicIds);
              
              // Get repairs from API (can be 'repairs' or 'repairHistory')
              const repairsData = car.repairs || [];
              
              const normalizedCar = {
                licenseNo: car.licenseNo || "",
                brand: car.brand || "",
                model: car.model || car.name || "",
                engine: car.enginePower || car.engine || "",
                color: car.color || "",
                wd: car.wheelDrive || car.wd || "",
                gear: car.gear || car.gearType || "",
                price: priceValue,
                originalPrice: originalPriceValue,
                year: car.year || "",
                purchasedKilo: car.kilo || "",
                repairHistory: repairsData,
                image: carPhotoUrl
              };
              
              setFormData({
                licenseNo: normalizedCar.licenseNo,
                brand: normalizedCar.brand,
                model: normalizedCar.model,
                engine: normalizedCar.engine,
                color: normalizedCar.color,
                wd: normalizedCar.wd,
                gear: normalizedCar.gear,
                price: normalizedCar.price,
                originalPrice: normalizedCar.originalPrice,
                year: normalizedCar.year,
                purchasedKilo: normalizedCar.purchasedKilo,
                repairHistory: normalizedCar.repairHistory,
                carPhoto: normalizedCar.image
              });
              
              // Load repair history if it exists
              if (repairsData && Array.isArray(repairsData) && repairsData.length > 0) {
                // Transform repair history to match UI format
                const transformedHistory = repairsData.map(repair => {
                  // Convert ISO date string to YYYY-MM-DD format for date input
                  let repairDateValue = '';
                  if (repair.repairDate) {
                    const date = new Date(repair.repairDate);
                    if (!isNaN(date.getTime())) {
                      repairDateValue = date.toISOString().split('T')[0];
                    }
                  }
                  
                  return {
                    details: repair.description || repair.details || '',
                    amount: repair.cost || repair.amount || '',
                    repairDate: repairDateValue || new Date().toISOString().split('T')[0]
                  };
                });
                setRepairHistory(transformedHistory);
                setShowRepairHistory(true);
              } else if (normalizedCar.repairHistory && typeof normalizedCar.repairHistory === 'string') {
                setRepairHistory([{ details: normalizedCar.repairHistory, amount: '', repairDate: new Date().toISOString().split('T')[0] }]);
                setShowRepairHistory(true);
              } else {
                setRepairHistory([]);
                setShowRepairHistory(false);
              }
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching car from API:", error);
          // Continue to localStorage fallback
        }
      }
      
      // Fallback to localStorage if API is not available or failed
      const savedCars = localStorage.getItem('cars');
      
      if (savedCars) {
        try {
          const cars = JSON.parse(savedCars);
          const foundCar = cars.find(car => car.id.toString() === carId.toString());
          
          if (foundCar) {
            // Extract price value (remove ฿ and commas)
            const normalizeCurrency = (value) => {
              if (value === null || value === undefined) return '';
              return value.toString().replace(/[^\d.-]/g, '');
            };
            const priceValue = normalizeCurrency(foundCar.price);
            const originalPriceValue = foundCar.originalPrice
              ? normalizeCurrency(foundCar.originalPrice)
              : priceValue;
            
            setFormData({
              licenseNo: foundCar.licenseNo || "",
              brand: foundCar.brand || "",
              model: foundCar.model || "",
              engine: foundCar.engine || "",
              color: foundCar.color || "",
              wd: foundCar.wd || "",
              gear: foundCar.gear || "",
              price: priceValue,
              originalPrice: originalPriceValue,
              year: foundCar.year || "",
              purchasedKilo: foundCar.purchasedKilo || "",
              repairHistory: foundCar.repairHistory || [],
              carPhoto: foundCar.carPhoto || null
            });
            
            // localStorage doesn't have public_ids, so set to empty array
            // This is fine since localStorage fallback won't use backend image management
            setOriginalImagePublicIds([]);
            
            // Load repair history if it exists
            if (foundCar.repairHistory && Array.isArray(foundCar.repairHistory)) {
              // Transform repair history to include repairDate if missing
              const transformedHistory = foundCar.repairHistory.map(repair => ({
                details: repair.description || repair.details || '',
                amount: repair.cost || repair.amount || '',
                repairDate: repair.repairDate || new Date().toISOString().split('T')[0]
              }));
              setRepairHistory(transformedHistory);
            } else if (foundCar.repairHistory && typeof foundCar.repairHistory === 'string') {
              // If repair history is a string, parse it or create initial entry
              setRepairHistory([{ details: foundCar.repairHistory, amount: '', repairDate: new Date().toISOString().split('T')[0] }]);
            }
            
            setShowRepairHistory(!!foundCar.repairHistory);
          }
        } catch (error) {
          console.error("Error loading car data from localStorage:", error);
        }
      }
      
      setLoading(false);
    };

    fetchCarData();
  }, [carId, API_BASE_URL]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numeric = parseInt(value.toString().replace(/[^\d.-]/g, ""), 10);
    if (Number.isNaN(numeric)) {
      return value;
    }
    return `฿${numeric.toLocaleString()}`;
  };

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

  useEffect(() => {
    if (formData.carPhoto instanceof Blob) {
      const objectUrl = URL.createObjectURL(formData.carPhoto);
      setPhotoPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else if (typeof formData.carPhoto === 'string' && formData.carPhoto.trim().length > 0) {
      // For string URLs from API, set it directly as preview
      setPhotoPreviewUrl(formData.carPhoto);
    } else {
      setPhotoPreviewUrl(null);
    }
  }, [formData.carPhoto]);

  // Determine the image source to display
  // Add cache-busting parameter to image URLs to ensure browser loads latest version
  const getImageSrc = (src) => {
    if (!src || src === "/admin.png") return src;
    if (src instanceof Blob) return photoPreviewUrl;
    if (typeof src === 'string' && src.trim().length > 0) {
      // Add cache-busting parameter if it's a URL (not a data URL)
      if (src.startsWith('http://') || src.startsWith('https://')) {
        const separator = src.includes('?') ? '&' : '?';
        return `${src}${separator}t=${Date.now()}`;
      }
      return src;
    }
    return photoPreviewUrl || "/admin.png";
  };
  
  const carPhotoSrc = getImageSrc(formData.carPhoto);

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
      // Check if there's a new image file to upload
      const hasNewImage = formData.carPhoto instanceof Blob;

      // Try to update via API first
      if (API_BASE_URL) {
        try {
          // Get token from localStorage for authentication
          const token = localStorage.getItem('token');
          
          // Always use FormData for consistency with add-car endpoint
          const formDataToSend = new FormData();
          
          // Add car ID to FormData (some APIs require this)
          formDataToSend.append('id', carId);
          
          formDataToSend.append('licenseNo', formData.licenseNo);
          formDataToSend.append('brand', formData.brand);
          formDataToSend.append('model', formData.model);
          formDataToSend.append('enginePower', formData.engine);
          formDataToSend.append('color', formData.color);
          formDataToSend.append('wheelDrive', formData.wd);
          
          // Map gear values to backend expected format: "Manual" or "Automatic" (same as add-car)
          let gearValue = formData.gear;
          if (gearValue === 'Auto' || gearValue === 'CVT' || gearValue === 'Semi-Auto') {
            gearValue = 'Automatic';
          } else if (gearValue === 'Manual') {
            gearValue = 'Manual';
          }
          formDataToSend.append('gear', gearValue);
          
          // Match add-car format exactly
          formDataToSend.append('priceToSell', formData.price ? parseInt(formData.price) : '');
          formDataToSend.append('purchasePrice', formData.originalPrice ? parseInt(formData.originalPrice) : '');
          formDataToSend.append('year', formData.year || '');
          formDataToSend.append('kilo', formData.purchasedKilo || '');
          
          // Transform repair history to match backend schema
          // Backend expects: description, repairDate, cost
          // The backend expects repairs as an array, but FormData sends JSON strings as strings
          // We need to send it in a way the backend can parse
          const transformedRepairs = repairHistory.map(repair => {
            // Convert date to ISO string format (YYYY-MM-DD to ISO string)
            let repairDateValue = repair.repairDate || new Date().toISOString();
            // If it's already in YYYY-MM-DD format, convert to ISO string
            if (repairDateValue && !repairDateValue.includes('T')) {
              repairDateValue = new Date(repairDateValue).toISOString();
            }
            
            return {
              description: repair.details || '',
              repairDate: repairDateValue,
              cost: repair.amount ? parseFloat(repair.amount) : 0
            };
          });
          
          // Send repairs as JSON string - backend needs to parse it
          // Some backends automatically parse JSON strings from FormData
          // If not, the backend middleware needs to handle JSON string parsing
          formDataToSend.append('repairs', JSON.stringify(transformedRepairs));
          
          // Handle image updates/removal
          // Backend expects existingImages array to know which images to keep
          if (formData.carPhoto === null || formData.carPhoto === '') {
            // User removed the photo - send empty array to delete all existing images
            formDataToSend.append('existingImages', JSON.stringify([]));
            console.log('Image removal: Sending empty existingImages array to remove all images');
          } else if (hasNewImage && formData.carPhoto instanceof Blob) {
            // User uploaded a new image - keep existing images (if any) and add new one
            // Send existing public_ids so backend knows to keep them
            formDataToSend.append('existingImages', JSON.stringify(originalImagePublicIds));
            formDataToSend.append('images', formData.carPhoto);
            console.log('New image upload: Keeping existing images:', originalImagePublicIds);
          } else if (typeof formData.carPhoto === 'string' && formData.carPhoto.trim().length > 0) {
            // User kept the existing photo - send existing public_ids to keep them
            formDataToSend.append('existingImages', JSON.stringify(originalImagePublicIds));
            console.log('Keeping existing images:', originalImagePublicIds);
          } else {
            // No image change - send existing public_ids to keep them
            formDataToSend.append('existingImages', JSON.stringify(originalImagePublicIds));
            console.log('No image change: Keeping existing images:', originalImagePublicIds);
          }
          
          const headers = {};
          
          // Add Authorization header if token exists
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
          
          // Log the FormData contents for debugging
          console.log("Sending update request with FormData:");
          for (let pair of formDataToSend.entries()) {
            console.log(pair[0] + ': ' + (pair[1] instanceof File ? `[File: ${pair[1].name}]` : pair[1]));
          }

          console.log("formDataToSend",formDataToSend);
          
          // Try PUT method
          const response = await fetch(`${API_BASE_URL}/api/car/${carId}/edit`, {
            method: 'PUT',
            headers: headers,
            body: formDataToSend
          });

          console.log("Response status:", response.status);
          const responseData = await response.json().catch(() => ({}));
          console.log("Response data:", responseData);
          
          // Log more details if error
          if (!response.ok) {
            console.error("Full error details:", {
              status: response.status,
              statusText: response.statusText,
              data: responseData,
              url: `${API_BASE_URL}/api/car/${carId}/edit`,
              method: 'PUT'
            });
          }

          if (response.ok) {
            console.log("Car updated via API:", responseData);
            
            // Get the updated car data from API response
            const updatedCar = responseData.car || responseData.data || responseData;
            
            // Extract the new image URL from the updated car data
            let newImageUrl = null;
            if (updatedCar && updatedCar.images && Array.isArray(updatedCar.images) && updatedCar.images.length > 0) {
              newImageUrl = updatedCar.images[0].url;
            } else if (updatedCar && updatedCar.image) {
              newImageUrl = updatedCar.image;
            }
            
            // If we uploaded a new image or removed an image, refresh from API to get the updated image data
            // This ensures we have the correct URL and public_ids even if response doesn't include them
            if (hasNewImage || formData.carPhoto === null) {
              try {
                const refreshResponse = await fetch(`${API_BASE_URL}/api/car/${carId}`, { 
                  cache: "no-store",
                  headers: headers
                });
                
                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  const refreshedCar = refreshData.data || refreshData;
                  
                  // Get the new image URL and public_ids from refreshed data
                  if (refreshedCar && refreshedCar.images && Array.isArray(refreshedCar.images)) {
                    if (refreshedCar.images.length > 0) {
                      newImageUrl = refreshedCar.images[0].url;
                      // Update original image public_ids with new data
                      const newPublicIds = refreshedCar.images.map(img => img.public_id).filter(id => id);
                      setOriginalImagePublicIds(newPublicIds);
                    } else {
                      // Images were removed
                      newImageUrl = null;
                      setOriginalImagePublicIds([]);
                    }
                  } else if (refreshedCar && refreshedCar.image) {
                    newImageUrl = refreshedCar.image;
                  }
                }
              } catch (refreshError) {
                console.error("Error refreshing car data after image update:", refreshError);
                // Continue with URL from response if available
              }
            }
            
            // Update formData with the new image URL from backend
            // This replaces the Blob object with the actual URL, or null if removed
            if (newImageUrl !== null) {
              setFormData(prev => ({
                ...prev,
                carPhoto: newImageUrl // Update with new URL from backend (replaces Blob)
              }));
            } else if (hasNewImage || formData.carPhoto === null) {
              // If we uploaded but couldn't get URL, or if we removed image, clear it
              setFormData(prev => ({
                ...prev,
                carPhoto: null // Clear if removed or can't get new URL
              }));
            }
            
            // Also update localStorage as backup
            const savedCars = JSON.parse(localStorage.getItem('cars') || '[]');
            const updatedCars = savedCars.map(car => {
              if (car.id.toString() === carId.toString()) {
                return {
                  ...car,
                  licenseNo: formData.licenseNo,
                  brand: formData.brand,
                  model: formData.model,
                  engine: formData.engine,
                  color: formData.color,
                  wd: formData.wd,
                  gear: formData.gear,
                  price: formData.price ? `฿${parseInt(formData.price).toLocaleString()}` : car.price,
                  originalPrice: formData.originalPrice
                    ? `฿${parseInt(formData.originalPrice).toLocaleString()}`
                    : car.originalPrice || "",
                  year: formData.year,
                  purchasedKilo: formData.purchasedKilo,
                  repairHistory: repairHistory.length > 0 ? repairHistory : car.repairHistory || [],
                  carPhoto: newImageUrl || car.carPhoto // Use new URL from backend
                };
              }
              return car;
            });
            localStorage.setItem('cars', JSON.stringify(updatedCars));
            
            alert("Car updated successfully!");
            
            // Redirect to car details page (which will show the updated photo)
            router.push(`/admin/car-details/${carId}`);
            return;
          } else {
            console.error("API update failed - Status:", response.status);
            console.error("API update failed - Response:", responseData);
            throw new Error(`API update failed: ${response.status} - ${responseData.message || 'Unknown error'}`);
          }
        } catch (apiError) {
          console.error("Error updating car via API:", apiError);
          // Continue to localStorage fallback
        }
      }

      // Fallback to localStorage if API is not available or failed
      // Commented out since we're using API only
      // const savedCars = JSON.parse(localStorage.getItem('cars') || '[]');
      
      // // Find and update the car
      // const updatedCars = savedCars.map(car => {
      //   if (car.id.toString() === carId.toString()) {
      //     return {
      //       ...car,
      //       licenseNo: formData.licenseNo,
      //       brand: formData.brand,
      //       model: formData.model,
      //       engine: formData.engine,
      //       color: formData.color,
      //       wd: formData.wd,
      //       gear: formData.gear,
      //       price: formData.price ? `฿${parseInt(formData.price).toLocaleString()}` : car.price,
      //       originalPrice: formData.originalPrice
      //         ? `฿${parseInt(formData.originalPrice).toLocaleString()}`
      //         : car.originalPrice || "",
      //       year: formData.year,
      //       purchasedKilo: formData.purchasedKilo,
      //       repairHistory: repairHistory.length > 0 ? repairHistory : car.repairHistory || [],
      //       carPhoto: formData.carPhoto || car.carPhoto
      //     };
      //   }
      //   return car;
      // });
      
      // // Save updated cars to localStorage
      // localStorage.setItem('cars', JSON.stringify(updatedCars));
      
      // alert("Car updated successfully!");
      // // Redirect back to car details
      // router.push(`/admin/car-details/${carId}`);
      
      // If API fails, show error
      if (!API_BASE_URL) {
        alert("API is not configured. Please configure API_BASE_URL.");
      } else {
        alert("Error updating car. Please try again.");
      }
    } catch (error) {
      console.error("Error updating car:", error);
      alert("Error updating car. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsSold = () => {
    if (!formData.licenseNo || !formData.brand || !formData.model) {
      alert("Please fill in the required car information before marking as sold.");
      return;
    }

    // Set sold price to blank - user will enter manually
    setSoldPrice("");
    setShowSoldModal(true);
  };

  const handleSoldSubmit = () => {
    if (!soldPrice || soldPrice.trim() === '') {
      alert("Please enter the sold price.");
      return;
    }

    if (!customerInfo.customerName.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    if (!customerInfo.phoneNumber.trim()) {
      alert("Please enter the phone number.");
      return;
    }

    // Add to sold cars
    const soldCars = JSON.parse(localStorage.getItem('soldCars') || '[]');
    const soldCar = {
      id: parseInt(carId),
      licenseNo: formData.licenseNo,
      brand: formData.brand,
      model: formData.model,
      engine: formData.engine,
      color: formData.color,
      wd: formData.wd,
      gear: formData.gear,
      price: formData.price ? `฿${parseInt(formData.price).toLocaleString()}` : "",
      originalPrice: formData.originalPrice
        ? `฿${parseInt(formData.originalPrice).toLocaleString()}`
        : "",
      year: formData.year,
      purchasedKilo: formData.purchasedKilo,
      repairHistory: repairHistory,
      carPhoto: formData.carPhoto,
      soldDate: new Date().toLocaleDateString('en-GB'),
      soldPrice: `฿${parseInt(soldPrice).toLocaleString()}`,
      customerName: customerInfo.customerName,
      phoneNumber: customerInfo.phoneNumber,
      passportNumber: customerInfo.passportNumber
    };
    soldCars.push(soldCar);
    localStorage.setItem('soldCars', JSON.stringify(soldCars));

    // Remove from regular cars
    const savedCars = JSON.parse(localStorage.getItem('cars') || '[]');
    const updatedCars = savedCars.filter(c => c.id !== parseInt(carId));
    localStorage.setItem('cars', JSON.stringify(updatedCars));

    alert(`"${formData.brand} ${formData.model}" has been marked as sold for ${soldCar.soldPrice} and moved to the sold list!`);
    
    // Close modal and redirect to profit calculator
    setShowSoldModal(false);
    setSoldPrice("");
    setCustomerInfo({ customerName: "", phoneNumber: "", passportNumber: "" });
    router.push(`/admin/profit-calculator/${carId}`);
  };

  const handleSoldCancel = () => {
    setShowSoldModal(false);
    setSoldPrice("");
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
        <Link href={`/admin/car-details/${carId}`} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
          ← Back to Details
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-4 sm:py-6 sm:px-0 mt-8 sm:mt-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Edit Car</h2>
            <div className="flex space-x-4">
              <Link href="/admin/dashboard" className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium border border-white/30 transition-all duration-200 cursor-pointer">
                Dashboard
              </Link>
            </div>
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Toyota"
                  />
                </div>

                <div>
                  <label htmlFor="model" className="block text-base font-medium text-white mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., 50000"
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
                    <option value="Automatic">Automatic</option>
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
                          src={carPhotoSrc} 
                          alt="Car preview" 
                          className="mx-auto h-32 w-auto rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="flex justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, carPhoto: null }))}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 cursor-pointer"
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
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
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
                        setRepairHistory([{ details: '', amount: '', repairDate: new Date().toISOString().split('T')[0] }]);
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
                        <div className="w-40">
                          <input
                            type="date"
                            placeholder="Repair Date"
                            value={item.repairDate || ''}
                            onChange={(e) => updateRepairHistory(index, 'repairDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            placeholder="Amount (฿)"
                            value={item.amount}
                            onChange={(e) => updateRepairHistory(index, 'amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-black/30 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                            required
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
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href={`/admin/car-details/${carId}`} className="bg-black/20 backdrop-blur-md text-white px-6 py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base font-medium border border-white/30 transition-all duration-200 cursor-pointer text-center">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-black/20 backdrop-blur-md text-white px-6 py-3 rounded-lg hover:bg-black/30 hover:text-red-500 disabled:bg-black/10 disabled:cursor-not-allowed text-base font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                  >
                    {isSubmitting ? "Updating..." : "Update Car"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleMarkAsSold}
                  disabled={isSubmitting}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 hover:text-red-200 disabled:bg-red-400 disabled:cursor-not-allowed text-base font-medium transition-all duration-200 cursor-pointer"
                >
                  Mark as Sold
                </button>
              </div>
            </form>
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
                    Car: {formData.brand} {formData.model} ({formData.licenseNo})
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Original Price: {formatCurrency(formData.originalPrice)}
                  </label>
                </div>

                <div>
                  <label htmlFor="soldPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Sold Price *
                  </label>
                  <input
                    type="number"
                    id="soldPrice"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    placeholder="Enter sold price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    value={customerInfo.customerName}
                    onChange={(e) => setCustomerInfo({...customerInfo, customerName: e.target.value})}
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={customerInfo.phoneNumber}
                    onChange={(e) => setCustomerInfo({...customerInfo, phoneNumber: e.target.value})}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="passportNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    id="passportNumber"
                    value={customerInfo.passportNumber}
                    onChange={(e) => setCustomerInfo({...customerInfo, passportNumber: e.target.value})}
                    placeholder="Enter passport number (optional)"
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
