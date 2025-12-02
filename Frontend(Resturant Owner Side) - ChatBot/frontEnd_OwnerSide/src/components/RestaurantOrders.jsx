import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { over } from "stompjs";

let stompClient = null;

const RestaurantOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("");
  const [canPlaySound, setCanPlaySound] = useState(false);
  const audioRef = useRef(null);

  // ✅ Initialize sound after user interaction
  useEffect(() => {
    audioRef.current = new Audio("/new-order.mp3");
    const enableSound = () => setCanPlaySound(true);
    window.addEventListener("click", enableSound);
    return () => window.removeEventListener("click", enableSound);
  }, []);

  // ✅ WebSocket Connection
  useEffect(() => {
    const socket = new SockJS("http://localhost:8080/ws");
    stompClient = over(socket);

    stompClient.connect({}, () => {
      console.log("✅ WebSocket connected");

      stompClient.subscribe("/topic/orders", (message) => {
        if (message.body) {
          const newOrder = JSON.parse(message.body);
          console.log("📦 New order received:", newOrder);

          // ✅ Use async update to avoid React rendering conflicts
          setTimeout(() => {
            setOrders((prev) => {
              const updated = [...prev, newOrder];
              applyFilter(updated, paymentFilter);

              // 🔊 Play sound only if allowed
              if (canPlaySound && audioRef.current) {
                audioRef.current.play().catch((err) => {
                  console.warn("Sound blocked:", err.message);
                });
              }

              return updated;
            });
          }, 0);
        }
      });
    });

    // Fetch initial orders
    const fetchOrders = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/orders");
        const data = await res.json();
        setOrders(data);
        applyFilter(data, paymentFilter);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };
    fetchOrders();

    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, [canPlaySound]);

  const applyFilter = (data, type) => {
    if (!type) setFilteredOrders(data);
    else
      setFilteredOrders(
        data.filter(
          (order) =>
            order.paymentMode &&
            order.paymentMode.toLowerCase() === type.toLowerCase()
        )
      );
  };

  const handlePaymentFilter = (type) => {
    setPaymentFilter(type);
    applyFilter(orders, type);
  };

  const clearFilters = () => {
    setPaymentFilter("");
    setFilteredOrders(orders);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-semibold mb-4 text-gray-800">
        Restaurant Orders
      </h1>

      {/* Filter Section */}
      <div className="flex items-center gap-3 mb-6">
        {["Cash", "UPI", "Card"].map((method) => (
          <button
            key={method}
            className={`px-4 py-2 rounded-lg font-medium ${
              paymentFilter === method
                ? "bg-blue-600 text-white"
                : "bg-white border"
            }`}
            onClick={() => handlePaymentFilter(method)}
          >
            {method}
          </button>
        ))}

        <button
          className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {!canPlaySound && (
        <p className="text-sm text-gray-600 mb-4">
          🔇 Click anywhere to enable order sound alerts
        </p>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Payment Mode</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{order.id}</td>
                  <td className="p-3">{order.customerName}</td>
                  <td className="p-3">₹{order.totalPrice}</td>
                  <td className="p-3">{order.paymentMode}</td>
                  <td className="p-3">{order.orderStatus}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RestaurantOrders;
