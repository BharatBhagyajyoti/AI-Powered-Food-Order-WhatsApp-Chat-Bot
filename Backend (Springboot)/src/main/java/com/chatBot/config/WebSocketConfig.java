package com.chatBot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	// Configure message broker for handling messages
	// Server will use this to route messages
	//The prefix "/topic" is for broadcasting messages to multiple clients
	//The prefix "/app" is for messages sent from clients to the server
	//This setup allows for real-time communication between clients and the server.
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic"); // Broadcast messages
        config.setApplicationDestinationPrefixes("/app"); // For client→server messages
    }

    //The endpoint for WebSocket connections
    // Clients will use this to connect to the WebSocket server
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS(); // Fallback support
    }
}
