package com.chatBot.service;

import org.json.JSONObject;

import org.springframework.stereotype.Service;

import com.chatBot.config.RazorpayConfig;
import com.razorpay.PaymentLink;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import java.util.Map;
import java.util.HashMap;

@Service
public class RazorpayService {

	private final String keyId;
	private final String keySecret;
	
	public RazorpayService(RazorpayConfig config)
	{
		this.keyId=config.getKeyId();
		this.keySecret=config.getKeySecret();
	}
	
	
	
	 /**
     * Creates a Razorpay payment link for a given order.
     *
     * @param orderId        - Internal order ID (used for dynamic receipt)
     * @param customerName   - Customer name
     * @param customerEmail  - Customer email
     * @param customerPhone  - Customer phone
     * @param amount         - Amount to be paid
     * @return Map containing "payment_link_id" and "short_url"
     * @throws RazorpayException
     */
	
	// ⭐ CRITICAL CHANGE: Return Map to include both ID and URL for saving/sending
	public Map<String, String> createPaymentLink(Long orderId,String customerName, String customerEmail, String customerPhone, Double amount) throws RazorpayException
	{
		RazorpayClient client= new RazorpayClient(keyId,keySecret);
		JSONObject request= new JSONObject();
		request.put("amount",(int)(amount*100)); // amount in paisa
		request.put("currency","INR");
		request.put("accept_partial", false);
		
		 JSONObject customer = new JSONObject();
	     customer.put("name", customerName);
	     customer.put("email", customerEmail);
	     customer.put("contact", customerPhone);
	     
	     request.put("customer", customer);
		
	     request.put("notify", new JSONObject().put("sms", true).put("email", true));

	     request.put("reminder_enable", true);
	     request.put("reference_id", "order_refid_" + orderId);
		 request.put("notes", new JSONObject().put("order_type", "WhatsApp Bot").put("ResturantOrder_ID", "order_refid_" + orderId));
	     
	  // ✅ create returns PaymentLink object
	     PaymentLink paymentLink=client.paymentLink.create(request);
	     
	  // ✅ Convert to JSONObject
	     JSONObject response=paymentLink.toJson();
		
	     Map<String, String> result = new HashMap<>();
         result.put("payment_link_id", response.getString("id")); // ⭐ Capture the unique ID (plink_xxx)
         result.put("short_url", response.getString("short_url")); // Extract short_url field
         
	     return result;
	}
	
	
	public void cancelPaymentLink(String paymentLinkId) {
	    // If paymentLinkId is null (not saved in DB), just return
        if (paymentLinkId == null || paymentLinkId.trim().isEmpty()) {
            System.out.println("⚠️ Cannot cancel link: Razorpay Payment Link ID is missing.");
            return;
        }

	    try {
	        RazorpayClient client = new RazorpayClient(keyId, keySecret);
	        client.paymentLink.cancel(paymentLinkId);
	        System.out.println("✅ Payment link cancelled: " + paymentLinkId);
	    } catch (Exception e) {
	        e.printStackTrace();
	        System.out.println("⚠️ Error cancelling payment link: " + e.getMessage());
	    }
	}

	
	
}