import React, { useState } from "react";
import {
  Check,
  X,
  Truck,
  Clock,
  ChefHat,
  Box,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import OrderDetailsModal from "./OrderDetailsModal";

const OrderTable = ({ orders, fetchOrders }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    setLoadingId(orderId);
    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${orderId}/order-status?status=${newStatus}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        toast.success(`Order updated to ${newStatus}`);
        await fetchOrders();
      } else {
        const txt = await response.text().catch(() => "");
        toast.error(`Failed (${response.status}) ${txt}`);
        console.error("Failed update", response.status, txt);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Error updating order");
    } finally {
      setLoadingId(null);
    }
  };

  // ✅ Filter out delivered, cancelled orders and failed payments
  const validOrders = Array.isArray(orders)
    ? orders.filter(
        (order) =>
          order.paymentStatus &&
          !["FAILED", "PAYMENT_FAILED"].includes(
            order.paymentStatus.toUpperCase()
          ) &&
          order.orderStatus &&
          order.orderStatus.toLowerCase() !== "delivered" && // ✅ Exclude delivered orders
          order.orderStatus.toLowerCase() !== "cancelled" // ✅ Exclude cancelled orders
      )
    : [];

  const getStatusConfig = (status) => {
    switch (status) {
      case "Completed":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          dot: "bg-blue-500",
        };
      case "Preparing":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
        };
      case "Accepted":
        return {
          bg: "bg-indigo-50",
          text: "text-indigo-700",
          border: "border-indigo-200",
          dot: "bg-indigo-500",
        };
      case "Cancelled":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
        };
      case "Pending":
        return {
          bg: "bg-orange-50",
          text: "text-orange-700",
          border: "border-orange-200",
          dot: "bg-orange-500",
        };
      default:
        return {
          bg: "bg-slate-50",
          text: "text-slate-700",
          border: "border-slate-200",
          dot: "bg-slate-500",
        };
    }
  };

  const Button = ({ color, icon: Icon, text, onClick, disabled }) => {
    const colorConfig = {
      green: "bg-emerald-600 hover:bg-emerald-700",
      yellow: "bg-amber-600 hover:bg-amber-700",
      blue: "bg-blue-600 hover:bg-blue-700",
      red: "bg-rose-600 hover:bg-rose-700",
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${colorConfig[color]}`}
      >
        {Icon && <Icon size={16} />}
        <span>{text}</span>
      </button>
    );
  };

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Order Management</h2>
            <p className="text-sm text-slate-400">
              {validOrders.length} active orders
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                #
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Customer
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Phone
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Mode
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Payment
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="py-3.5 px-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100">
            {validOrders.length > 0 ? (
              validOrders.map((order, index) => {
                const statusConfig = getStatusConfig(order.orderStatus);
                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="transition-colors duration-150 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">
                        {index + 1}
                      </div>
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
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
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
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 ${statusConfig.dot} rounded-full ${
                            order.orderStatus === "Preparing"
                              ? "animate-pulse"
                              : ""
                          }`}
                        ></span>
                        {order.orderStatus}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div
                        className="flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.orderStatus === "Pending" && (
                          <>
                            <Button
                              color="green"
                              icon={Check}
                              text={
                                loadingId === order.id
                                  ? "Processing..."
                                  : "Accept"
                              }
                              onClick={() =>
                                handleOrderStatusUpdate(order.id, "Accepted")
                              }
                              disabled={loadingId === order.id}
                            />
                            <Button
                              color="red"
                              icon={X}
                              text={
                                loadingId === order.id
                                  ? "Processing..."
                                  : "Cancel"
                              }
                              onClick={() =>
                                handleOrderStatusUpdate(order.id, "Cancelled")
                              }
                              disabled={loadingId === order.id}
                            />
                          </>
                        )}
                        {order.orderStatus === "Accepted" && (
                          <Button
                            color="yellow"
                            icon={ChefHat}
                            text={
                              loadingId === order.id
                                ? "Processing..."
                                : "Prepare"
                            }
                            onClick={() =>
                              handleOrderStatusUpdate(order.id, "Preparing")
                            }
                            disabled={loadingId === order.id}
                          />
                        )}
                        {order.orderStatus === "Preparing" && (
                          <Button
                            color="blue"
                            icon={Box}
                            text={
                              loadingId === order.id
                                ? "Processing..."
                                : "Complete"
                            }
                            onClick={() =>
                              handleOrderStatusUpdate(order.id, "Completed")
                            }
                            disabled={loadingId === order.id}
                          />
                        )}
                        {order.orderStatus === "Completed" && (
                          <Button
                            color="green"
                            icon={Truck}
                            text={
                              loadingId === order.id
                                ? "Processing..."
                                : "Deliver"
                            }
                            onClick={() =>
                              handleOrderStatusUpdate(order.id, "Delivered")
                            }
                            disabled={loadingId === order.id}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <Clock size={32} className="text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-900 font-semibold text-lg">
                        No active orders
                      </p>
                      <p className="text-slate-500 text-sm">
                        New orders will appear here
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderTable;