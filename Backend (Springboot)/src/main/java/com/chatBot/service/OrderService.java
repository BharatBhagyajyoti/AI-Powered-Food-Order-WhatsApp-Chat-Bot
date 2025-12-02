package com.chatBot.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.chatBot.config.GoogleApiConfig;
import com.chatBot.dto.OrderDTO;
import com.chatBot.dto.OrderItemDTO;
import com.chatBot.model.MenuItem;
import com.chatBot.model.Order;
import com.chatBot.model.OrderItem;
import com.chatBot.repository.MenuItemRepository;
import com.chatBot.repository.OrderItemRepository;
import com.chatBot.repository.OrderRepository;

import jakarta.transaction.Transactional;

@Service
public class OrderService {

    private final GoogleApiConfig googleApiConfig;
    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderItemRepository orderItemRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final WhatsAppNotificationService notificationService; // Avoids circular dependency

    // ⭐ REFACTORED: Constructor Injection for all dependencies
    public OrderService(
            GoogleApiConfig googleApiConfig,
            OrderRepository orderRepository,
            MenuItemRepository menuItemRepository,
            OrderItemRepository orderItemRepository,
            SimpMessagingTemplate messagingTemplate,
            WhatsAppNotificationService notificationService) {
        this.googleApiConfig = googleApiConfig;
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.orderItemRepository = orderItemRepository;
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
    }

    /**
     * Saves a new order in the database.
     */
    @Transactional
    public Order saveOrder(String customerName, String userPhone, String paymentMode, Map<String, Integer> sessionItems) {
        Order order = new Order();
        order.setCustomerName(customerName);
        order.setUserPhone(userPhone);
        order.setPaymentMode(paymentMode);
        order.setOrderTime(LocalDateTime.now());
        order.setStatus("PENDING"); // Payment status
        order.setOrderStatus("Pending"); // Restaurant order status

        order.setOrderItems(new ArrayList<>());

        double total = 0.0;

        for (Map.Entry<String, Integer> entry : sessionItems.entrySet()) {
            String itemName = entry.getKey();
            int quantity = entry.getValue();

            MenuItem menuItem = menuItemRepository.findByNameIgnoreCase(itemName)
                    .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemName));

            OrderItem orderItem = new OrderItem();
            orderItem.setMenuItem(menuItem);
            orderItem.setQuantity(quantity);
            orderItem.setOrder(order);

            order.getOrderItems().add(orderItem);

