import React from "react";
import { ChefHat, Store, Clock } from "lucide-react";

const DashboardHeader = ({ isRestaurantOpen, toggleRestaurant }) => {
  return (
<header className="fixed top-0 left-0 w-full lg:left-64 lg:w-[calc(100%-16rem)] z-10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-b border-slate-700">
      <div className="px-6 py-5 flex justify-between items-center">
        
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg">
            <ChefHat size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Restaurant Dashboard</h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <Store size={14} />
              Manage your orders efficiently
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Restaurant Status Toggle */}
          <button
            onClick={toggleRestaurant}
            className={`relative px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3 ${
              isRestaurantOpen
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`relative flex items-center justify-center w-6 h-6 rounded-full ${
                isRestaurantOpen ? "bg-emerald-400/30" : "bg-rose-400/30"
              }`}>
                <span className={`w-3 h-3 rounded-full ${
                  isRestaurantOpen ? "bg-white animate-pulse" : "bg-white"
                }`}></span>
              </div>
              <span className="text-base">{isRestaurantOpen ? "Open" : "Closed"}</span>
            </div>
            <Clock size={18} className="opacity-80" />
          </button>

          {/* Status Indicator Badge */}
          <div className={`px-4 py-2 rounded-lg border-2 ${
            isRestaurantOpen 
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" 
              : "border-rose-500/50 bg-rose-500/10 text-rose-400"
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wider">
              {isRestaurantOpen ? "Accepting Orders" : "Not Accepting Orders"}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
};

export default DashboardHeader;