package com.chatBot.repository;

import java.util.List;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chatBot.model.MenuItem;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

	 List<MenuItem> findByAvailableTrue();
	 Optional<MenuItem> findByNameIgnoreCase(String name);
}
