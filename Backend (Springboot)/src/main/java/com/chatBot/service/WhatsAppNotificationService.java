package com.chatBot.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class WhatsAppNotificationService {

    @Value("${whatsapp.phoneNumberId}")
    private String phoneNumberId;

    @Value("${whatsapp.accessToken}")
    private String accessToken;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 📩 Sends WhatsApp message (used only for restaurant → customer notifications)
     */
    public void sendMessage(String toPhone, String messageText) {

        String url = "https://graph.facebook.com/v17.0/" + phoneNumberId + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", toPhone,
                "type", "text",
                "text", Map.of("body", messageText)
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        restTemplate.postForEntity(url, request, String.class);
    }
}