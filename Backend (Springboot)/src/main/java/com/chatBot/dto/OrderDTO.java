package com.chatBot.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderDTO {

    private Long id;
    private String customerName;
    private String userPhone;

    private String paymentStatus;   // From order.status (PENDING, CONFIRMED, FAILED)
    private String paymentMode;     // Cash / UPI / Card
    private String orderStatus;     // Restaurant order status (Pending, Accepted, Preparing, Completed, Delivered)

    private Double totalPrice;
    private LocalDateTime orderTime;

    private List<OrderItemDTO> orderItems;

    // ✅ Convenience constructor (for previous references without orderStatus)
    public OrderDTO(Long id, String customerName, String userPhone,
                    String paymentStatus, String paymentMode,
                    Double totalPrice, LocalDateTime orderTime,
                    List<OrderItemDTO> orderItems) {
        this.id = id;
        this.customerName = customerName;
        this.userPhone = userPhone;
        this.paymentStatus = paymentStatus;
        this.paymentMode = paymentMode;
        this.totalPrice = totalPrice;
        this.orderTime = orderTime;
        this.orderItems = orderItems;
        this.orderStatus = "Pending"; // default if not explicitly provided
    }
}
