// src/components/OrderHistory.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { History, Package, Calendar, XCircle, CheckCircle, Search, Filter } from "lucide-react";
import SockJS from "sockjs-client";
import { over } from "stompjs";

const OrderHistory = () => {
  // ... (all your state and functions remain unchanged) ...
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("delivered");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month, custom
  const [customDate, setCustomDate] = useState("");
  const stompRef = useRef(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/orders/dashboard");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      
      const delivered = (data.orders || []).filter(
        (order) =>
          order.orderStatus &&
          order.orderStatus.toLowerCase() === "delivered" &&
          order.paymentStatus &&
          !["FAILED", "PAYMENT_FAILED"].includes(order.paymentStatus.toUpperCase())
      );
      
      const cancelled = (data.orders || []).filter(
        (order) =>
          order.orderStatus &&
          order.orderStatus.toLowerCase() === "cancelled"
      );
      
      console.log("📊 Fetched orders - Delivered:", delivered.length, "Cancelled:", cancelled.length);
      
      setDeliveredOrders(delivered);
      setCancelledOrders(cancelled);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = over(socket);
    stompRef.current = stompClient;

    stompClient.connect(
      {},
      () => {
        console.log("✅ OrderHistory WebSocket connected");

        stompClient.subscribe("/topic/orders", (msg) => {
          if (!msg.body) return;
          const updated = JSON.parse(msg.body);
          
          console.log("📡 OrderHistory received WebSocket update:", updated.id, "Status:", updated.orderStatus);

          // ⭐ FIX: Handle order status changes properly by removing from old list and adding to new list
          if (updated.orderStatus && updated.orderStatus.toLowerCase() === "delivered") {
            console.log("✅ Moving order", updated.id, "to delivered list");
            
            // Remove from cancelled list if it was there
            setCancelledOrders((prev) => {
              const filtered = prev.filter((o) => o.id !== updated.id);
              if (filtered.length !== prev.length) {
                console.log("🔄 Removed from cancelled list");
              }
              return filtered;
            });
            
            // Add or update in delivered list
            setDeliveredOrders((prev) => {
              const exists = prev.some((o) => o.id === updated.id);
              if (!exists) {
                console.log("➕ Added to delivered list");
                return [updated, ...prev];
              } else {
                console.log("🔄 Updated in delivered list");
                return prev.map((o) => (o.id === updated.id ? updated : o));
              }
            });
          }

          if (updated.orderStatus && updated.orderStatus.toLowerCase() === "cancelled") {
            console.log("❌ Moving order", updated.id, "to cancelled list");
            
            // Remove from delivered list if it was there
            setDeliveredOrders((prev) => {
              const filtered = prev.filter((o) => o.id !== updated.id);
              if (filtered.length !== prev.length) {
                console.log("🔄 Removed from delivered list");
              }
              return filtered;
            });
            
            // Add or update in cancelled list
            setCancelledOrders((prev) => {
              const exists = prev.some((o) => o.id === updated.id);
              if (!exists) {
                console.log("➕ Added to cancelled list");
                return [updated, ...prev];
              } else {
                console.log("🔄 Updated in cancelled list");
                return prev.map((o) => (o.id === updated.id ? updated : o));
              }
            });
          }
        });
      },
      (err) => {
        console.error("WebSocket connection error:", err);
      }
    );

    return () => {
      if (stompRef.current && stompRef.current.connected) {
        stompRef.current.disconnect(() => console.log("OrderHistory WebSocket disconnected"));
      }
      stompRef.current = null;
    };
  }, []);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "—";
    const d = new Date(timestamp);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const isWithinDateRange = (orderTime, filter) => {
    if (!orderTime || filter === "all") return true;
    
    const orderDate = new Date(orderTime);
    const now = new Date();
    
    if (filter === "custom" && customDate) {
      const selectedDate = new Date(customDate);
      return orderDate.toDateString() === selectedDate.toDateString();
    }
    
    const diffTime = now - orderDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    switch (filter) {
      case "today":
        return diffDays < 1;
      case "week":
        return diffDays < 7;
      case "month":
        return diffDays < 30;
      default:
        return true;
    }
  };

  const filteredOrders = useMemo(() => {
    const currentOrders = activeTab === "delivered" ? deliveredOrders : cancelledOrders;
    
    return currentOrders.filter((order) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        (order.customerName || "").toLowerCase().includes(query) ||
        String(order.userPhone || "").includes(query);

      const matchesDate = isWithinDateRange(order.orderTime, dateFilter);

      return matchesSearch && matchesDate;
    });
  }, [activeTab, deliveredOrders, cancelledOrders, searchQuery, dateFilter, customDate]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  }, [filteredOrders]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    
    filteredOrders.forEach((order) => {
      if (!order.orderTime) return;
      
      const date = new Date(order.orderTime);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredOrders]);

  const formatDateHeader = (dateKey) => {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(year, month - 1, day);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ⭐️ Sticky Header Panel (NOW ONLY CONTAINS TITLE AND FILTERS) */}
      <div className="sticky top-0 z-50 bg-gray-50/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-6"> {/* ⭐️ Added pb-6 */}

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500 p-2.5 rounded-xl shadow-lg">
                <History size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Order History</h1>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {deliveredOrders.length} delivered • {cancelledOrders.length} cancelled • Live updates enabled
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          {/* ⭐️ Removed mb-6 from this block */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by customer name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                <Filter className="ml-2 text-slate-400" size={18} />
                {["all", "today", "week", "month"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setDateFilter(filter);
                      if (filter !== "custom") setCustomDate("");
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      dateFilter === filter
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {filter === "all" ? "All" : filter === "today" ? "Today" : filter === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>

              {/* Custom Date Picker */}
              <div className="relative">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) {
                      setDateFilter("custom");
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className={`px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer ${
                    dateFilter === "custom" ? "ring-2 ring-blue-500 border-blue-500" : ""
                  }`}
                />
                {customDate && (
                  <button
                    onClick={() => {
                      setCustomDate("");
                      setDateFilter("all");
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Clear date"
                  >
                    <XCircle size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ⭐️ TABS AND REVENUE ARE NO LONGER IN THIS STICKY BLOCK */}

        </div>
      </div> {/* ⭐️ End of Sticky Header Panel */}

      {/* ⭐️ Scrolling Content Area */}
      {/* ⭐️ Added pt-6 for spacing */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-6">

        {/* ⭐️ Tab Navigation and Revenue Card (MOVED HERE) */}
        <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="bg-white rounded-xl shadow-md p-1 inline-flex gap-1">
            <button
              onClick={() => setActiveTab("delivered")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "delivered"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CheckCircle size={20} />
              <span>Delivered ({deliveredOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "cancelled"
                  ? "bg-rose-500 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <XCircle size={20} />
              <span>Cancelled ({cancelledOrders.length})</span>
            </button>
          </div>

          <div className={`bg-gradient-to-br ${
            activeTab === "delivered" 
              ? "from-emerald-500 to-emerald-600" 
              : "from-rose-500 to-rose-600"
          } rounded-xl shadow-lg p-4 lg:p-5 text-white`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs lg:text-sm font-medium text-white/80 uppercase tracking-wide mb-1">
                  {activeTab === "delivered" ? "Total Revenue" : "Total Loss"}
                </p>
                <p className="text-2xl lg:text-3xl font-bold">
                  ₹{totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className={`${
                activeTab === "delivered" ? "bg-emerald-400/30" : "bg-rose-400/30"
              } p-3 rounded-lg`}>
                <Package size={28} className="text-white" />
              </div>
            </div>
            <p className="text-xs text-white/70 mt-2">
              From {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Orders List - Grouped by Date */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 py-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-600">Loading orders...</p>
            </div>
          ) : groupedOrders.length > 0 ? (
            groupedOrders.map(([dateKey, orders]) => (
              <div key={dateKey} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Date Header */}
                <div className={`${
                  activeTab === "delivered"
                    ? "bg-gradient-to-r from-emerald-700 to-emerald-800"
                    : "bg-gradient-to-r from-rose-700 to-rose-800"
                } px-6 py-3`}>
                  <div className="flex items-center gap-3">
                    <Calendar className="text-white" size={20} />
                    <h3 className="text-lg font-bold text-white">
                      {formatDateHeader(dateKey)}
                    </h3>
                    <span className="ml-auto text-sm text-white/80 font-medium">
                      {orders.length} order{orders.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          #
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Payment Mode
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-slate-100">
                      {orders.map((order, idx) => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">
                              {idx + 1}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className="font-mono font-semibold text-slate-900">
                              #{order.id}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-900">
                            {order.customerName}
                          </td>
                          <td className="py-4 px-5 text-slate-600 font-medium">
                            +91-{String(order.userPhone).replace(/^(\+91|91)?/, "")}
                          </td>
                          <td className="py-4 px-5 font-bold text-lg text-slate-900">
                            ₹{(order.totalPrice ?? 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                              {order.paymentMode || "—"}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            {order.paymentStatus === "CONFIRMED" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                Confirmed
                              </span>
                            )}
                            {order.paymentStatus === "PENDING" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                Pending
                              </span>
                            )}
                            {order.paymentStatus === "FAILED" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-sm font-medium text-slate-600">
                              {order.orderTime ? new Date(order.orderTime).toLocaleTimeString('en-IN', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 ${
                  activeTab === "delivered" ? "bg-emerald-50" : "bg-rose-50"
                } rounded-full flex items-center justify-center`}>
                  {activeTab === "delivered" ? (
                    <Package size={32} className="text-emerald-400" />
                  ) : (
                    <XCircle size={32} className="text-rose-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-slate-900 font-semibold text-lg">
                    No orders found
                  </p>
                  <p className="text-slate-500 text-sm">
                    {searchQuery || dateFilter !== "all" 
                      ? "Try adjusting your search or filters"
                      : `No ${activeTab} orders yet`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;