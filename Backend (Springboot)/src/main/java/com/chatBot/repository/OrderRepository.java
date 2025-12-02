package com.chatBot.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.chatBot.model.Order;

public interface OrderRepository extends JpaRepository<Order, Long> {

	Optional<Order> findTopByUserPhoneOrderByOrderTimeDesc(String userPhone);

	
	
    // ✅ Fetch all orders to display in dashboard: Cash OR confirmed online payments
    @Query("SELECT o FROM Order o WHERE o.paymentMode = 'Cash' OR (o.paymentMode <> 'Cash' AND o.status = 'CONFIRMED')")
    List<Order> findAllDisplayOrders();

    // ✅ Fetch orders with items
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.orderItems oi " +
           "LEFT JOIN FETCH oi.menuItem mi " +
           "WHERE o.paymentMode = 'Cash' " +
           "   OR (o.paymentMode <> 'Cash' AND o.status = 'CONFIRMED')")
    List<Order> findFilteredOrdersWithItems();

    // ✅ Count Cash orders (excluding cancelled)
    @Query("SELECT COUNT(o) FROM Order o WHERE o.paymentMode = 'Cash' AND o.orderStatus <> 'Cancelled'")
    long countCashOrders();

    // ✅ Count confirmed online orders (excluding cancelled)
    @Query("SELECT COUNT(o) FROM Order o WHERE o.paymentMode <> 'Cash' AND o.status = 'CONFIRMED' AND o.orderStatus <> 'Cancelled'")
    long countConfirmedOnlineOrders();

    // ✅ Sum totalPrice of Cash orders excluding cancelled
    @Query("SELECT COALESCE(SUM(o.totalPrice), 0) FROM Order o WHERE o.paymentMode = 'Cash' AND o.orderStatus <> 'Cancelled'")
    Double sumCashOrders();

    // ✅ Sum totalPrice of confirmed online payments excluding cancelled
    @Query("SELECT COALESCE(SUM(o.totalPrice), 0) FROM Order o WHERE o.paymentMode <> 'Cash' AND o.status = 'CONFIRMED' AND o.orderStatus <> 'Cancelled'")
    Double sumConfirmedOnlineOrders();

    // ✅ Monthly summary (already excludes cancelled)
    @Query("""
    	    SELECT 
    	        TO_CHAR(o.orderTime, 'Mon YYYY') AS month,
    	        COUNT(o.id) AS totalOrders,
    	        SUM(o.totalPrice) AS totalRevenue,
    	        ROUND(AVG(o.totalPrice), 2) AS avgOrderValue,
    	        ROUND(100.0 * SUM(CASE WHEN UPPER(o.paymentMode) = 'CASH' THEN 1 ELSE 0 END) / COUNT(o.id), 1) AS cashPercent,
    	        ROUND(100.0 * SUM(CASE WHEN UPPER(o.paymentMode) = 'CARD' THEN 1 ELSE 0 END) / COUNT(o.id), 1) AS cardPercent,
    	        ROUND(100.0 * SUM(CASE WHEN UPPER(o.paymentMode) = 'UPI'  THEN 1 ELSE 0 END) / COUNT(o.id), 1) AS upiPercent
    	        
    	    FROM Order o
    	    WHERE UPPER(o.orderStatus) IN ('DELIVERED', 'PENDING', 'PREPARING', 'ACCEPTED', 'COMPLETED')
    	      AND UPPER(o.status) <> 'PAYMENT_FAILED'
    	      AND UPPER(o.orderStatus) <> 'CANCELLED'
    	    GROUP BY TO_CHAR(o.orderTime, 'Mon YYYY')
    	    ORDER BY MIN(o.orderTime)
    	""")
    	List<Object[]> getMonthlySummary();
    	
    	
    	/**
    	 * Fetch valid orders for analytics (Revenue, Payment Split, Summary)
    	 * Excludes PAYMENT_FAILED always.
    	 * If :start is NULL → returns ALL valid orders.
    	 */
    	@Query("""
    	    SELECT o FROM Order o
    	    WHERE UPPER(o.status) <> 'PAYMENT_FAILED'
    	      AND (:start IS NULL OR o.orderTime >= :start)
    	""")
    	List<Order> findValidOrdersAfter(@Param("start") LocalDateTime start);


    	/**
    	 * Fetch valid orders + ORDER ITEMS + MENU ITEMS for Popular Items chart.
    	 * Uses JOIN FETCH to prevent N+1 queries.
    	 */
    	@Query("""
    	    SELECT DISTINCT o FROM Order o
    	    LEFT JOIN FETCH o.orderItems oi
    	    LEFT JOIN FETCH oi.menuItem mi
    	    WHERE UPPER(o.status) <> 'PAYMENT_FAILED'
    	      AND (:start IS NULL OR o.orderTime >= :start)
    	""")
    	List<Order> findValidOrdersWithItemsAfter(@Param("start") LocalDateTime start);


    	/**
    	 * Orders for status distribution (Delivered / Pending / Cancelled)
    	 * Includes CANCELLED orders, excludes PAYMENT_FAILED.
    	 */
    	@Query("""
    	    SELECT o FROM Order o
    	    WHERE UPPER(o.status) <> 'PAYMENT_FAILED'
    	      AND (:start IS NULL OR o.orderTime >= :start)
    	""")
    	List<Order> findOrdersForStatusAfter(@Param("start") LocalDateTime start);



}
