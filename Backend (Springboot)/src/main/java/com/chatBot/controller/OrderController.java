package com.chatBot.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.chatBot.dto.OrderDTO;
import com.chatBot.model.Order;
import com.chatBot.repository.OrderRepository;
import com.chatBot.service.OrderService;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService;

    // ✅ Dashboard stats API
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        long cashOrders = orderRepository.countCashOrders();
        long confirmedOnlineOrders = orderRepository.countConfirmedOnlineOrders();
        double totalRevenue = orderRepository.sumCashOrders() + orderRepository.sumConfirmedOnlineOrders();

        stats.put("cashOrders", cashOrders);
        stats.put("confirmedOnlineOrders", confirmedOnlineOrders);
        stats.put("totalRevenue", totalRevenue);
        stats.put("note", "Revenue excludes cancelled orders, but includes running/pending ones.");

        List<OrderDTO> orders = orderService.getFilteredOrders();
        stats.put("orders", orders);

        return ResponseEntity.ok(stats);
    }

    /**
     * Analytics with Date Range Filter (optimized)
     *
     * range: "7days" | "30days" | "all"
     *
     * This implementation uses repository-level queries (findValidOrdersAfter,
     * findValidOrdersWithItemsAfter, findOrdersForStatusAfter) to minimize
     * memory and avoid fetching everything into Java then filtering.
     */
    
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam(defaultValue = "7days") String range) {

        Map<String, Object> analytics = new LinkedHashMap<>();

        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startFilter = null;

            // ===========================
            // 🔎 DATE RANGE FILTER
            // ===========================
            switch (range.toLowerCase()) {
                case "7days":
                case "7":
                case "week":
                    startFilter = now.minusDays(7);
                    break;

                case "30days":
                case "30":
                case "month":
                    startFilter = now.minusDays(30);
                    break;

                case "all":
                default:
                    startFilter = null; // fetch everything
                    break;
            }

            // ====================================================
            // 1️⃣ Fetch valid orders (excluding PAYMENT_FAILED)
            // ====================================================
            List<Order> validOrders = orderRepository.findValidOrdersAfter(startFilter);

            // Revenue orders EXCLUDE CANCELLED
            List<Order> revenueOrders = validOrders.stream()
                    .filter(o -> o.getOrderStatus() == null ||
                            !"CANCELLED".equalsIgnoreCase(o.getOrderStatus()))
                    .collect(Collectors.toList());

            // ====================================================
            // 2️⃣ SUMMARY STATISTICS
            // ====================================================
            double totalRevenue = revenueOrders.stream()
                    .mapToDouble(Order::getTotalPrice)
                    .sum();

            long totalOrders = revenueOrders.size();

            long totalCustomers = revenueOrders.stream()
                    .map(Order::getUserPhone)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();

            double avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            analytics.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
            analytics.put("totalOrders", totalOrders);
            analytics.put("totalCustomers", totalCustomers);
            analytics.put("avgOrderValue", Math.round(avgOrderValue * 100.0) / 100.0);

            // ====================================================
            // 3️⃣ DAILY REVENUE TREND — FIXED (continuous timeline)
            // ====================================================

            LocalDate endDate = LocalDate.now();
            LocalDate startDateForChart;

            switch (range.toLowerCase()) {
                case "30days":
                case "month":
                    startDateForChart = endDate.minusDays(29); // 30 days inclusive
                    break;

                case "all":
                    Optional<LocalDate> earliest = revenueOrders.stream()
                            .filter(o -> o.getOrderTime() != null)
                            .map(o -> o.getOrderTime().toLocalDate())
                            .min(LocalDate::compareTo);

                    // fallback if no orders
                    startDateForChart = earliest.orElse(endDate.minusDays(6));
                    break;

                case "7days":
                case "week":
                default:
                    startDateForChart = endDate.minusDays(6); // 7 days chart
                    break;
            }

            List<Map<String, Object>> dailyRevenue = 
                    startDateForChart
                    .datesUntil(endDate.plusDays(1))          // iterate inclusive
                    .map(date -> {

                        double dayRevenue = revenueOrders.stream()
                            .filter(o -> o.getOrderTime() != null &&
                                    o.getOrderTime().toLocalDate().equals(date))
                            .mapToDouble(Order::getTotalPrice)
                            .sum();

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("date", date.getMonthValue() + "/" + date.getDayOfMonth());
                        row.put("revenue", Math.round(dayRevenue * 100.0) / 100.0);

                        return row;
                    })
                    .collect(Collectors.toList());


            analytics.put("dailyRevenue", dailyRevenue);

            // ====================================================
            // 4️⃣ PAYMENT MODE SPLIT
            // ====================================================

            List<Map<String, Object>> paymentSplit = new ArrayList<>();
            if (totalOrders > 0) {
                long cash = revenueOrders.stream()
                        .filter(o -> "CASH".equalsIgnoreCase(o.getPaymentMode()))
                        .count();

                long card = revenueOrders.stream()
                        .filter(o -> "CARD".equalsIgnoreCase(o.getPaymentMode()))
                        .count();

                long upi = revenueOrders.stream()
                        .filter(o -> "UPI".equalsIgnoreCase(o.getPaymentMode()))
                        .count();

                if (cash > 0) {
                    paymentSplit.add(Map.of(
                            "name", "Cash",
                            "value", Math.round((cash * 100.0 / totalOrders) * 10.0) / 10.0
                    ));
                }

                if (card > 0) {
                    paymentSplit.add(Map.of(
                            "name", "Card",
                            "value", Math.round((card * 100.0 / totalOrders) * 10.0) / 10.0
                    ));
                }

                if (upi > 0) {
                    paymentSplit.add(Map.of(
                            "name", "UPI",
                            "value", Math.round((upi * 100.0 / totalOrders) * 10.0) / 10.0
                    ));
                }
            }

            analytics.put("paymentSplit", paymentSplit);

            // ====================================================
            // 5️⃣ POPULAR ITEMS (Using optimized fetch)
            // ====================================================

            List<Order> ordersWithItems = orderRepository.findValidOrdersWithItemsAfter(startFilter);

            Map<String, Integer> itemCounts = new HashMap<>();

            for (Order o : ordersWithItems) {
                if (o.getOrderItems() == null) continue;

                o.getOrderItems().forEach(item -> {
                    if (item.getMenuItem() == null) return;
                    String name = item.getMenuItem().getName();
                    itemCounts.put(name, itemCounts.getOrDefault(name, 0) + item.getQuantity());
                });
            }

            List<Map<String, Object>> popularItems = itemCounts.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit(5)
                    .map(e -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("name", e.getKey());
                        m.put("orders", e.getValue());
                        return m;
                    })
                    .collect(Collectors.toList());


            analytics.put("popularItems", popularItems);

            // ====================================================
            // 6️⃣ ORDER STATUS DISTRIBUTION
            // ====================================================

            List<Order> ordersForStatus = orderRepository.findOrdersForStatusAfter(startFilter);

            long totalForStatus = ordersForStatus.size();

            long delivered = ordersForStatus.stream()
                    .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
                    .count();

            long cancelled = ordersForStatus.stream()
                    .filter(o -> "CANCELLED".equalsIgnoreCase(o.getOrderStatus()))
                    .count();

            long pending = ordersForStatus.stream()
                    .filter(o -> o.getOrderStatus() != null &&
                            !"DELIVERED".equalsIgnoreCase(o.getOrderStatus()) &&
                            !"CANCELLED".equalsIgnoreCase(o.getOrderStatus()))
                    .count();

            List<Map<String, Object>> orderStatus = new ArrayList<>();

            if (totalForStatus > 0) {

                if (delivered > 0) {
                    orderStatus.add(Map.of(
                            "name", "Delivered",
                            "value", Math.round((delivered * 100.0 / totalForStatus) * 10.0) / 10.0
                    ));
                }

                if (pending > 0) {
                    orderStatus.add(Map.of(
                            "name", "Pending",
                            "value", Math.round((pending * 100.0 / totalForStatus) * 10.0) / 10.0
                    ));
                }

                if (cancelled > 0) {
                    orderStatus.add(Map.of(
                            "name", "Cancelled",
                            "value", Math.round((cancelled * 100.0 / totalForStatus) * 10.0) / 10.0
                    ));
                }
            }

            analytics.put("orderStatus", orderStatus);

            return ResponseEntity.ok(analytics);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    

    // ✅ Update order status (Confirm, Prepare, Deliver, Cancel)
    @PutMapping("/{orderId}/order-status")
    public ResponseEntity<String> updateOrderStatus(
            @PathVariable("orderId") Long orderId,
            @RequestParam String status) {
        
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body("Order not found");
        }
        
        // 🚫 Restrict canceling delivered orders only
        if (order.getOrderStatus().equalsIgnoreCase("Delivered")) {
            if (status.equalsIgnoreCase("Cancelled")) {
                return ResponseEntity.badRequest().body("Cannot cancel an already delivered order");
            }
        }
        
        // ✅ Delegate cancellation and other transitions to OrderService so side-effects occur there (WhatsApp message, websocket)
        try {
            Order updated = orderService.updateOrderStatus(orderId, status);
            if (updated != null) {
                return ResponseEntity.ok("Order status updated successfully to " + updated.getOrderStatus());
            } else {
                return ResponseEntity.badRequest().body("Failed to update order status");
            }
        } catch (RuntimeException rex) {
            // preserve the business errors/exceptions thrown by the service
            return ResponseEntity.badRequest().body(rex.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Internal server error: " + e.getMessage());
        }
    }
    
    // ✅ Monthly Summary API
    @GetMapping("/monthly-summary")
    public ResponseEntity<List<Map<String, Object>>> getMonthlySummary() {
        List<Map<String, Object>> summary = orderService.getMonthlySummary();
        return ResponseEntity.ok(summary);
    }
    
    // ✅ AI Insights API
    @GetMapping("/ai-insights")
    public ResponseEntity<String> getAIInsights() {
        String insights = orderService.getAIInsights();
        return ResponseEntity.ok(insights);
    }
    
    // ✅ Transaction History API (Exclude Cancelled and Failed Payments)
    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getTransactionHistory() {
        List<Order> orders = orderRepository.findAll();

        // ✅ Filter only valid (non-cancelled, non-failed) orders
        List<Order> validOrders = orders.stream()
            .filter(o -> !"CANCELLED".equalsIgnoreCase(o.getOrderStatus()))
            .filter(o -> !"PAYMENT_FAILED".equalsIgnoreCase(o.getStatus()))
            .collect(Collectors.toList());

        List<Map<String, Object>> transactions = validOrders.stream()
            .filter(o -> o.getPaymentMode() != null)
            .map(o -> {
                Map<String, Object> tx = new LinkedHashMap<>();
                tx.put("id", o.getId());
                tx.put("customerName", o.getCustomerName());
                tx.put("userPhone", o.getUserPhone()); // ✅ Added phone number
                tx.put("paymentMode", o.getPaymentMode());
                tx.put("status", o.getStatus());
                tx.put("totalPrice", o.getTotalPrice());
                tx.put("razorpayPaymentId",
                    o.getRazorpayPaymentId() != null ? o.getRazorpayPaymentId() : "N/A"); // ✅ Safe check
                tx.put("orderTime", o.getOrderTime());
                tx.put("orderStatus", o.getOrderStatus());
                return tx;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(transactions);
    }


    
    // ✅ Payment Summary API (Exclude Cancelled and Failed Payments)
    @GetMapping("/payment-summary")
    public ResponseEntity<Map<String, Object>> getPaymentSummary() {
        List<Order> orders = orderRepository.findAll();

        // ✅ Filter only valid (non-cancelled, non-failed) paid/confirmed orders
        List<Order> validOrders = orders.stream()
            .filter(o -> !"CANCELLED".equalsIgnoreCase(o.getOrderStatus()))
            .filter(o -> !"PAYMENT_FAILED".equalsIgnoreCase(o.getStatus()))
            .collect(Collectors.toList());

        double totalCash = validOrders.stream()
            .filter(o -> "CASH".equalsIgnoreCase(o.getPaymentMode()))
            .mapToDouble(Order::getTotalPrice)
            .sum();

        double totalUpi = validOrders.stream()
            .filter(o -> "UPI".equalsIgnoreCase(o.getPaymentMode()))
            .mapToDouble(Order::getTotalPrice)
            .sum();

        double totalCard = validOrders.stream()
            .filter(o -> "CARD".equalsIgnoreCase(o.getPaymentMode()))
            .mapToDouble(Order::getTotalPrice)
            .sum();

        double grandTotal = totalCash + totalUpi + totalCard;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalCash", totalCash);
        summary.put("totalUpi", totalUpi);
        summary.put("totalCard", totalCard);
        summary.put("grandTotal", grandTotal);

        if (grandTotal > 0) {
            summary.put("cashPercentage", Math.round((totalCash / grandTotal) * 100.0));
            summary.put("upiPercentage", Math.round((totalUpi / grandTotal) * 100.0));
            summary.put("cardPercentage", Math.round((totalCard / grandTotal) * 100.0));
        } else {
            summary.put("cashPercentage", 0);
            summary.put("upiPercentage", 0);
            summary.put("cardPercentage", 0);
        }

        return ResponseEntity.ok(summary);
    }

}
