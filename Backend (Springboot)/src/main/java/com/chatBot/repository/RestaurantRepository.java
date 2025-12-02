package com.chatBot.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.chatBot.model.RestaurantInfo;


@Repository
public interface RestaurantRepository extends JpaRepository<RestaurantInfo, Long> {
	
}
