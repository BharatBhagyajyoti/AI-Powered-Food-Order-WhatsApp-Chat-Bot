package com.chatBot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chatBot.model.RestaurantInfo;
import com.chatBot.repository.RestaurantRepository;

@Service
public class RestaurantService {

    @Autowired
    private RestaurantRepository repo;

    // Toggle restaurant open/closed status
    public void setRestaurantStatus(boolean status) {
        RestaurantInfo info = repo.findById(1L).orElse(new RestaurantInfo());
        info.setOpen(status);
        repo.save(info);
    }

    // Get current restaurant status
    public boolean getRestaurantStatus() {
        RestaurantInfo info = repo.findById(1L).orElse(new RestaurantInfo());
        return info.isOpen();
    }
}
