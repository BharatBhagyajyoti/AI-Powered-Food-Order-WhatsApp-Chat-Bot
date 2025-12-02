// src/services/orderService.js
import api from "./api";
import { connectWebSocket } from "./websocket";

// Fetch all orders
export const fetchOrders = async () => {
  const response = await api.get("/api/orders");
  return response.data;
};

// Update order status (e.g., accept, preparing, delivered, cancel)
export const updateOrderStatus = async (orderId, newStatus) => {
  const response = await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
  return response.data;
};

// Listen for WebSocket updates
export const listenOrders = (onMessage) => {
  const client = connectWebSocket(onMessage);
  return client;
};