            total += menuItem.getPrice() * quantity;
        }

        order.setTotalPrice(total);
        Order savedOrder = orderRepository.save(order);

        // Broadcast new order to all connected clients with full DTO
        messagingTemplate.convertAndSend("/topic/orders", convertToDTO(savedOrder));

        return savedOrder;
    }

    @Transactional
    public Optional<Order> findMostRecentOrderByPhone(String userPhone) {
        return orderRepository.findTopByUserPhoneOrderByOrderTimeDesc(userPhone);
    }

    @Transactional
    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
    }

    @Transactional
    public Order updateOrder(Order order) {
        // This method is critical for persisting the Razorpay Payment Link ID
        return orderRepository.save(order);
    }

    /**
     * Fetch all orders excluding those whose payment failed.
     */
    @Transactional
    public List<Order> getAllOrders() {
        return orderRepository.findAll().stream()
                .filter(order -> !"PAYMENT_FAILED".equalsIgnoreCase(order.getStatus())) // Exclude failed payments
                .toList();
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        String currentStatus = order.getOrderStatus();
        String customerName = order.getCustomerName();
        String customerPhone = order.getUserPhone();
        boolean isCancelled = false; 

        // Prevent cancelling delivered orders
        if ("Delivered".equalsIgnoreCase(currentStatus) && "Cancelled".equalsIgnoreCase(newStatus)) {
            throw new RuntimeException("Cannot cancel a delivered order");
        }

        // Normalize status names for consistency
        switch (newStatus.toLowerCase()) {
            case "accepted":
                order.setOrderStatus("Accepted");
                break;
            case "preparing":
                order.setOrderStatus("Preparing");
                break;
            case "completed":
                order.setOrderStatus("Completed");
                break;
            case "delivered":
                order.setOrderStatus("Delivered");

                // Auto-confirm payment if it was still pending
                if ("PENDING".equalsIgnoreCase(order.getStatus())) {
                    order.setStatus("CONFIRMED");
                }
                break;
            case "cancelled":
                // NORMALIZE to canonical "Cancelled" value used by the system
                order.setOrderStatus("Cancelled");
                isCancelled = true; 
                break;
            default:
                throw new RuntimeException("Invalid order status: " + newStatus);
        }

        Order updated = orderRepository.save(order);

        // NEW LOGIC: Send WhatsApp message if the order was just cancelled by the restaurant
        if (isCancelled) {
            String cancellationMessage = String.format(
                "❌ Order #%d Cancelled ❌\n\nDear %s,\nWe regret to inform you that your order with ID #%d has been cancelled by the restaurant due to an unforeseen issue.\n\nWe apologize for the inconvenience and hope to serve you again soon! 🙏",
                updated.getId(), customerName, updated.getId());

            try {
                notificationService.sendMessage(customerPhone, cancellationMessage);
                System.out.println("WhatsApp: Sent cancellation message for Order ID " + updated.getId() + " to " + customerPhone);
            } catch (Exception e) {
                System.err.println("Failed to send cancellation WhatsApp message: " + e.getMessage());
            }
        }
        // END NEW LOGIC

        // Broadcast update for real-time UI
        messagingTemplate.convertAndSend("/topic/orders", convertToDTO(updated));

        return updated;
    }

    @Transactional
    public List<Map<String, Object>> getMonthlySummary() {
        List<Object[]> results = orderRepository.getMonthlySummary();
        List<Map<String, Object>> summary = new ArrayList<>();

        for (Object[] row : results) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("month", row[0]);
            map.put("orders", row[1]);
            map.put("revenue", row[2]);
            map.put("avgOrderValue", row[3]);
            map.put("cashPercent", row[4]);
            map.put("cardPercent", row[5]);
            map.put("upiPercent", row[6]);
            map.put("note", "Revenue excludes cancelled and failed orders. All payment modes split individually.");
            summary.add(map);
        }

        return summary;
    }

    @Transactional
    public String getAIInsights() {
        try {
            // FIX 1: Use the same filtering logic as the /analytics endpoint
            List<Order> allOrders = orderRepository.findAll().stream()
                    .filter(order -> !"PAYMENT_FAILED".equalsIgnoreCase(order.getStatus())
                              && !"FAILED".equalsIgnoreCase(order.getStatus()))
                    .collect(Collectors.toList());

            // ⭐ KEEPING THIS AS REQUESTED: Only use non-cancelled orders for statistics
            List<Order> validOrders = allOrders.stream()
                    .filter(order -> !"CANCELLED".equalsIgnoreCase(order.getOrderStatus()))
                    .collect(Collectors.toList());

            // FIX 2: Calculate all stats based on the "validOrders" list
            long totalOrders = validOrders.size();

            double totalRevenue = validOrders.stream()
                    .mapToDouble(Order::getTotalPrice)
                    .sum();

            // last week vs this week comparison
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime weekStart = now.minusDays(7);
            LocalDateTime lastWeekStart = now.minusDays(14);
            LocalDateTime lastWeekEnd = now.minusDays(7);

            double thisWeekRevenue = validOrders.stream() // Use validOrders
                    .filter(o -> o.getOrderTime().isAfter(weekStart))
                    .mapToDouble(Order::getTotalPrice)
                    .sum();

            double lastWeekRevenue = validOrders.stream() // Use validOrders
                    .filter(o -> o.getOrderTime().isAfter(lastWeekStart) && o.getOrderTime().isBefore(lastWeekEnd))
                    .mapToDouble(Order::getTotalPrice)
                    .sum();

            double percentChange = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;

            // FIX 3: Add logic for Top Item
            Map<String, Integer> itemCounts = new HashMap<>();
            validOrders.forEach(order -> {
                order.getOrderItems().forEach(item -> {
                    String itemName = item.getMenuItem().getName();
                    itemCounts.put(itemName, itemCounts.getOrDefault(itemName, 0) + item.getQuantity());
                });
            });

            String topItem = itemCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(1)
                .map(entry -> String.format("%s (with %d units sold)", entry.getKey(), entry.getValue()))
                .findFirst()
                .orElse("No items sold yet");

            // FIX 4: Update the prompt to include Top Item and a clearer context
            String prompt = String.format("""
                Analyze the restaurant’s performance data below. 
                'Total Orders' and 'Total Revenue' exclude cancelled and failed payments.
                Give 3 short, helpful insights (sales, trends, and top item).

                Total Orders: %d
                Total Revenue: ₹%.2f
                This Week Revenue: ₹%.2f
                Last Week Revenue: ₹%.2f
                Weekly Change: %.2f%%
                Top Selling Item: %s

                Format the response as:
                1. ...
                2. ...
                3. ...
                """, totalOrders, totalRevenue, thisWeekRevenue, lastWeekRevenue, percentChange, topItem);

            // 3. Call Gemini
            String apiKey = googleApiConfig.getApiKey();
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> content = Map.of("parts", List.of(textPart));
            Map<String, Object> body = Map.of("contents", List.of(content));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getBody() != null && response.getBody().containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                Map<String, Object> contentMap = (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                return parts.get(0).get("text").toString();
            }

        } catch (Exception e) {
            e.printStackTrace();
            return "⚠️ Failed to generate AI insights: " + e.getMessage();
        }

        return "⚠️ No insights available.";
    }

    /**
     * Used by the Dashboard/OrderHistory endpoints.
     * Returns ALL orders (except payment failed) so client can filter.
     */
    @Transactional
    public List<OrderDTO> getFilteredOrders() {
        return orderRepository.findAll().stream()
                .filter(order -> !"PAYMENT_FAILED".equalsIgnoreCase(order.getStatus())) // Exclude failed
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Converts entity to DTO including both paymentStatus and orderStatus.
     */
    private OrderDTO convertToDTO(Order order) {
        List<OrderItemDTO> items = order.getOrderItems().stream()
                .map(oi -> new OrderItemDTO(
                        oi.getId(),
                        oi.getMenuItem().getName(),
                        oi.getMenuItem().getPrice(),
                        oi.getQuantity()
                ))
                .toList();

        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setCustomerName(order.getCustomerName());
        dto.setUserPhone(order.getUserPhone());
        dto.setPaymentStatus(order.getStatus());     // Payment Status
        dto.setPaymentMode(order.getPaymentMode());
        dto.setOrderStatus(order.getOrderStatus());  // Order Status
        dto.setTotalPrice(order.getTotalPrice());
        dto.setOrderTime(order.getOrderTime());
        dto.setOrderItems(items);

        return dto;
    }
}