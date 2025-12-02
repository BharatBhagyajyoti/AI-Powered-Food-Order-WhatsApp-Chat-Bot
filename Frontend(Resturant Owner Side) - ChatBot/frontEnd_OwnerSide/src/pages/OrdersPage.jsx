import { useEffect, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../services/websocket";
import api from "../services/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // fetch existing orders
    api.get("/orders").then(res => setOrders(res.data));

    // connect WebSocket for live updates
    connectWebSocket((order) => {
      setOrders(prev => [order, ...prev]);
    });

    return () => disconnectWebSocket();
  }, []);

  const updateStatus = (id, status) => {
    api.put(`/orders/${id}/status`, { status }).then(res => {
      // local update handled via WebSocket, so no need to update manually
    });
  };

  return (
    <div>
      <h2>Live Orders</h2>
      {orders.map(order => (
        <div key={order.id}>
          {order.customerName} - {order.status}
          <button onClick={() => updateStatus(order.id, "Cancelled")}>Cancel</button>
        </div>
      ))}
    </div>
  );
}
