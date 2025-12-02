package com.chatBot.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.chatBot.model.MenuItem;
import com.chatBot.repository.MenuItemRepository;

@RestController
@RequestMapping("/api/menu")
@CrossOrigin(origins = "*")
public class MenuItemController {

    @Autowired
    private MenuItemRepository menuItemRepository;

    // ✅ Get all menu items
    @GetMapping
    public ResponseEntity<List<MenuItem>> getAllItems() {
        return ResponseEntity.ok(menuItemRepository.findAll());
    }

    // ✅ Add new menu item
    @PostMapping
    public ResponseEntity<MenuItem> addItem(@RequestBody MenuItem item) {
//        item.setId(null);
        return ResponseEntity.ok(menuItemRepository.save(item));
    }

    // ✅ Update an existing menu item
    @PutMapping("/{id}")
    public ResponseEntity<MenuItem> updateItem(@PathVariable Long id, @RequestBody MenuItem updatedItem) {
        return menuItemRepository.findById(id)
            .map(existing -> {
                existing.setName(updatedItem.getName());
                existing.setDescription(updatedItem.getDescription());
                existing.setPrice(updatedItem.getPrice());
                existing.setAvailable(updatedItem.isAvailable());
                return ResponseEntity.ok(menuItemRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ✅ Delete item
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteItem(@PathVariable Long id) {
        if (menuItemRepository.existsById(id)) {
            menuItemRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Item deleted successfully"));
        }
        return ResponseEntity.status(404).body(Map.of("error", "Item not found"));
    }

    // ✅ Toggle availability
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<MenuItem> toggleAvailability(@PathVariable Long id) {
        return menuItemRepository.findById(id)
            .map(item -> {
                item.setAvailable(!item.isAvailable());
                return ResponseEntity.ok(menuItemRepository.save(item));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
