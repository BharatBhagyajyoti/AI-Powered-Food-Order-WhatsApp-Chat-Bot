package com.chatBot.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chatBot.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

}
