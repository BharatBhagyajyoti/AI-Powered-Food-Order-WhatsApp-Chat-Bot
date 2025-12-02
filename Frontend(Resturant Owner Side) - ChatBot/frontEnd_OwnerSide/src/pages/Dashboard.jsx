import React, { useEffect, useState, useMemo, useRef } from "react";
import SockJS from "sockjs-client";
import { over } from "stompjs";
import toast, { Toaster } from "react-hot-toast";
import { Activity, Circle } from "lucide-react";

import DashboardHeader from "../components/DashboardHeader";
import OrderSummaryCards from "../components/OrderSummaryCards";
import OrderFilters from "../components/OrderFilters";
import OrderTable from "../components/OrderTable";




const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    payment: "All",
    status: "All",
  });
  // ⭐ FIX: Persist Live Orders state in localStorage
  const [isLive, setIsLive] = useState(() => {
    const saved = localStorage.getItem("liveOrdersEnabled");
    return saved === "true";
  });

  // NEW: Restaurant open/close state
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);

  const stompRef = useRef(null);
  const audioRef = useRef(null);
  const userInteracted = useRef(false);

  // -------------------------------
  // NEW: Fetch Restaurant Status
  // -------------------------------
  const fetchRestaurantStatus = async () => {
    try {
      const res = await fetch("http://localhost:8080/restaurant/status");
      const status = await res.json();
      setIsRestaurantOpen(status);
    } catch (err) {
      console.error("Failed to load restaurant status", err);
    }
  };

  // -------------------------------
  // NEW: Toggle Restaurant Status
  // -------------------------------
  const toggleRestaurant = async () => {
    try {
      const newStatus = !isRestaurantOpen;
      await fetch(`http://localhost:8080/restaurant/toggle?open=${newStatus}`, {
        method: "POST",
      });
      setIsRestaurantOpen(newStatus);
      toast.success(
        newStatus ? "Restaurant is now OPEN" : "Restaurant is now CLOSED"
      );
    } catch (err) {
      console.error("Toggle failed", err);
      toast.error("Failed to update restaurant status");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/orders/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const data = await res.json();
      console.log("📊 Dashboard fetched orders:", data.orders?.length || 0);
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRestaurantStatus(); // <-- NEW

    // Prepare audio
    audioRef.current = new Audio("/new-order.mp3");

    const enableAudio = () => {
      userInteracted.current = true;
      console.log("✅ Audio permission granted - User interacted with page");
      window.removeEventListener("click", enableAudio);
      window.removeEventListener("keypress", enableAudio);
    };
    window.addEventListener("click", enableAudio);
    window.addEventListener("keypress", enableAudio);

    return () => {
      window.removeEventListener("click", enableAudio);
      window.removeEventListener("keypress", enableAudio);
    };
  }, []);

  // -------------------------------
  // WebSocket - FIX APPLIED HERE
  // -------------------------------
  useEffect(() => {
    if (!isLive) {
      if (stompRef.current && stompRef.current.connected) {
        stompRef.current.disconnect(() =>
          console.log("WebSocket disconnected")
        );
      }
      stompRef.current = null;
      return;
    }

    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = over(socket);
    stompRef.current = stompClient;

    stompClient.connect(
      {},
      () => {
        console.log("✅ Dashboard WebSocket connected");

        stompClient.subscribe("/topic/orders", (msg) => {
          if (!msg.body) return;
          const updated = JSON.parse(msg.body);

          console.log("📡 Dashboard received WebSocket update:", {
            id: updated.id,
            orderStatus: updated.orderStatus,
            paymentStatus: updated.paymentStatus
          });

          setOrders((prev) => {
            
            // ⭐ FIX: Remove the order if it is cancelled or delivered
            // This ensures closed orders do not linger on the active dashboard list.
            if (
                updated.orderStatus && 
                (updated.orderStatus.toLowerCase() === "cancelled" || 
                 updated.orderStatus.toLowerCase() === "delivered")
            ) {
                console.log("🗑️ Removing order", updated.id, "from Dashboard (status:", updated.orderStatus + ")");
                // Return the list without the updated order
                return prev.filter((o) => o.id !== updated.id);
            }

            const exists = prev.some((o) => o.id === updated.id);
            
            if (!exists) {
              console.log("➕ Adding new order", updated.id, "to Dashboard");
              
              if (userInteracted.current && audioRef.current) {
                audioRef.current.play().catch(() => {});
              }

              setTimeout(
                () => toast.success(`New order from ${updated.customerName}`),
                0
              );

              return [updated, ...prev];
            } else {
              console.log("🔄 Updating existing order", updated.id, "in Dashboard");
              // Update existing order (status change from Pending to Accepted, etc.)
              return prev.map((o) =>
                o.id === updated.id ? updated : o
              );
            }
          });
        });
      },
      (err) => {
        console.error("STOMP conn error", err);
      }
    );

    return () => {
      if (stompRef.current && stompRef.current.connected) {
        stompRef.current.disconnect(() =>
          console.log("STOMP disconnected (cleanup)")
        );
      }
      stompRef.current = null;
    };
  }, [isLive]);

  // -------------------------------
  // Filters Logic (unchanged)
  // -------------------------------
  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    const p = filters.payment.toLowerCase();
    const st = filters.status.toLowerCase();

    return orders.filter((order) => {
      const name = (order.customerName || "").toLowerCase();
      const phone = (order.userPhone || "").toLowerCase();
      const matchesSearch = !s || name.includes(s) || phone.includes(s);

      const pay = (order.paymentMode || "").toLowerCase();
      const matchesPayment =
        p === "all" || pay === p || (p === "card" && pay.includes("card"));

      const status = (order.orderStatus || "").toLowerCase();
      const matchesStatus = st === "all" || status === st;

      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [orders, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <Toaster position="top-right" />
      
      {/* Pass NEW props */}
      <DashboardHeader 
        isRestaurantOpen={isRestaurantOpen}
        toggleRestaurant={toggleRestaurant}
      />

      <main className="px-6 py-6 pt-28">
        <OrderSummaryCards orders={orders} />

        {/* Enhanced Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 px-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Active Orders</h2>
            <p className="text-sm text-gray-600">Monitor and manage incoming orders in real-time</p>
          </div>
          
          {/* Enhanced Live Toggle Button */}
          <button
            onClick={() => {
              const newState = !isLive;
              setIsLive(newState);
              // ⭐ Save to localStorage so it persists across navigation
              localStorage.setItem("liveOrdersEnabled", newState.toString());
              console.log("📡 Live Orders toggled:", newState ? "ON" : "OFF");
            }}
            className={`relative px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3 ${
              isLive
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`relative flex items-center justify-center w-6 h-6 rounded-full ${
                isLive ? "bg-emerald-400/30" : "bg-slate-400/30"
              }`}>
                {isLive ? (
                  <span className="w-3 h-3 rounded-full bg-white animate-pulse"></span>
                ) : (
                  <Circle size={16} className="text-white" />
                )}
              </div>
              <span className="text-base font-semibold">
                {isLive ? "Live Updates Active" : "Live Updates Off"}
              </span>
            </div>
            <Activity size={18} className={isLive ? "animate-pulse" : "opacity-60"} />
          </button>
        </div>

        <OrderFilters filters={filters} setFilters={setFilters} />
        <OrderTable orders={filtered} fetchOrders={fetchOrders} />
      </main>
    </div>
  );
};

export default Dashboard;