package com.chatBot.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.Data;

@Data
public class UserSession {
    private String name;
    private List<String> orderedItems = new ArrayList<>();
    private List<Double> prices = new ArrayList<>();
    private String payment;
    private Double total = 0.0;
    private Long orderId; // To store the order ID once created
 // 🔹 Added flag to track duplicate confirmation fix
    private boolean paymentConfirmed = false;
    
    // To track last active time for session timeout management
    private LocalDateTime lastActiveTime = LocalDateTime.now();

    
    // Track quantity for each item (key: item name, value: quantity)
    private Map<String, Integer> orderQuantityMap = new HashMap<>();

    public boolean isPaymentConfirmed() { return paymentConfirmed; }
    
    // Update the last active time to current time
    public void updateActivityTime() {
        this.lastActiveTime = LocalDateTime.now();
    }
    
    
    

}
