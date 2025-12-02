// src/pages/PaymentsFinance.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
  FaChartPie,
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaFileExport,
  FaSearch,
  FaCalendarAlt,
  FaTimes,
  FaFilter, // Added
  FaChevronDown, // Added
  FaChevronUp, // Added
} from "react-icons/fa";
import { CSVLink } from "react-csv";

const PaymentsFinance = () => {
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false); // Added for mobile filter toggle
  const [viewMode, setViewMode] = useState("cards"); // 'cards' or 'table' for mobile

  useEffect(() => {
    setLoading(true);
    // Setting viewMode based on screen size initially.
    // window.innerWidth >= 640 corresponds to 'sm' breakpoint in Tailwind CSS.
    if (window.innerWidth >= 640) {
      setViewMode("table");
    } else {
      setViewMode("cards");
    }
    
    Promise.all([
      fetch("http://localhost:8080/api/orders/payment-summary").then((res) => res.json()),
      fetch("http://localhost:8080/api/orders/transactions").then((res) => res.json()),
    ])
      .then(([summaryData, txData]) => {
        setSummary(summaryData);
        setTransactions(txData);
      })
      .catch((err) => console.error("Error fetching data:", err))
      .finally(() => setLoading(false));
  }, []);

  const pieData = [
    { name: "Cash", value: summary.totalCash || 0 },
    { name: "UPI", value: summary.totalUpi || 0 },
    { name: "Card", value: summary.totalCard || 0 },
  ].filter((item) => item.value > 0);

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B"];

  const filteredTransactions = transactions.filter((t) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.customerName?.toLowerCase().includes(query) ||
      t.userPhone?.includes(search) ||
      t.id?.toString().includes(search) ||
      t.razorpayPaymentId?.toLowerCase().includes(query);

    const matchesFilter = !filter || t.paymentMode?.toLowerCase() === filter.toLowerCase();

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = t.orderTime ? new Date(t.orderTime) : null;
      if (orderDate) {
        // Create start date at 00:00:00 and end date at 23:59:59
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + "T23:59:59") : null;
        matchesDate = (!start || orderDate >= start) && (!end || orderDate <= end);
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  const clearFilters = () => {
    setSearch("");
    setFilter("");
    setStartDate("");
    setEndDate("");
    // Also close the mobile filter view
    setShowFilters(false);
  };

  // --- StatCard Component (Modified for smaller screens) ---
  const StatCard = ({ icon: Icon, label, value, color, trend }) => {
    const colorMap = {
      indigo: { from: "from-indigo-400", to: "to-indigo-600" },
      emerald: { from: "from-emerald-400", to: "to-emerald-600" },
      blue: { from: "from-blue-400", to: "to-blue-600" },
      amber: { from: "from-amber-400", to: "to-amber-600" },
    };
    const colors = colorMap[color];
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div
              className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} shadow-lg group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className="text-white text-lg sm:text-2xl" />
            </div>
            {trend && (
              <div
                className={`flex items-center gap-1 text-xs sm:text-sm font-semibold ${
                  trend > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                <span className="hidden sm:inline">{Math.abs(trend)}%</span>
                <span className="sm:hidden">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <p className="text-gray-500 text-xs sm:text-sm font-medium uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            ₹{value?.toLocaleString() || 0}
          </p>
        </div>
      </div>
    );
  };

  // --- TransactionCard Component (New for mobile view) ---
  const TransactionCard = ({ transaction, index }) => {
    const isUpiOrCard = transaction.paymentMode?.toLowerCase() !== "cash";
    const paymentModeLabel = transaction.paymentMode === "Upi" ? "UPI" : transaction.paymentMode;

    // Logic to determine payment icon and color
    let Icon, iconColorClass;
    if (transaction.paymentMode === "Cash") {
      Icon = FaMoneyBillWave;
      iconColorClass = "text-emerald-600";
    } else if (transaction.paymentMode === "Card") {
      Icon = FaCreditCard;
      iconColorClass = "text-amber-600";
    } else { // UPI or Upi
      Icon = FaMobileAlt;
      iconColorClass = "text-blue-600";
    }

    return (
      <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-sm text-gray-500 font-mono">Order #{transaction.id}</p>
            <p className="font-bold text-lg text-gray-900">{transaction.customerName}</p>
            <p className="text-sm text-gray-600">{transaction.userPhone || "No Phone"}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
              transaction.status === "CONFIRMED"
                ? "bg-green-100 text-green-700"
                : transaction.status === "PENDING"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {transaction.status}
          </span>
        </div>

        <div className="flex items-center justify-between mb-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Icon className={`text-xl ${iconColorClass}`} />
            <span className="text-sm font-medium text-gray-700">{paymentModeLabel}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">₹{transaction.totalPrice?.toLocaleString()}</p>
        </div>

        <div className="text-xs text-gray-500 border-t pt-2">
          <p>
            {transaction.orderTime
              ? new Date(transaction.orderTime).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "No Date"}
          </p>
          {transaction.razorpayPaymentId && (
            <p className="font-mono mt-1 truncate">Payment ID: {transaction.razorpayPaymentId}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Blobs (Kept from original) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sticky Header (Modified for smaller screens) */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                  <FaWallet className="text-white text-lg sm:text-xl" />
                </div>
                Payments & Finance
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Financial overview and analytics
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-200 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="text-xs">
                <p className="hidden sm:block text-gray-500 font-medium">Last Updated</p>
                <p className="text-gray-900 font-semibold">
                  {new Date().toLocaleString("en-IN", { timeStyle: 'short', dateStyle: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <StatCard
                icon={FaWallet}
                label="Total Revenue"
                value={summary.grandTotal}
                color="indigo"
                trend={12.5}
              />
              <StatCard
                icon={FaMoneyBillWave}
                label="Cash"
                value={summary.totalCash}
                color="emerald"
                trend={8.2}
              />
              <StatCard
                icon={FaMobileAlt}
                label="UPI"
                value={summary.totalUpi}
                color="blue"
                trend={15.7}
              />
              <StatCard
                icon={FaCreditCard}
                label="Card"
                value={summary.totalCard}
                color="amber"
                trend={-2.3}
              />
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Payment Distribution (Simplified for mobile) */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg">
                      <FaChartPie className="text-white text-lg sm:text-xl" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800">Payment Split</h2>
                      <p className="text-gray-500 text-xs sm:text-sm">Breakdown by payment method</p>
                    </div>
                  </div>

                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* Using plain colors for simplification, removed the gradient defs */}
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50} // Smaller radius for mobile
                          outerRadius={80} // Smaller radius for mobile
                          paddingAngle={5}
                          label={({ value }) => `₹${(value / 1000).toFixed(0)}k`} // Simplified label
                          labelLine={true} // Kept label line
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} // Using plain colors
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                            padding: '12px'
                          }}
                          formatter={(value) => `₹${value.toLocaleString()}`}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '10px' }} // Adjusted for smaller padding
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics (Simplified for mobile) */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg">
                      <FaChartPie className="text-white text-lg sm:text-xl" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800">Key Metrics</h2>
                      <p className="text-gray-500 text-xs sm:text-sm">Performance indicators</p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                      <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Avg Transaction Value</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        ₹{transactions.length > 0 ? Math.round(summary.grandTotal / transactions.length).toLocaleString() : 0}
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                      <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Transactions</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{transactions.length}</p>
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                      <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Payment Success Rate</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {transactions.length > 0 
                          ? Math.round((transactions.filter(t => t.status === 'CONFIRMED').length / transactions.length) * 100)
                          : 0}%
                      </p>
                    </div>
                    {/* Removed Most Popular Method to match the requested smaller view */}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters Section (Modified for mobile toggle) */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4 border border-gray-200">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-between w-full lg:hidden mb-3"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-700">
                  <FaFilter className="text-indigo-500" />
                  Filters & Search
                </span>
                {showFilters ? <FaChevronUp /> : <FaChevronDown />}
              </button>

              {/* Filters are shown on large screens and toggled on small screens */}
              <div className={`space-y-3 lg:space-y-0 lg:flex lg:flex-row lg:justify-between lg:items-center lg:gap-4 ${showFilters ? 'block' : 'hidden'} lg:block`}>
                {/* Search Bar */}
                <div className="flex items-center gap-2 w-full lg:w-1/3">
                  <FaSearch className="text-gray-400 text-lg" />
                  <input
                    type="text"
                    placeholder="Search by Name, OrderID, PaymentID or Phone..."
                    value={search}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Date Filters - Stacked on Mobile, side-by-side on large screens */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <FaCalendarAlt className="text-indigo-500 hidden sm:block text-lg" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-gray-500 font-semibold text-center sm:text-left text-sm">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Mode + Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={filter}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">All Payment Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <CSVLink
                      data={filteredTransactions}
                      filename={`transactions_filtered_${new Date().toISOString()}.csv`}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:opacity-90 transition-all"
                    >
                      <FaFileExport /> Export
                    </CSVLink>

                    <button
                      onClick={clearFilters}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:opacity-90 transition-all"
                    >
                      <FaTimes /> Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* View Toggle (Mobile Only) */}
            <div className="flex justify-between items-center mb-4 lg:hidden">
              <h3 className="font-bold text-gray-800">Transactions ({filteredTransactions.length})</h3>
              <div className="flex gap-2 bg-white rounded-lg p-1 shadow border border-gray-200">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 text-xs rounded-md font-semibold ${
                    viewMode === "cards" ? "bg-indigo-500 text-white shadow-md" : "text-gray-600"
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-xs rounded-md font-semibold ${
                    viewMode === "table" ? "bg-indigo-500 text-white shadow-md" : "text-gray-600"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Transaction History - Card View (Mobile only) */}
            <div className={`${viewMode === "cards" ? "grid" : "hidden"} lg:hidden space-y-3`}>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t, index) => (
                  <TransactionCard key={t.id} transaction={t} index={index} />
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 text-center shadow-lg">
                  <FaMoneyBillWave className="text-gray-400 text-4xl mx-auto mb-3" />
                  <p className="text-gray-400">No transactions found</p>
                </div>
              )}
            </div>
            
            {/* Transaction History - Table View (Desktop + Mobile Option) */}
            <Card className={`${viewMode === "table" ? "block" : "hidden"} lg:block bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-lg">
                      <FaMoneyBillWave className="text-white text-lg sm:text-xl" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800">Transaction History</h2>
                      <p className="text-gray-500 text-xs sm:text-sm">Complete payment records</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-sm shadow-lg">
                    {filteredTransactions.length} Shown
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <TableHead className="text-center font-bold text-gray-700 py-3 px-3">#</TableHead>
                        <TableHead className="font-bold text-gray-700 px-3">Order ID</TableHead>
                        <TableHead className="font-bold text-gray-700 px-3">Customer</TableHead>
                        <TableHead className="font-bold text-gray-700 px-3">Payment Mode</TableHead>
                        <TableHead className="font-bold text-gray-700 px-3">Status</TableHead>
                        <TableHead className="font-bold text-gray-700 px-3">Amount</TableHead>
                        <TableHead className="hidden lg:table-cell font-bold text-gray-700 px-3">Payment ID</TableHead>
                        <TableHead className="hidden lg:table-cell font-bold text-gray-700 px-3">Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((t, index) => (
                          <TableRow
                            key={t.id}
                            className="hover:bg-indigo-50 transition-all duration-200 border-b border-gray-100"
                          >
                            <TableCell className="text-center font-bold text-gray-600 py-3 px-3">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-indigo-600 px-3">#{t.id}</TableCell>
                            <TableCell className="font-medium text-gray-800 px-3">
                                {t.customerName}
                                <div className="text-xs text-gray-500">{t.userPhone || "—"}</div>
                            </TableCell>
                            <TableCell className="px-3">
                              <div className="flex items-center gap-2">
                                {t.paymentMode === "Cash" && (
                                  <span className="px-2 py-1 rounded-full text-xs font-bold shadow-sm bg-emerald-100 text-emerald-700">Cash</span>
                                )}
                                {(t.paymentMode === "UPI" || t.paymentMode === "Upi") && (
                                  <span className="px-2 py-1 rounded-full text-xs font-bold shadow-sm bg-blue-100 text-blue-700">UPI</span>
                                )}
                                {t.paymentMode === "Card" && (
                                  <span className="px-2 py-1 rounded-full text-xs font-bold shadow-sm bg-amber-100 text-amber-700">Card</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                                  t.status === "CONFIRMED"
                                    ? "bg-green-100 text-green-700"
                                    : t.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {t.status}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-gray-900 text-base px-3">₹{t.totalPrice?.toLocaleString()}</TableCell>
                            <TableCell className="hidden lg:table-cell text-gray-500 text-xs font-mono px-3">
                              {t.razorpayPaymentId || "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-gray-600 font-medium text-xs px-3">
                              {t.orderTime
                                ? new Date(t.orderTime).toLocaleString("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center gap-3">
                              <div className="p-4 bg-gray-100 rounded-full">
                                <FaMoneyBillWave className="text-gray-400 text-4xl" />
                              </div>
                              <p className="text-gray-400 text-lg font-medium">No transactions found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default PaymentsFinance;