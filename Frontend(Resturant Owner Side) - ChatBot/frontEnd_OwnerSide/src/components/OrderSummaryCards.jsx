import React, { useMemo } from "react";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
  XCircle,
  ChefHat,
} from "lucide-react";

const OrderSummaryCards = ({ orders }) => {
  const stats = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    const pending = orders.filter((o) => o.orderStatus === "Pending").length;
    const preparing = orders.filter((o) => o.orderStatus === "Preparing").length;
    const confirmed = orders.filter((o) => o.orderStatus === "Confirmed").length;
    const completed = orders.filter((o) => o.orderStatus === "Completed").length;
    const delivered = orders.filter((o) => o.orderStatus === "Delivered").length;
    const cancelled = orders.filter((o) => o.orderStatus === "Cancelled").length;

    return [
      {
        title: "Total Orders",
        value: orders.length,
        color: "from-blue-500 to-blue-600",
        icon: TrendingUp,
      },
      {
        title: "Pending",
        value: pending,
        color: "from-yellow-500 to-yellow-600",
        icon: Clock,
      },
      {
        title: "Preparing",
        value: preparing,
        color: "from-orange-500 to-orange-600",
        icon: ChefHat,
      },
      {
        title: "Completed",
        value: confirmed + completed, // ✅ include completed as confirmed
        color: "from-green-500 to-green-600",
        icon: CheckCircle,
      },
      {
        title: "Delivered",
        value: delivered,
        color: "from-purple-500 to-purple-600",
        icon: Package,
      },
      {
        title: "Cancelled",
        value: cancelled,
        color: "from-red-500 to-red-600",
        icon: XCircle,
      },
    ];
  }, [orders]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-6 py-6">
      {stats.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-gradient-to-br ${card.color} text-white p-5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium opacity-90">
                {card.title}
              </h3>
              <Icon size={20} className="opacity-80" />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
};

export default OrderSummaryCards;
