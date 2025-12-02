// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import OrderHistory from "./components/OrderHistory";
import Payments from "./components/PaymentsFinance";
import Analytics from "./components/Analytics";
import Sidebar from "./components/Sidebar";
import MenuManagement from "./pages/MenuManagement";

import "./App.css";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64 transition-all duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu-management" element={<MenuManagement />} />
            <Route path="/history" element={<OrderHistory />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;