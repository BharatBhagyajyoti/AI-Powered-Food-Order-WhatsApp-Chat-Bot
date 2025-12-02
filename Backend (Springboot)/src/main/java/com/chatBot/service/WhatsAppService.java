package com.chatBot.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.chatBot.config.GoogleApiConfig;
import com.chatBot.model.MenuItem;
import com.chatBot.model.Order;
import com.chatBot.model.UserSession;
import com.chatBot.repository.MenuItemRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class WhatsAppService {

    private final GoogleApiConfig googleApiConfig;

    public WhatsAppService(GoogleApiConfig googleApiConfig) {
        this.googleApiConfig = googleApiConfig;
    }

    @Value("${whatsapp.phoneNumberId}")
    private String phoneNumberId;

    @Value("${whatsapp.accessToken}")
    private String accessToken;

    @Autowired
    private MenuItemRepository menuItemRepository;

    // Change from direct field injection to setter injection
    private OrderService orderService;
    
    @Autowired
    public void setOrderService(OrderService orderService) {
        this.orderService = orderService;
    }

    @Autowired
    private RazorpayService razorpayService;

    @Autowired
    private RestaurantService restaurantService;   // ADDED: injected restaurant service to check open/closed

    // Stores all user sessions for active users (each user = one UserSession object)
    private Map<String, UserSession> userSessions = new ConcurrentHashMap<>();

    // To track conversation state per user (phone number)
    // Example states: INIT, ASK_NAME, TAKE_ORDER, ASK_PAYMENT
    private Map<String, String> userStates = new HashMap<>();

    // To store user data during the conversation - Not used much, can be removed if session is sufficient
    private Map<String, Map<String, String>> userData = new HashMap<>();

    private RestTemplate restTemplate = new RestTemplate();
    
    // ⏱️ Scheduled cleanup of inactive sessions every 1 minute
    {
        Thread cleaner = new Thread(() -> {
            while (true) {
                try {
                    LocalDateTime now = LocalDateTime.now();
                    userSessions.entrySet().removeIf(entry -> {
                        UserSession s = entry.getValue();
                        boolean expired = s.getLastActiveTime().isBefore(now.minusMinutes(10)); // 10-minute timeout
                        if (expired) {
                            userStates.remove(entry.getKey());
                            // Optional: Notify user when session expires due to inactivity
                            sendMessage(entry.getKey(),
                                    "⌛ Your session has expired due to inactivity. Type *Order* to start again.");
                            System.out.println("🕒 Session expired for user: " + entry.getKey());
                        }
                        return expired;
                    });
                    Thread.sleep(60_000); // check every 1 minute
                } catch (Exception ignored) {
                }
            }
        });
        cleaner.setDaemon(true);
        cleaner.start();
    }

    /*
	  * RestTemplate is a Spring class used to send HTTP requests and receive HTTP responses from another server.
	  *It lets your Spring Boot application act like a client calling APIs.
	  */

    public void sendMessage(String toPhone, String messageText) {
    	
    	 /*
		  * This is the WhatsApp Cloud API endpoint provided by Meta (Facebook).
		  *It’s used to send messages from your WhatsApp Business account (or sandbox test number) to a user.
		  * The {phone-number-id} is a unique identifier for your WhatsApp Business phone number.
		  * You get this ID when you set up your WhatsApp Business account and link a phone number to it.
		  * 
		  * The structure is:
https://graph.facebook.com/<API_VERSION>/<PHONE_NUMBER_ID>/messages
Where:
<API_VERSION> → version of the Graph API you’re using, e.g., v17.0
<PHONE_NUMBER_ID> → your WhatsApp bot number’s ID (the “From” number)
/messages → endpoint to send a message
		  * 
		  */

    	
        String url = "https://graph.facebook.com/v17.0/" + phoneNumberId + "/messages";

        //Creates a container for HTTP headers.HTTP headers carry metadata for the request, like authorization and content type.
        HttpHeaders headers = new HttpHeaders();
        
      //Sets Authorization header using Bearer token. WhatsApp Cloud API requires an access token to verify that your bot is allowed to send messages.
        headers.setBearerAuth(accessToken);
        
      //Tells the API that we are sending JSON data in the request body. WhatsApp Cloud API expects message data as JSON.
        headers.setContentType(MediaType.APPLICATION_JSON);

        
      //This builds the actual message body we send to WhatsApp.
        /*
          * "messaging_product": "whatsapp" → API knows this is a WhatsApp message.
        		"to": toPhone → Recipient phone number (user who sent the message).
        		"type": "text" → Type of message (text, image, etc.).
        		"text": {"body": messageText} → The actual text content of the message.
          */

        
        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", toPhone,
                "type", "text",
                "text", Map.of("body", messageText));

        // The HttpEntity must be defined before use! 
      //Wrapping Payload + Headers into an HttpEntity object.
        /*HttpEntity bundles:
        		 Body → the JSON payload
        		 Headers → Authorization & Content-Type
        		 This is what RestTemplate sends as a full HTTP request.
        */

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        // NOTE: In a production environment, you should add proper error handling for the API call
        // Sending POST request to WhatsApp Cloud API to send the message
        restTemplate.postForEntity(url, request, String.class);
    }

    // Friendly closed message helper. This is used in multiple places to inform users when the restaurant is closed.
    private void sendRestaurantClosedMessage(String userPhone) {
        sendMessage(userPhone,
            "❌ The restaurant is currently closed.\n" +
            "⏳ Please come back during our working hours.\n" +
            "Thank you for your understanding! 😊");
    }

    // Prevent mid-order continuation when restaurant closes
    private boolean blockIfClosedDuringFlow(String userPhone) {
        try {
            boolean isOpen = restaurantService.getRestaurantStatus();
            if (!isOpen) {
                sendRestaurantClosedMessage(userPhone);
                userSessions.remove(userPhone);
                userStates.remove(userPhone);
                return true; // Stop here
            }
        } catch (Exception ignored) {}
        return false;
    }

    /*
     * This method handles every incoming message from WhatsApp webhook.
     */
    public void handleIncomingMessage(Map<String, Object> payload) {
        String userPhone = null; 
        try {
            // Extraction of userPhone and message text
            List<Map<String, Object>> entry = (List<Map<String, Object>>) payload.get("entry");
            List<Map<String, Object>> changes = (List<Map<String, Object>>) entry.get(0).get("changes");
            Map<String, Object> value = (Map<String, Object>) changes.get(0).get("value");
            List<Map<String, Object>> messages = (List<Map<String, Object>>) value.get("messages");
            if (messages == null || messages.isEmpty())
                return;

            Map<String, Object> message = messages.get(0);
            userPhone = (String) message.get("from"); // ⭐ Extracted here for error handling
            String text = ((Map<String, Object>) message.get("text")).get("body").toString().trim();
            String lowerText = text.toLowerCase();

            // Block starting an order if restaurant is closed
            try {
                boolean isOpen = restaurantService.getRestaurantStatus();
                if (!isOpen && lowerText.contains("order")) {
                    sendRestaurantClosedMessage(userPhone);
                    return;
                }
            } catch (Exception e) {
                System.err.println("Warning: Failed to check restaurant status: " + e.getMessage());
            }

            // Update last active time for existing user session
            UserSession activeSession = userSessions.get(userPhone);
            if (activeSession != null) {
                activeSession.updateActivityTime(); // refresh session activity timestamp
            }

            userData.putIfAbsent(userPhone, new HashMap<>());
            String state = userStates.getOrDefault(userPhone, "INIT");

            System.out.println("🔍 User: " + userPhone + " | State: " + state + " | Message: " + text);

            // Check Order Status - Ask for Order ID
            if (lowerText.contains("status") || lowerText.contains("track") || lowerText.contains("where is my order")) {
                
                String orderIdStr = null;
                // Use regex for robust ID extraction
                Pattern pattern = Pattern.compile("(\\d+)"); 
                Matcher matcher = pattern.matcher(text);

                if (matcher.find()) {
                    orderIdStr = matcher.group(1); 
                }
                
                if (orderIdStr != null) {
                    // User provided Order ID - fetch that specific order
                    try {
                        Long orderId = Long.parseLong(orderIdStr);
                        Order order = orderService.getOrderById(orderId);
                        
                        // Verify the order belongs to this user
                        if (!order.getUserPhone().equals(userPhone)) {
                            sendMessage(userPhone, 
                                "❌ Order #" + orderId + " not found for your number.\n\n" +
                                "Please check your Order ID and try again.");
                            return;
                        }
                        
                        String orderStatus = order.getOrderStatus();
                        String paymentStatus = order.getStatus();
                        
                        StringBuilder statusMsg = new StringBuilder("📦 *Order Status*\n\n");
                        statusMsg.append("Order ID: *#").append(order.getId()).append("*\n");
                        statusMsg.append("Customer: ").append(order.getCustomerName()).append("\n");
                        statusMsg.append("Total: ₹").append(order.getTotalPrice()).append("\n");
                        statusMsg.append("Payment: ").append(paymentStatus).append("\n");
                        statusMsg.append("Status: *").append(orderStatus).append("*\n\n");
                        
                        // Add status-specific message
                        switch (orderStatus.toLowerCase()) {
                            case "pending":
                                statusMsg.append("⏳ Your order is waiting to be confirmed by the restaurant.");
                                break;
                            case "accepted":
                                statusMsg.append("✅ Your order has been accepted! We're preparing it now.");
                                break;
                            case "preparing":
                                statusMsg.append("👨‍🍳 Your delicious meal is being prepared!");
                                break;
                            case "completed":
                                statusMsg.append("✅ Your order is ready!");
                                break;
                            case "delivered":
                                statusMsg.append("🎉 Your order has been delivered! Enjoy your meal!");
                                break;
                            case "cancelled":
                                statusMsg.append("❌ Your order was cancelled.");
                                break;
                            default:
                                statusMsg.append("📋 Order is being processed.");
                        }
                        
                        sendMessage(userPhone, statusMsg.toString());
                        return;
                        
                    } catch (Exception e) {
                        sendMessage(userPhone, 
                            "❌ Order #" + orderIdStr + " not found.\n\n" +
                            "Please check your Order ID and try again.");
                        return;
                    }
                } else {
                    // No Order ID provided - ask for it
                    sendMessage(userPhone, 
                        "🔍 *Track Your Order*\n\n" +
                        "Please provide your Order ID to track your order.\n\n" +
                        "📝 Example:\n" +
                        "• Type: *status 123*\n" +
                        "• Or: *track #123*\n\n" +
                        "You can find your Order ID in the confirmation message we sent when you placed the order.");
                    return;
                }
            }

            // Cancel logic (in-progress vs confirmed orders)
            if (lowerText.equals("cancel")) {
                UserSession session = userSessions.get(userPhone);

                // Case 1️: User has an active in-progress order session (not yet placed)
                if (session != null && userStates.containsKey(userPhone) && !state.equals("INIT")) {
                    userSessions.remove(userPhone);
                    userStates.remove(userPhone);
                    sendMessage(userPhone,
                            "❌ Your current order has been cancelled.\nYou can start again anytime by typing *Order*.");
                    return;
                }

                // Case 2️: Order already placed - check if restaurant has accepted it
                Optional<Order> lastOrder = orderService.findMostRecentOrderByPhone(userPhone);
                if (lastOrder.isPresent()) {
                    Order order = lastOrder.get();
                    String orderStatus = order.getOrderStatus();
                    
                    // If order is still Pending, customer can cancel
                    if ("Pending".equalsIgnoreCase(orderStatus)) {
                        try {
                            // ⭐ BUG FIX 1: Revoke Payment Link if payment mode was online AND payment is PENDING
                            if (("UPI".equalsIgnoreCase(order.getPaymentMode()) || "Card".equalsIgnoreCase(order.getPaymentMode())) && 
                                "PENDING".equalsIgnoreCase(order.getStatus())) {
                                
                                // Fetch the saved ID from the Order entity and revoke the link
                                // NOTE: Order.razorpayPaymentId stores the Razorpay Payment Link ID (plink_xxx)
                                razorpayService.cancelPaymentLink(order.getRazorpayPaymentId());
                                System.out.println("Successfully attempted to revoke payment link for Order ID: " + order.getId());
                            }

                            // Cancel the order in database. 
                            // The OrderService will detect the status change and send the branded notification.
                            orderService.updateOrderStatus(order.getId(), "Cancelled");
                            
                            // ⭐ FINAL FIX: Only send a minimal confirmation message here, to avoid duplication 
                            // with the detailed branded message sent by the OrderService.
                            sendMessage(userPhone,
                                "✅ Your order #" + order.getId() + " has been marked cancelled.\n" +
                                "You can place a new order anytime by typing *Order*. 😊");
                            
                        } catch (Exception e) {
                            sendMessage(userPhone,
                                "❌ Failed to cancel order. Please contact the restaurant.\n" +
                                "📞 Contact no.: +91-9999900000");
                        }
                    } 
                    // Simplified check: If it's not Pending and not already Cancelled, it's processing.
                    else if (!"Cancelled".equalsIgnoreCase(orderStatus)) { 
                        sendMessage(userPhone,
                            "⚠️ Your order #" + order.getId() + " is already being processed by the restaurant.\n\n" +
                            "Status: *" + orderStatus + "*\n\n" +
                            "Please contact us directly to cancel:\n" +
                            "📞 Contact no.: +91-9999900000\n\n" +
                            "Thank you for your understanding! 🙏");
                    }
                    // If already cancelled
                    else { // Only other possibility is "Cancelled"
                        sendMessage(userPhone,
                            "ℹ️ Your order #" + order.getId() + " is already cancelled.\n\n" +
                            "Type *Order* to place a new order! 😊");
                    }
                } else {
                    sendMessage(userPhone,
                        "No active order found to cancel.\n" +
                        "You can start a new one by typing *Order*.");
                }
                return;
            }

            // ------------------------ STATE MACHINE ------------------------
            switch (state) {

                // ------------------- INIT STATE -------------------
                case "INIT":
                    // Only exact "order" keyword starts ordering, everything else goes to AI
                    if (lowerText.equals("order")) {
                        
                        // Handle previous PAYMENT_FAILED state and CLEANUP
                        // The link is revoked only if the user chooses to start a new order after failure.
                        Optional<Order> lastOrder = orderService.findMostRecentOrderByPhone(userPhone);
                        if (lastOrder.isPresent() && "PAYMENT_FAILED".equalsIgnoreCase(lastOrder.get().getStatus())) {
                            
                            Order failedOrder = lastOrder.get();
                            
                            // 1. REVOKE THE ACTIVE LINK BEFORE PROCEEDING
                            if ("UPI".equalsIgnoreCase(failedOrder.getPaymentMode()) || "Card".equalsIgnoreCase(failedOrder.getPaymentMode())) {
                                try {
                                    // Use the stored Payment Link ID to cancel the link on Razorpay's end
                                    razorpayService.cancelPaymentLink(failedOrder.getRazorpayPaymentId());
                                    System.out.println("CRITICAL FIX: Revoked active Razorpay link for failed Order ID: " + failedOrder.getId());
                                } catch (Exception e) {
                                    System.err.println("Warning: Failed to cancel Razorpay link during failed payment cleanup: " + e.getMessage());
                                }
                            }
                            
                            // 2. MARK THE ORDER INTERNALLY AS CANCELLED (Cleanup database record)
                            try {
                                // Update Order status to internally mark it as Cancelled/Finished
                                failedOrder.setOrderStatus("Cancelled");
                                // Keep the Payment Status as PAYMENT_FAILED for analytics/tracking history
                                orderService.updateOrder(failedOrder); 
                                System.out.println("DB Updated: Failed Order ID: " + failedOrder.getId() + " marked Cancelled.");
                            } catch (Exception ignored) {
                                // Silently ignore database save error, but the link cancellation attempt was made.
                            }
                            
                            // 3. Send restart prompt (UX fix)
                            sendMessage(userPhone,
                                "⚠️ We see your last online payment for order *#" + failedOrder.getId() + "* failed.\n" +
                                "We are starting a new order now. You can choose *Cash* or try *UPI/Card* again.\n\n" +
                                "May I know your name?");
                            userStates.put(userPhone, "ASK_NAME");
                            return; 
                        }
                        
                        // --- START NORMAL ORDER FLOW ---
                        try {
                            if (!restaurantService.getRestaurantStatus()) {
                                sendRestaurantClosedMessage(userPhone);
                                return;
                            }
                        } catch (Exception e) {
                            System.err.println("Warning: Failed to check restaurant status inside INIT: " + e.getMessage());
                        }

                        sendMessage(userPhone, "Hello! Welcome to *The Craving*! 😊\n\nMay I know your name?");
                        userStates.put(userPhone, "ASK_NAME");
                    } else {
                        // Everything else (questions, menu inquiries, greetings) goes to AI
                        String aiReply = getGeminiAIResponse(text, userPhone);
                        sendMessage(userPhone, aiReply);
                    }
                    break;

                // ------------------- ASK_NAME STATE -------------------
                case "ASK_NAME":

                    if (blockIfClosedDuringFlow(userPhone)) return;

                    userSessions.putIfAbsent(userPhone, new UserSession());
                    UserSession session = userSessions.get(userPhone);
                    session.setName(text);
                    session.updateActivityTime(); 

                    List<MenuItem> menuItems = menuItemRepository.findByAvailableTrue();
                    if (menuItems.isEmpty()) {
                        sendMessage(userPhone, "Sorry, our menu is currently empty. Please check again later.");
                        userStates.remove(userPhone);
                        break;
                    }

                    StringBuilder menuText = new StringBuilder("Thanks " + text + "! Here's our menu:\n\n");
                    menuText.append(menuItems.stream()
                            .map(item -> "• " + item.getName() + " - ₹" + item.getPrice() + " (" + item.getDescription() + ")")
                            .collect(Collectors.joining("\n")));
                    menuText.append(
                            "\n\n👉 Please type the name of the item you want to order. You can also specify quantity like *'2<space>burger'*, but type one item in a single msg.\nType 'done' when finished.");

                    sendMessage(userPhone, menuText.toString());
                    userStates.put(userPhone, "TAKE_ORDER");
                    break;

                // ------------------- TAKE_ORDER STATE -------------------
                case "TAKE_ORDER":

                    if (blockIfClosedDuringFlow(userPhone)) return;

                    session = userSessions.get(userPhone);
                    if (session == null) {
                        sendMessage(userPhone, "Session expired. Please start again by typing 'Order'.");
                        userStates.remove(userPhone);
                        break;
                    }
                    session.updateActivityTime(); 

                    String requestedItem = text.trim();

                    if (requestedItem.equalsIgnoreCase("done") || requestedItem.equalsIgnoreCase("finish")) {
                        if (session.getOrderQuantityMap().isEmpty()) {
                            sendMessage(userPhone,
                                    "You haven't selected any items yet. Please choose at least one or type 'done' to cancel.");
                            break;
                        }

                        // Use stream to calculate total
                        double total = session.getOrderQuantityMap().entrySet().stream()
                                .mapToDouble(e -> {
                                    Optional<MenuItem> mi = menuItemRepository.findByNameIgnoreCase(e.getKey());
                                    return mi.map(menu -> menu.getPrice() * e.getValue()).orElse(0.0);
                                }).sum();
                        session.setTotal(total);

                        StringBuilder summary = new StringBuilder("🧾 Here's your order summary:\n");
                        session.getOrderQuantityMap().forEach((itemName, qty) -> {
                            Optional<MenuItem> item = menuItemRepository.findByNameIgnoreCase(itemName);
                            item.ifPresent(mi -> summary.append("• ").append(itemName).append(" x").append(qty)
                                    .append(" — ₹").append(mi.getPrice() * qty).append("\n"));
                        });
                        summary.append("\n💰 Total: ₹").append(total)
                                .append("\n\nHow would you like to pay? (Cash / UPI / Card)");

                        sendMessage(userPhone, summary.toString());
                        userStates.put(userPhone, "ASK_PAYMENT");
                        break;
                    }

                    String[] words = requestedItem.split("\\s+");
                    int quantity = 1;
                    String itemName = requestedItem;
                    try {
                        if (words.length > 1) {
                            if (words[0].matches("\\d+")) {
                                quantity = Integer.parseInt(words[0]);
                                itemName = String.join(" ", Arrays.copyOfRange(words, 1, words.length));
                            } else if (words[words.length - 1].matches("\\d+")) {
                                quantity = Integer.parseInt(words[words.length - 1]);
                                itemName = String.join(" ", Arrays.copyOfRange(words, 0, words.length - 1));
                            }
                        }
                    } catch (Exception e) {
                        quantity = 1;
                    }

                    Optional<MenuItem> selectedItemOpt = menuItemRepository.findByNameIgnoreCase(itemName);
                    if (selectedItemOpt.isEmpty() || !selectedItemOpt.get().isAvailable()) {
                        sendMessage(userPhone, "❌ Sorry, we don't have \"" + itemName
                                + "\" on the menu today. Please choose something else or type 'done' to finish.");
                        break;
                    }

                    MenuItem selectedItem = selectedItemOpt.get();
                    int newQty = session.getOrderQuantityMap().getOrDefault(selectedItem.getName(), 0) + quantity;
                    session.getOrderQuantityMap().put(selectedItem.getName(), newQty);

                    sendMessage(userPhone, "✅ Added " + selectedItem.getName() + " x" + quantity + " (₹"
                            + (selectedItem.getPrice() * quantity) + ") to your order.\n"
                            + "You can add more items or type 'done' to finish ordering.");
                    break;

                // ------------------- ASK_PAYMENT STATE -------------------
                case "ASK_PAYMENT":

                    if (blockIfClosedDuringFlow(userPhone)) return;

                    session = userSessions.get(userPhone);
                    if (session == null) {
                        sendMessage(userPhone, "Session expired. Please start again by typing 'Order'.");
                        userStates.remove(userPhone);
                        break;
                    }
                    session.updateActivityTime(); 

                    String paymentMethod = lowerText;
                    if (!(paymentMethod.equals("cash") || paymentMethod.equals("upi") || paymentMethod.equals("card"))) {
                        sendMessage(userPhone, "❌ Invalid payment method. Please choose Cash, UPI, or Card.");
                        break;
                    }
                    session.setPayment(paymentMethod.substring(0, 1).toUpperCase() + paymentMethod.substring(1));

                    // Use total calculated in TAKE_ORDER state
                    double total = session.getTotal();

                    if (paymentMethod.equals("cash")) {
                        Order order = orderService.saveOrder(session.getName(), userPhone, session.getPayment(),
                                session.getOrderQuantityMap());
                        System.out.println(">>>> Order saved successfully (Cash) ID: " + order.getId());

                        // Include Order ID in confirmation
                        StringBuilder confirmation = new StringBuilder("✅ *Order Confirmed!*\n\n");
                        confirmation.append("📝 Order ID: *#").append(order.getId()).append("*\n");
                        confirmation.append("👤 Customer: ").append(session.getName()).append("\n\n");
                        confirmation.append("🛒 *Your Order:*\n");
                        session.getOrderQuantityMap().forEach((itmName, qty) -> {
                            Optional<MenuItem> item = menuItemRepository.findByNameIgnoreCase(itmName);
                            item.ifPresent(mi -> confirmation.append("• ").append(itmName).append(" x").append(qty)
                                    .append(" — ₹").append(mi.getPrice() * qty).append("\n"));
                        });
                        confirmation.append("\n💰 Total: ₹").append(session.getTotal()).append("\n");
                        confirmation.append("💳 Payment: Cash\n\n");
                        confirmation.append("⏱️ Your meal will be ready soon! 🍽️\n\n");
                        confirmation.append("📍 Track your order anytime by typing:\n*status ").append(order.getId()).append("*");

                        sendMessage(userPhone, confirmation.toString());
                        userStates.remove(userPhone);
                        userSessions.remove(userPhone);
                        break;
                    }

                    sendMessage(userPhone,
                            "Please provide your email (optional). Type 'skip' to continue without email.");
                    userStates.put(userPhone, "ASK_EMAIL");
                    break;

                // ------------------- ASK_EMAIL STATE -------------------
                case "ASK_EMAIL":

                    if (blockIfClosedDuringFlow(userPhone)) return;

                    session = userSessions.get(userPhone);
                    if (session == null) {
                        sendMessage(userPhone, "Session expired. Please start again by typing 'Order'.");
                        userStates.remove(userPhone);
                        break;
                    }

                    String emailInput = text.trim();
                    String email = emailInput.equalsIgnoreCase("skip") ? null : emailInput;

                    try {
                        Order order = orderService.saveOrder(session.getName(), userPhone, session.getPayment(),
                                session.getOrderQuantityMap());
                        session.setOrderId(order.getId());
                        
                        // Capture link details (ID and URL) from updated RazorpayService
                        // Assumption: RazorpayService.createPaymentLink now returns Map<String, String> { "payment_link_id", "short_url" }
                        Map<String, String> linkDetails = razorpayService.createPaymentLink(order.getId(), session.getName(), email,
                                userPhone, session.getTotal());
                        
                        String paymentLinkId = linkDetails.get("payment_link_id");
                        String paymentShortUrl = linkDetails.get("short_url"); 

                        // Save the Link ID to the Order entity
                        // This ID is crucial for revoking the link later if the order is cancelled or payment fails and user restarts.
                        order.setRazorpayPaymentId(paymentLinkId); // Use the existing field name from Order.java
                        orderService.updateOrder(order); // Save the updated Order entity
                        
                        // Include Order ID in payment link message
                        StringBuilder paymentMsg = new StringBuilder("💳 *Payment Link Generated*\n\n");
                        paymentMsg.append("📝 Order ID: *#").append(order.getId()).append("*\n");
                        paymentMsg.append("💰 Amount: ₹").append(session.getTotal()).append("\n\n");
                        paymentMsg.append("🔗 Payment Link:\n").append(paymentShortUrl).append("\n\n"); // Use the extracted URL
                        paymentMsg.append("⚡ Please complete the payment to confirm your order.\n\n");
                        paymentMsg.append("📍 After payment, track your order by typing:\n*status ").append(order.getId()).append("*");

                        sendMessage(userPhone, paymentMsg.toString());

                    } catch (Exception e) {
                        sendMessage(userPhone, "⚠️ Sorry, failed to generate payment link. Please try again.");
                        e.printStackTrace();
                    }

                    // Always remove session after payment link/cash order is processed
                    // Payment tracking continues via Razorpay Webhooks and Order ID tracking.
                    userStates.remove(userPhone);
                    userSessions.remove(userPhone);
                    break;

                // ------------------- DEFAULT STATE -------------------
                default:
                    // Only use AI for INIT state, not during active ordering
                    if (state.equals("INIT")) {
                        String aiReply = getGeminiAIResponse(text, userPhone);
                        sendMessage(userPhone, aiReply);
                    } else {
                        // If somehow in unknown state, reset to INIT
                        userStates.remove(userPhone);
                        userSessions.remove(userPhone);
                        sendMessage(userPhone, 
                            "⚠️ Something went wrong. Please start again by typing *Order*.");
                    }
                    break;
            }

        } catch (Exception e) {
            e.printStackTrace();
            // Send error to user if possible
            if (userPhone != null) {
                 sendMessage(userPhone, "⚠️ Sorry, a system error occurred while processing your message. Please try again or type *Order* to restart. 🤕");
            }
        }
    }

    private String getGeminiAIResponse(String userMessage, String userPhone) {
        try {
            String apikey = googleApiConfig.getApiKey();
            System.out.println("---Connecting to Gemini AI...");

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="
                    + apikey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // FETCH REAL MENU from database
            List<MenuItem> availableItems = menuItemRepository.findByAvailableTrue();
            StringBuilder menuList = new StringBuilder();
            
            if (!availableItems.isEmpty()) {
                menuList.append("\n\nAVAILABLE MENU ITEMS:\n");
                for (MenuItem item : availableItems) {
                    menuList.append("- ").append(item.getName())
                           .append(" (₹").append(item.getPrice()).append(")\n");
                }
            } else {
                menuList.append("\n\nMenu is currently unavailable.");
            }

         // ENHANCED AI PROMPT: Give AI proper restaurant assistant context WITH REAL MENU
            String systemContext = """
                You are a friendly and professional restaurant assistant for "The Craving" on WhatsApp.So, Behave  accordingly.
                
                Your role is to help customers with:
                - Answering questions about the restaurant (working hours, menu, order status etc.)
                - Providing information about ordering process
                - Handling general food-related inquiries
                - Being warm, welcoming, and conversational like a real restaurant staff member

                
                CONVERSATION STYLE:
                - Talk naturally like a helpful staff member, not a robot
                - Keep responses SHORT (2-3 sentences max)
                - Use emojis naturally but sparingly
                - Answer questions directly without being repetitive
                - Always try to keep the conversation crisp and small
                - You are adding too many "*", just add that required , avoid unnecessary. Use bold only where necessary.
                
                CRITICAL RULES:
                Note : Keep the chat within 2000 tokens.
                1. ONLY mention items that are in the menu list below and give the menu category wise and in formatted text .
                2. If customer asks about an item NOT in the menu, say "Sorry, we don't have [item] today. Type 'Order' to see what's available!"
                3. If customer asks about items IN the menu, confirm briefly and tell them to type 'Order' to place an order
                4. For order status questions: Tell them to type 'status [Order ID]' (e.g., 'status 123') to track their order
                5. For off-topic questions (sports, politics, etc.): Polite redirect - "I'm here to help with food orders! 😊 Type 'Order' to get started."
                6. For location/hours/contact: Say "For more details, please type 'Order' to start ordering!"
                7. NEVER make up or assume menu items or order statuses - only use the info below
                8. Be conversational - vary your responses
                9. ALWAYS end by prompting the user to type 'Order' to start ordering and the text 'Order' should be in bold.
                10. Always follow WhatsApp messaging policies
                11. If the user ask to cancel the order during ordering, tell them to type 'Cancel'. If order is already confirmed, tell them to contact restaurant
                12. NEVER provide false information about the restaurant
                13. Always encourage the customer to type "Order" to start ordering
                14. When customer places order, they will receive an Order ID which they can use to track status
                15. Whenever you are mentioning the restaurant name , Make sure that the restaurant name should be bold for whatsapp formatting.
                

                
                Restaurant Info:
                - Name: The Craving
                - Specialty: Delicious food, quick service
                - Payment: Cash, UPI, Card
                - Order Tracking: Type 'status [Order ID]' (e.g., 'status 123') to track your order
                
                """ + menuList.toString() + """
                
                Now respond briefly and naturally to the customer's question based ONLY on the menu above.
                Remember: Only show full menu if customer specifically asks for it!
                """;

            String fullPrompt = systemContext + "\n\nCustomer: " + userMessage + "\n\nAssistant:";

            Map<String, Object> textPart = Map.of("text", fullPrompt);
            Map<String, Object> content = Collections.singletonMap("parts", Collections.singletonList(textPart));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", Collections.singletonList(content));
            requestBody.put("generationConfig",
                    Map.of("temperature", 0.8, "maxOutputTokens", 2000));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            System.out.println(">>> Gemini Request JSON: " + new ObjectMapper().writeValueAsString(requestBody));

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            System.out.println(">>> Gemini Raw Response: " + response);

            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> contentMap = (Map<String, Object>) firstCandidate.get("content");

                    if (contentMap != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");

                        if (parts != null && !parts.isEmpty() && parts.get(0).containsKey("text")) {
                            return (String) parts.get(0).get("text");
                        } else {
                            return "🤖 AI responded but didn't return any text (finishReason="
                                    + firstCandidate.get("finishReason") + ")";
                        }
                    }
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            return "🤖 AI is unavailable right now. Error: " + e.getMessage();
        }

        return "🤖 AI returned an empty or invalid response.";
    }

}