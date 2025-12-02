import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Table2,
  Sparkles,
} from "lucide-react";
import SockJS from "sockjs-client";
import { over } from "stompjs";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

const Analytics = () => {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
  });
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [paymentSplit, setPaymentSplit] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [aiInsights, setAiInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // 🆕 Filter state already existed
  const [dateRange, setDateRange] = useState("week");

  const stompRef = useRef(null);

  // 🆕 UPDATED TO USE ?range=${dateRange}
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8080/api/orders/analytics?range=${dateRange}`
      );

      if (!res.ok) throw new Error("Failed to fetch analytics");

      const data = await res.json();

      setSummary({
        totalRevenue: data.totalRevenue || 0,
        totalOrders: data.totalOrders || 0,
        totalCustomers: data.totalCustomers || 0,
        avgOrderValue: data.avgOrderValue || 0,
      });

      setDailyRevenue(data.dailyRevenue || []);
      setPaymentSplit(data.paymentSplit || []);
      setPopularItems(data.popularItems || []);
      setOrderStatus(data.orderStatus || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/orders/monthly-summary");
      if (!res.ok) throw new Error("Failed to fetch monthly summary");

      const data = await res.json();
      setMonthlySummary(data || []);
    } catch (err) {
      console.error("Error fetching monthly summary:", err);
    }
  };

  const fetchAiInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/orders/ai-insights");
      if (!res.ok) throw new Error("Failed to fetch AI insights");

      const insightsText = await res.text();
      setAiInsights(insightsText);
    } catch (err) {
      console.error("Error fetching AI insights:", err);
      setAiInsights("Could not load insights. Please try again later.");
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchMonthlySummary();
    fetchAiInsights();

    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = over(socket);
    stompRef.current = stompClient;

    stompClient.connect(
      {},
      () => {
        console.log("✅ Analytics WebSocket connected");

        stompClient.subscribe("/topic/orders", (msg) => {
          if (!msg.body) return;
          fetchAnalytics();
          fetchMonthlySummary();
          fetchAiInsights();
        });
      },
      (err) => {
        console.error("WebSocket connection error:", err);
      }
    );

    return () => {
      if (stompRef.current && stompRef.current.connected) {
        stompRef.current.disconnect(() =>
          console.log("Analytics WebSocket disconnected")
        );
      }
      stompRef.current = null;
    };
  }, []);

  // 🆕 RE-FETCH WHEN RANGE CHANGES
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const formatCurrency = (value) => {
    if (!value) return "₹0";
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  };

  const formatCurrencyFull = (value) => {
    return `₹${value?.toLocaleString("en-IN") || 0}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-700">{label}</p>
          <p className="text-sm text-slate-600">
            Revenue:{" "}
            <span className="font-bold text-emerald-600">
              {formatCurrencyFull(payload[0].value)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Sticky Header Wrapper */}
      <div className="sticky top-0 z-50 p-6 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                <TrendingUp size={28} className="text-white" />
              </div>
              Analytics & Insights
            </h1>
            <p className="text-slate-600 text-sm mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live updates enabled • Real-time business metrics
            </p>
          </div>

          <div className="flex gap-2 bg-white rounded-xl shadow-md p-1">
            {["week", "month", "all"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  dateRange === range
                    ? "bg-blue-500 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {range === "week"
                  ? "7 Days"
                  : range === "month"
                  ? "30 Days"
                  : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrolling Content */}
      <div className="p-6 space-y-8">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 py-16 text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-emerald-400/30 p-3 rounded-lg">
                      <DollarSign size={24} className="text-white" />
                    </div>
                    <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wide">
                      Revenue
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {formatCurrencyFull(summary.totalRevenue)}
                  </h2>
                  <p className="text-emerald-100 text-sm">Total earnings</p>
                  <p className="mt-2 text-xs font-semibold text-white/90 bg-emerald-700/50 px-2 py-1 rounded-md">
                    💡 Revenue includes running and pending orders also
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-blue-400/30 p-3 rounded-lg">
                      <ShoppingCart size={24} className="text-white" />
                    </div>
                    <span className="text-blue-100 text-xs font-semibold uppercase tracking-wide">
                      Orders
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {summary.totalOrders}
                  </h2>
                  <p className="text-blue-100 text-sm">Total orders placed</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-purple-400/30 p-3 rounded-lg">
                      <Users size={24} className="text-white" />
                    </div>
                    <span className="text-purple-100 text-xs font-semibold uppercase tracking-wide">
                      Customers
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {summary.totalCustomers}
                  </h2>
                  <p className="text-purple-100 text-sm">Unique customers</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-amber-400/30 p-3 rounded-lg">
                      <TrendingUp size={24} className="text-white" />
                    </div>
                    <span className="text-amber-100 text-xs font-semibold uppercase tracking-wide">
                      Avg Value
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {formatCurrencyFull(summary.avgOrderValue)}
                  </h2>
                  <p className="text-amber-100 text-sm">Per order average</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            <Card className="shadow-xl border-slate-200 hover:shadow-2xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-cyan-100 p-2 rounded-lg">
                    <Sparkles className="text-cyan-600" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">
                    AI Insights
                  </h2>
                </div>

                {insightsLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-cyan-600 rounded-full animate-spin"></div>
                    <p className="ml-3 text-slate-500">Generating insights...</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-700">
                    {aiInsights.split("\n").map((line, index) => (
                      <p key={index} className="flex items-start gap-2">
                        <span className="font-semibold text-cyan-700">
                          {line.substring(0, 2)}
                        </span>
                        <span className="flex-1">
                          {line.substring(2)}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Daily Revenue Trend */}
              <Card className="shadow-xl border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Calendar className="text-blue-600" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Daily Revenue Trend
                    </h2>
                  </div>

                  {dailyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyRevenue}>
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: "#3b82f6", r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No revenue data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Mode Split */}
              <Card className="shadow-xl border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <DollarSign className="text-emerald-600" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Payment Mode Split
                    </h2>
                  </div>

                  {paymentSplit.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentSplit}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) =>
                            `${entry.name}: ${entry.value}%`
                          }
                          labelLine={false}
                        >
                          {paymentSplit.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Most Ordered Items */}
              <Card className="shadow-xl border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <ShoppingCart className="text-amber-600" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Most Ordered Items
                    </h2>
                  </div>

                  {popularItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={popularItems}>
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                          angle={-15}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="orders"
                          fill="#f59e0b"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No order data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Status Distribution */}
              <Card className="shadow-xl border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <TrendingUp className="text-purple-600" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Order Status Distribution
                    </h2>
                  </div>

                  {orderStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={orderStatus}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          label={(entry) =>
                            `${entry.name}: ${entry.value}%`
                          }
                        >
                          {orderStatus.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No status data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Summary */}
            <Card className="shadow-xl border-slate-200 hover:shadow-2xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Table2 className="text-indigo-600" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Monthly Summary
                  </h2>
                </div>

                {monthlySummary.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">
                            Month
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">
                            Orders
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">
                            Revenue
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">
                            Avg Order Value
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">
                            Cash %
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">
                            Card %
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700">
                            UPI %
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {monthlySummary.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {row.month}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                {row.orders}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                              {formatCurrency(row.revenue)}
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-slate-700">
                              {formatCurrency(row.avgOrderValue)}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-emerald-500 h-2 rounded-full"
                                    style={{
                                      width: `${row.cashPercent || 0}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">
                                  {row.cashPercent || 0}%
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{
                                      width: `${row.cardPercent || 0}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">
                                  {row.cardPercent || 0}%
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{
                                      width: `${row.upiPercent || 0}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">
                                  {row.upiPercent || 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    No monthly summary data available
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
