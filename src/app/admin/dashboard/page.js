"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [cars, setCars] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    carModel: "",
    licensePlate: "",
    customerName: "",
    passportNumber: "",
    phoneNumber: "",
    email: "",
    carPrice: "",
    downPayment: "",
    monthlyPayment: "",
    installmentPeriod: "",
    purchasedDate: "",
    carListNo: "",
    carId: ""
  });
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const getInstallments = () => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("installments") || "[]");
    } catch (error) {
      console.error("Failed to parse installments from localStorage:", error);
      return [];
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'installmentPeriod') {
      console.log("Installment Period Input:", value, "Type:", typeof value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.carId) {
      alert("Car ID is missing. Please try again.");
      return;
    }

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
      const carPrice = parseFloat(formData.carPrice);
      const downPayment = parseFloat(formData.downPayment);
      const remainingAmount = carPrice - downPayment;

      // Parse monthly payment to ensure correct value
      const monthlyPayment = Number(formData.monthlyPayment);
      console.log("Monthly Payment Input:", formData.monthlyPayment, "Parsed:", monthlyPayment);

      // Parse installment period to ensure correct value
      const installmentPeriod = Number(formData.installmentPeriod);
      console.log("Installment Period Input:", formData.installmentPeriod, "Parsed:", installmentPeriod);

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
            // email: formData.email || ""
          }
        }
      };

      console.log("installmentData",installmentData);

      const response = await fetch(`${API_BASE_URL}/api/car/${formData.carId}/sell-installment`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(installmentData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized: Please login again.");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      // Refresh the cars list to reflect the change
      const tokenForRefresh = localStorage.getItem('token');
      const refreshHeaders = {};
      if (tokenForRefresh) {
        refreshHeaders['Authorization'] = `Bearer ${tokenForRefresh}`;
      }
      
      const carsResponse = await fetch(`${API_BASE_URL}/api/cars`, { 
        cache: "no-store",
        headers: refreshHeaders
      });
      
      if (carsResponse.ok) {
        const carsData = await carsResponse.json();
        const apiCars = Array.isArray(carsData.data) ? carsData.data : [];
        
        const normalizedCars = apiCars.map((car, index) => ({
          ...car,
          id: car.id ?? car._id ?? index,
          price: car.priceToSell,
          wd: car.wheelDrive,
        }));

        const availableCars = normalizedCars.filter(car => car.isAvailable !== false);
        setCars(availableCars);
      }

      // Redirect to installments page after successful submission
      router.push('/admin/installments');
    } catch (error) {
      console.error("Failed to add installment:", error);
      alert(`Failed to add installment: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setShowAddModal(false);
    setFormData({
      carModel: "",
      licensePlate: "",
      customerName: "",
      passportNumber: "",
      phoneNumber: "",
      email: "",
      carPrice: "",
      downPayment: "",
      monthlyPayment: "",
      installmentPeriod: "",
      purchasedDate: "",
      carListNo: "",
      carId: ""
    });
  };

  const handleAddCarToInstallment = (car) => {
    // Check if car already exists in installments
    // const existingInstallments = getInstallments();
    // const carExists = existingInstallments.some(installment => 
    //   installment.licensePlate === car.licenseNo || installment.carListNo === car.carList
    // );

    // if (carExists) {
    //   alert("This car is already in the installment list!");
    //   return;
    // }

    // Handle price - convert to string and remove currency formatting if needed
    let carPrice = car.price;
    if (typeof car.price === 'number') {
      carPrice = car.price.toString();
    } else if (typeof car.price === 'string') {
      carPrice = car.price.replace('฿', '').replace(/,/g, '');
    } else {
      carPrice = '';
    }

    // Format date as YYYY-MM-DD for HTML date input
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Pre-fill form with car data
    setFormData({
      carModel: `${car.brand} ${car.model}`,
      licensePlate: car.licenseNo,
      customerName: "",
      passportNumber: "",
      phoneNumber: "",
      email: "",
      carPrice: carPrice, // Remove currency formatting
      downPayment: "",
      monthlyPayment: "",
      installmentPeriod: "",
      purchasedDate: formattedDate,
      carListNo: car.carList,
      carId: car.id || car._id || ""
    });
    
    setShowAddModal(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Check user role - redirect staff to staff dashboard
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user && (user.role === "Staff" || user.role === "staff")) {
      router.push("/staff/dashboard");
      return;
    }

    const filterCarsByInstallments = (carList) => {
      const installments = getInstallments();
      return carList.filter(
        (car) =>
          !installments.some(
            (installment) =>
              installment.licensePlate === car.licenseNo ||
              installment.carListNo === car.carList
          )
      );
    };

    const loadCarsFromStorage = () => {
      try {
        const savedCars = localStorage.getItem("cars");
        if (savedCars) {
          const parsedCars = JSON.parse(savedCars);
          const filteredCars = filterCarsByInstallments(parsedCars);
          setCars(filteredCars);
          if (filteredCars.length !== parsedCars.length) {
            localStorage.setItem("cars", JSON.stringify(filteredCars));
          }
          return;
        }
      } catch (error) {
        console.error("Failed to load cars from localStorage:", error);
      }

      const defaultCars = [
        { id: 1, licenseNo: "ABC-123", brand: "Toyota", model: "Camry", engine: "2.5L", color: "White", wd: "FWD", gear: "Auto", price: "฿25,000" },
        { id: 2, licenseNo: "XYZ-789", brand: "Honda", model: "Civic", engine: "1.8L", color: "Blue", wd: "FWD", gear: "Manual", price: "฿22,000" },
        { id: 3, licenseNo: "DEF-456", brand: "Ford", model: "Focus", engine: "2.0L", color: "Red", wd: "FWD", gear: "Auto", price: "฿20,000" },
      ];
      const filteredDefaultCars = filterCarsByInstallments(defaultCars);
      setCars(filteredDefaultCars);
      localStorage.setItem("cars", JSON.stringify(filteredDefaultCars));
    };

    const fetchCarsFromApi = async () => {
      if (!API_BASE_URL) {
        console.warn("API base URL is not set. Skipping remote car fetch.");
        return;
      }

      try {
        // Get token from localStorage for authentication
        const token = localStorage.getItem('token');
        
        const headers = {};
        
        // Add Authorization header if token exists
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/cars`, { 
          cache: "no-store",
          headers: headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Unauthorized: Token is missing or invalid");
            // Optionally redirect to login
            // router.push('/admin/login');
            return;
          }
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("data",data);
        const apiCars = Array.isArray(data.data) ? data.data : [];
        console.log("apiCars",apiCars);

        if (!Array.isArray(apiCars)) {
          console.warn("Unexpected response shape when fetching cars:", data);
          return;
        }

        const normalizedCars = apiCars.map((car, index) => {
          const normalizedPrice =
            typeof car.priceToSell === "number"
              ? `฿${car.priceToSell.toLocaleString("en-US")}`
              : car.priceToSell ?? "";

          return {
            ...car,
            id: car.id ?? car._id ?? index,
            // licenseNo: car.licenseNo ?? car.licensePlate ?? car.license ?? "",
            // carList: car.carList ?? car.carListNo ?? car.listNo ?? car.carListNumber,
            // brand: car.brand ?? car.make ?? "",
            // model: car.model ?? car.name ?? "",
            price: car.priceToSell,
            wd: car.wheelDrive,
            
          };
        });

        console.log("normalizedCars",normalizedCars);

        // Filter out cars where isAvailable is false - only show available cars
        const availableCars = normalizedCars.filter(car => car.isAvailable !== false);
        console.log("availableCars", availableCars);

        // const filteredCars = filterCarsByInstallments(availableCars);

        // console.log("filteredCars",filteredCars);

        setCars(availableCars);
        // localStorage.setItem("cars", JSON.stringify(filteredCars));
      } catch (error) {
        console.error("Failed to fetch cars from API:", error);
      }
    };

    loadCarsFromStorage();
    fetchCarsFromApi();
  }, [API_BASE_URL]);


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

      {/* Secondary Navigation Bar */}
      <nav className="bg-black/70 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-nowrap space-x-4 sm:space-x-8 h-12 sm:h-14 overflow-x-auto scrollbar-hide">
            <Link href="/admin/dashboard" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-red-500 border-b-2 border-red-500 whitespace-nowrap flex-shrink-0">
              Car List
            </Link>
            <Link href="/admin/installments" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium text-white hover:text-red-500 hover:border-red-500 border-b-2 border-transparent whitespace-nowrap flex-shrink-0">
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Car Inventory</h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Link href="/admin/add-car" className="bg-black/20 backdrop-blur-md text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-black/30 hover:text-red-500 text-base sm:text-lg font-medium w-full sm:w-auto border border-white/30 transition-all duration-200 cursor-pointer">
                Add New Car
              </Link>
            </div>
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
                  {cars.map((car, index) => (
                    <tr key={car.id} className="hover:bg-black/30 backdrop-blur-2xl">
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base font-medium text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {index + 1}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.licenseNo}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.brand}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.model}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.enginePower}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.color}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.wd}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.gear}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white cursor-pointer" onClick={() => window.location.href = `/admin/car-details/${car.id}`}>
                        {car.price}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-sm sm:text-base text-white">
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Link href={`/admin/edit-car/${car.id}`} className="bg-black/20 backdrop-blur-md text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-black/30 hover:text-red-500 font-medium border border-white/30 transition-all duration-200 cursor-pointer">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleAddCarToInstallment(car)}
                            className="bg-black/20 backdrop-blur-md text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-black/30 hover:text-green-500 font-medium border border-white/30 transition-all duration-200 cursor-pointer"
                          >
                            Add in Installment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Installment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Add New Installment</h3>
              
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="carModel" className="block text-sm font-medium text-gray-700 mb-1">
                      Car Model
                    </label>
                    <input
                      type="text"
                      id="carModel"
                      name="carModel"
                      value={formData.carModel}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-1">
                      License Plate
                    </label>
                    <input
                      type="text"
                      id="licensePlate"
                      name="licensePlate"
                      value={formData.licensePlate}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., +66-999-999"
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
                      name="passportNumber"
                      value={formData.passportNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., A12345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g., customer@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div> */}

                  <div>
                    <label htmlFor="carPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Car Price
                    </label>
                    <input
                      type="number"
                      id="carPrice"
                      name="carPrice"
                      value={formData.carPrice}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="downPayment" className="block text-sm font-medium text-gray-700 mb-1">
                      Down Payment
                    </label>
                    <input
                      type="number"
                      id="downPayment"
                      name="downPayment"
                      value={formData.downPayment}
                      onChange={handleInputChange}
                      placeholder="100000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="monthlyPayment" className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Payment
                    </label>
                    <input
                      type="number"
                      id="monthlyPayment"
                      name="monthlyPayment"
                      value={formData.monthlyPayment}
                      onChange={handleInputChange}
                      placeholder="45000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="purchasedDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Purchased Date
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

                  <div>
                    <label htmlFor="installmentPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                      Installment Period (Months)
                    </label>
                    <input
                      type="number"
                      id="installmentPeriod"
                      name="installmentPeriod"
                      value={formData.installmentPeriod}
                      onChange={handleInputChange}
                      placeholder="12"
                      min="1"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hover:text-red-500 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-red-200 font-medium cursor-pointer"
                    >
                      Add Installment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
