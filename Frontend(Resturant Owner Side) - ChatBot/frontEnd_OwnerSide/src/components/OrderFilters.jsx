import React from "react";
import { Search, XCircle } from "lucide-react";

const OrderFilters = ({ filters = {}, setFilters }) => {
  const clear = () =>
    setFilters({
      search: "",
      payment: "All",
      status: "All",
    });

  const isFiltered =
    (filters.search?.trim() || "") !== "" ||
    filters.payment !== "All" ||
    filters.status !== "All";

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 px-6 py-4 bg-white shadow-sm rounded-xl border border-slate-200">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by customer or phone..."
          value={filters.search || ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <select
        className="border border-slate-300 p-2 rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-slate-500"
        value={filters.payment || "All"}
        onChange={(e) => setFilters({ ...filters, payment: e.target.value })}
      >
        <option value="All">All Payments</option>
        <option value="Cash">Cash</option>
        <option value="UPI">UPI</option>
        <option value="Card">Card</option>
      </select>

      <select
        className="border border-slate-300 p-2 rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-slate-500"
        value={filters.status || "All"}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="All">All Status</option>
        <option value="Pending">Pending</option>
        <option value="Accepted">Accepted</option>
        <option value="Preparing">Preparing</option>
        <option value="Completed">Completed</option>
        <option value="Delivered">Delivered</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      {isFiltered && (
        <button
          onClick={clear}
          className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-300 transition-all font-medium"
        >
          <XCircle size={18} />
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default OrderFilters;
