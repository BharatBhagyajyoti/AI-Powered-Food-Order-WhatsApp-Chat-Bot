package com.chatBot.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chatBot.service.WhatsAppService;

@RestController
public class WhatsAppController {
	private final WhatsAppService whatsAppService;
	private static final String VERIFY_TOKEN = "AI-chatBot-secret-token-07";

	//Initializing the fènal field via constructor
	public WhatsAppController(WhatsAppService whatsAppService)
	{
		this.whatsAppService=whatsAppService;
	}
	
	
	 // Webhook for receiving messages
	/*
	  * A webhook is a way for an app to provide other applications with real-time information.
	  * In this case, WhatsApp will send an HTTP POST request to this endpoint whenever a new message is received by your WhatsApp Business number.
	  * This allows your application to react immediately to incoming messages.
	  */
	@PostMapping("/webhook")
	public ResponseEntity<String> receiveMessage(@RequestBody Map<String, Object> payload)
	{
		System.out.println("<---Incoming WhatsApp message: " + payload);
		whatsAppService.handleIncomingMessage(payload);
		return ResponseEntity.ok("EVENT_RECEIVED");
	}
	
	// Verification endpoint for WhatsApp Cloud API
    @GetMapping("/webhook")
    public ResponseEntity<String> verifyWebhook(@RequestParam("hub.mode") String mode, 
    											@RequestParam("hub.verify_token") String token, 
    											@RequestParam("hub.challenge")String challenge)
    {
    	
    	System.out.println("--->Sending WhatsApp message: ");
    	if(VERIFY_TOKEN.equals(token))
    	{
    		return ResponseEntity.ok(challenge);
    	}
    	else {
    		return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification failed");
    	}
    }
	
}
