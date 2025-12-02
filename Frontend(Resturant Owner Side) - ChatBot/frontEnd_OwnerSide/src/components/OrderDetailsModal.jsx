import React, { useRef } from "react";

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  const receiptRef = useRef();

  // ✅ Format date to DD/MM/YYYY HH:mm
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // ✅ Format phone to +91-XXXXXXXXXX
  const formatPhone = (phone) => {
    if (!phone) return "—";
    const cleaned = phone.toString().replace(/\D/g, "");
    if (cleaned.startsWith("91")) {
      return `+${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    }
    return `+91-${cleaned}`;
  };

  // ✅ Smooth Print (without reload)
  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
            th { background: #f4f4f4; }
            .total { text-align: right; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();

    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-lg">
        <div ref={receiptRef}>
          <div className="text-center border-b pb-3 mb-3">
            <h2 className="text-2xl font-bold text-slate-900">🍽️ Order Receipt</h2>
            <p className="text-sm text-slate-500">
              Prepared for Kitchen / Chef
            </p>
          </div>

          <div className="space-y-2 text-slate-700">
            <p><strong>Order ID:</strong> #{order.id}</p>
            <p><strong>Customer:</strong> {order.customerName}</p>
            <p><strong>Phone:</strong> {formatPhone(order.userPhone)}</p>
            <p><strong>Payment Mode:</strong> {order.paymentMode}</p>
            <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
            <p><strong>Order Status:</strong> {order.orderStatus}</p>
            <p><strong>Order Time:</strong> {formatDate(order.orderTime)}</p>
          </div>

          <div className="mt-4">
            <strong className="text-slate-900">Items Ordered:</strong>
            {order.orderItems && order.orderItems.length > 0 ? (
              <table className="w-full mt-2 border border-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="py-2 px-2 text-left">Item</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems.map((item, index) => {
                    const totalItemPrice = item.quantity * item.price;
                    return (
                      <tr
                        key={index}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="py-1.5 px-2">{item.menuItemName}</td>
                        <td className="py-1.5 px-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          ₹{item.price} × {item.quantity} = ₹{totalItemPrice}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-slate-500">No items found</p>
            )}
          </div>

          <div className="mt-4 font-semibold text-slate-900 text-right">
            Total Amount: ₹{(order.totalPrice ?? 0).toFixed(2)}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition cursor-pointer"
          >
            🖨️ Print / Download
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
