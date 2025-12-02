// pages/OrderManagement.jsx
import React, { useEffect, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import api from "../services/api";

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);

  // Fetch initial orders from backend
  useEffect(() => {
    api.get("/api/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Connect WebSocket for real-time updates
  useEffect(() => {
    connectWebSocket((newOrder) => {
      // Update state when new order is received
      setOrders((prev) => [newOrder, ...prev]);
    });

    return () => disconnectWebSocket();
  }, []);

  return (
    <div>
      <h2>Orders</h2>
      {orders.map((order) => (
        <div key={order.id}>
          <p>Order #{order.id} - {order.status}</p>
        </div>
      ))}
    </div>
  );
};

export default OrderManagement;
