package com.chatBot.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chatBot.service.RestaurantService;

@RestController
@RequestMapping("/restaurant")
public class RestaurantController {

    @Autowired
    private RestaurantService restauranService;

    @PostMapping("/toggle")
    public ResponseEntity<String> toggleRestaurant(@RequestParam boolean open) {
    	restauranService.setRestaurantStatus(open);
        return ResponseEntity.ok(open ? "Restaurant opened" : "Restaurant closed");
    }

    @GetMapping("/status")
    public boolean isRestaurantOpen() {
        return restauranService.getRestaurantStatus();
    }
}

