package com.chatBot.model;


import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/*
 * This will keep track of whether the resturan is open or closed
 */

@Table
@Entity
@Data
public class RestaurantInfo {

    @Id
    private Long id = 1L;

    private boolean isOpen = true;

    // getters and setters
}
