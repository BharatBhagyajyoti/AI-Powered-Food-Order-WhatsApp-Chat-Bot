package com.chatBot.model;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "orders")
public class Order {
	
//	@Id
//	@GeneratedValue(strategy = GenerationType.IDENTITY)
	
	 @Id
	 @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "order_seq")
	 @SequenceGenerator(name = "order_seq", sequenceName = "ORDER_SEQ", allocationSize = 1)
	private Long id;
	
	@Column(name = "customer_name", nullable = false)
	private String customerName;
	
	@Column(name = "user_phone", nullable = false)
	private String userPhone;
	
	@Column(name = "status") //Payment status
	private String status="PENDING"; //PENDING, CONFIRMED, PAYMENT_FAILED
	
	@Column(name = "payment_mode")
	private String paymentMode;
	
	 @Column(name = "total_price")
	private Double totalPrice;
	
	@Column(name = "order_time")
	private LocalDateTime orderTime;
	
	@Column(name = "order_status")
	private String orderStatus = "Pending"; //ACCEPTED.PENDING, COMPLETED, CANCELLED, PREPARING, DELIVERED

	@Column(name = "razorpay_payment_id")
	private String razorpayPaymentId;

	
	@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
	@JsonManagedReference
	private List<OrderItem>orderItems;
	/*
	 * 1. @OneToMany

It tells JPA that one Order can have many OrderItems.

This defines the one-to-many relationship between Order and OrderItem.

2. mappedBy = "order"

This indicates that the OrderItem entity owns the relationship via its order field.

In other words:

OrderItem has a field:

@ManyToOne
@JoinColumn(name = "order_id")
private Order order;


That order field is the foreign key reference in the database.

So, mappedBy tells JPA: “Don’t create a new foreign key in Order table; use the one in OrderItem.”
	 */

}
