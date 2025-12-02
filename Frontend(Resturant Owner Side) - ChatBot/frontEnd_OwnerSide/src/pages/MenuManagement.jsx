// src/pages/MenuManagement.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import {
  FaUtensils,
  FaTrash,
  FaEdit,
  FaPlus,
  FaTimes,
  FaSearch,
} from "react-icons/fa";

// ✅ Toast Notifications
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MenuManagement = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", price: "", available: true });
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE = "http://localhost:8080/api/menu";

  // ✅ Load all items from backend
  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setMenu(data);
    } catch (err) {
      toast.error("Failed to load menu!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // ✅ Add or Update Menu Item
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingItem ? "PUT" : "POST";
    const url = editingItem ? `${API_BASE}/${editingItem.id}` : API_BASE;

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      toast.success(editingItem ? "Item updated!" : "Item added!");
      loadMenu();
      cancelForm();
    } catch {
      toast.error("Operation failed!");
    }
  };

  // ✅ Delete Item
  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure to delete this item?")) return;
    try {
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      toast.error("Item deleted!");
      loadMenu();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  // ✅ Toggle Availability (Switch)
  const toggleItem = async (id) => {
    try {
      await fetch(`${API_BASE}/${id}/toggle`, { method: "PATCH" });
      toast.info("Item availability updated!");
      loadMenu();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // ✅ Enable Edit Mode
  const startEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      available: item.available,
    });
    setShowForm(true);
  };

  // ✅ Reset form
  const cancelForm = () => {
    setForm({ name: "", description: "", price: "", available: true });
    setEditingItem(null);
    setShowForm(false);
  };

  // ✅ Filter menu items
  const filteredMenu = menu.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">

      {/* ✅ Toast Message UI */}
      <ToastContainer position="top-right" autoClose={1500} />

      {/* ✅ Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-xl shadow-md z-50 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-lg">
              <FaUtensils className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Menu Management</h1>
              <p className="text-sm text-gray-500">Manage your restaurant items</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            <span>{showForm ? "Cancel" : "Add New Item"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ✅ Form UI */}
        {showForm && (
          <div className="animate-fadeIn">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingItem ? "Edit Menu Item" : "Add New Item"}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                      <input
                        type="text"
                        required
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none"
                        placeholder="e.g., Margherita Pizza"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none"
                        placeholder="299.00"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      rows="4"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none resize-none"
                      placeholder="Enter item description..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                    >
                      {editingItem ? "Update Item" : "Add Item"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelForm}
                      className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ✅ Menu Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Current Menu</h2>
                <p className="text-sm text-gray-500 mt-1">{menu.length} items total</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading menu...</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-orange-100 to-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUtensils className="text-orange-500 text-3xl" />
                </div>
                <p className="text-gray-500 font-medium">
                  {searchTerm ? "No items found matching your search." : "No menu items found. Add your first item!"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200">
                      <th className="p-4 text-left text-sm font-bold text-gray-700">#</th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700">Item</th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700">Description</th>
                      <th className="p-4 text-left text-sm font-bold text-gray-700">Price</th>
                      <th className="p-4 text-center text-sm font-bold text-gray-700">Status</th>
                      <th className="p-4 text-center text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMenu.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                        <td className="p-4">
                          <span className="text-gray-600 font-medium">{index + 1}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-gray-800">{item.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-600">{item.description || "-"}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-orange-600">₹{item.price.toFixed(2)}</span>
                        </td>

                        {/* ✅ Availability Toggle Switch */}
                        <td className="p-4">
                          <div className="flex justify-center">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={item.available}
                                onChange={() => toggleItem(item.id)}
                                className="sr-only peer"
                              />
                              <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-500 transition-all duration-300 shadow-inner"></div>
                              <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-7 shadow-md"></div>
                              <span className="ml-3 text-sm font-medium text-gray-700">
                                {item.available ? "Available" : "Unavailable"}
                              </span>
                            </label>
                          </div>
                        </td>

                        {/* ✅ Edit/Delete */}
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => startEdit(item)}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MenuManagement;