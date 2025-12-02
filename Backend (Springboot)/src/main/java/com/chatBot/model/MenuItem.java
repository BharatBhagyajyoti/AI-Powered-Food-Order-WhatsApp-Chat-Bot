package com.chatBot.model;

import jakarta.persistence.Column;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * MenuItem entity representing a menu item in the restaurant.
 * If the table is not present, it will be created automatically with the class name.
 */
@Entity
@Table(name = "menu_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MenuItem {
	
	@Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "menu_seq")
    @SequenceGenerator(name = "menu_seq", sequenceName = "menu_seq", allocationSize = 1)	
	private Long id;
	
	@Column(nullable = false)
	private String name;
	
	@Column(length = 1000)
	private String description;
	
	@Column(nullable = false)
	private Double price;
	
	@Column(nullable = false)
	private boolean available;

}
