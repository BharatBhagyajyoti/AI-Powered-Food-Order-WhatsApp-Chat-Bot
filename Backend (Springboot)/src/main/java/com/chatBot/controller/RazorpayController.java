package com.chatBot.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chatBot.model.Order;
import com.chatBot.service.OrderService;
import com.chatBot.service.RazorpayService;
import com.chatBot.service.WhatsAppService;

@RestController
@RequestMapping("/api/payment")
public class RazorpayController {

    // Services for order management and sending WhatsApp messages
    private final OrderService orderService;
    private final WhatsAppService whatsAppService;
    private final RazorpayService razorpayService;

    // Constructor injection for the required services
    public RazorpayController(OrderService orderService, WhatsAppService whatsAppService, RazorpayService razorpayService) {
        this.orderService = orderService;
        this.whatsAppService = whatsAppService;
        this.razorpayService = razorpayService;
    }

    /**
     * Handles Razorpay payment callbacks for both successful and failed payments.
     * The payload is sent by Razorpay when payment_link or payment events occur.
     *
     * @param payload - JSON payload sent by Razorpay webhook
     * @return ResponseEntity containing success/failure messages or error info
     */
    @PostMapping("/callback")
    public ResponseEntity<?> handlePaymentCallback(@RequestBody Map<String, Object> payload) {
        try {
            // Log the incoming payload for debugging
            System.out.println("Razorpay Callback Payload: " + payload);

            // Extract the 'payload' object from Razorpay event
            Map<String, Object> innerPayload = (Map<String, Object>) payload.get("payload");
            if (innerPayload == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing inner payload"));
            }

            // Initialize 'entity' which contains payment/payment_link details
            Map<String, Object> entity = null;

            // Check if it's a payment_link event
            if (innerPayload.containsKey("payment_link")) {
                Map<String, Object> paymentLink = (Map<String, Object>) innerPayload.get("payment_link");
                entity = (Map<String, Object>) paymentLink.get("entity");
            }
            // Otherwise, check if it's a direct payment event
            else if (innerPayload.containsKey("payment")) {
                Map<String, Object> payment = (Map<String, Object>) innerPayload.get("payment");
                entity = (Map<String, Object>) payment.get("entity");
            }

            if (entity == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing entity in payload"));
            }

            // Extract 'notes' to fetch internal DB order ID
            Map<String, Object> notes = (Map<String, Object>) entity.get("notes");
            if (notes == null || !notes.containsKey("ResturantOrder_ID")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing internal order ID in notes"));
            }

            // Retrieve internal order ID stored in notes
            String orderStr = (String) notes.get("ResturantOrder_ID"); // e.g., "order_refid_41"
            Long orderId = null;
            try {
                // Extract numeric part of the ID after the last underscore
                orderId = Long.valueOf(orderStr.split("_")[2]);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid order ID format in notes"));
            }

            // Get payment status (paid, captured, failed, etc.)
            String paymentStatus = (String) entity.get("status");
            if (paymentStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing payment status in payload"));
            }

            // ✅ Extract Razorpay Payment ID
            String razorpayPaymentId = (String) entity.get("id");

            // Fetch order details from DB using internal order ID
            Order order = orderService.getOrderById(orderId);

            // 🛠️ Fix: Prevent duplicate confirmations
            if ("CONFIRMED".equalsIgnoreCase(order.getStatus()) &&
                razorpayPaymentId.equalsIgnoreCase(order.getRazorpayPaymentId())) {
                System.out.println("⚠️ Duplicate webhook ignored for Payment ID: " + razorpayPaymentId);
                return ResponseEntity.ok(Map.of("message", "Duplicate webhook ignored"));
            }

            // Handle payment success
            if ("paid".equalsIgnoreCase(paymentStatus) || "captured".equalsIgnoreCase(paymentStatus)) {
                System.out.println(">>> Payment successful for order ID: " + orderId);

                // Update order status to CONFIRMED in DB
                order.setStatus("CONFIRMED");
                order.setRazorpayPaymentId(razorpayPaymentId); // ✅ store payment ID
                orderService.updateOrder(order);

                // Send WhatsApp confirmation message to the customer
                String confirmationMsg = "✅ Payment received successfully!\n"
                        + "Payment ID: " + razorpayPaymentId + "\n"
                        + "Payment Mode: " + order.getPaymentMode()
                        + "\nThank you *" + order.getCustomerName() + "😄* \n"
                        + "Your order (ID: " + orderId + ") has been confirmed.\n\n"
                        + "Your order will be ready soon! 🍽️";
                whatsAppService.sendMessage(order.getUserPhone(), confirmationMsg);

                return ResponseEntity.ok(Map.of(
                        "message", "Payment successful, order confirmed",
                        "paymentId", razorpayPaymentId
                ));
            }
            // Handle payment failure
            else if ("failed".equalsIgnoreCase(paymentStatus)) {
                System.out.println(">>> Payment failed for order ID: " + orderId);

                // Update order status to PAYMENT_FAILED in DB
                order.setStatus("PAYMENT_FAILED");
                order.setRazorpayPaymentId(razorpayPaymentId); // ✅ store failed payment ID as well
                orderService.updateOrder(order);

                // Notify customer about failed payment and next steps
                String failureMsg = "❌ Payment failed for your order (ID: " + orderId + ").\n"
                        + "Payment ID: " + razorpayPaymentId + "\n"
                        + "Please try to do payment again with the given payment link or Start a new order by typing \"*order*\" and use *_Cash on Delivery_*.";
                whatsAppService.sendMessage(order.getUserPhone(), failureMsg);

                return ResponseEntity.ok(Map.of(
                        "message", "Payment failed, order not confirmed",
                        "paymentId", razorpayPaymentId
                ));
            }
            // Handle other statuses (pending, created, etc.)
            else {
                System.out.println(">>> Payment pending or unknown status for order ID: " + orderId);
                return ResponseEntity.ok(Map.of("message", "Payment status: " + paymentStatus));
            }

        } catch (Exception e) {
            // Log stack trace for debugging
            e.printStackTrace();
            // Return internal server error with exception message
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
