// src/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  History,
  DollarSign,
  BarChart3,
  ChefHat,
  LogOut,
  Settings,
} from "lucide-react";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Menu Management", path: "/menu-management", icon: ChefHat },
    { name: "Order History", path: "/history", icon: History },
    { name: "Payments", path: "/payments", icon: DollarSign },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[10000] bg-slate-900 text-white p-3 rounded-xl shadow-2xl"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9990] lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
          text-white shadow-2xl z-[9999]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-500 p-2.5 rounded-xl shadow-lg">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                My Resto
              </h2>
              <p className="text-slate-400 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  }`}
              >
                <Icon
                  size={20}
                  className={`${!isActive && "group-hover:scale-110"} transition-transform duration-200`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 w-full group">
            <Settings
              size={18}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            <span>Settings</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-600 hover:text-white transition-all duration-200 w-full">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
