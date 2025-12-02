# 🍽️ AI-Powered Food Order WhatsApp Chatbot

A full-stack restaurant automation system that allows customers to place food orders via **WhatsApp**, with AI-assisted responses, payment integration, and a real-time admin dashboard. Built using **React.js**, **Spring Boot**, **Oracle/MySQL Database**, **Gemini AI**, **Razorpay**, and **WebSockets**.

---

## 📦 Tech Stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React.js (Vite), Tailwind CSS, Recharts, STOMP.js |
| Backend      | Spring Boot, Spring Data JPA, WebSocket, RestTemplate |
| Database     | Oracle SQL / MySQL |
| AI / LLM     | Google Gemini API |
| Payments     | Razorpay Payment Links + Webhooks |
| Realtime     | WebSocket (STOMP + SockJS) |

---

## ✨ Features

- 🤖 AI-powered WhatsApp chatbot for food ordering  
- 🍛 View menu, choose items, quantities, and payment method  
- 🔁 Intelligent conversational flow with multi-step state management  
- 🧠 Gemini AI for natural responses + business insights  
- 💳 Razorpay dynamic payment link generation  
- 🛠️ Payment confirmation via webhook (success & failure handling)  
- 📡 Real-time admin dashboard (WebSocket live updates)  
- 🔔 New order sound alerts + toast notifications  
- 📊 Analytics: revenue, order count, payment split, popular items  
- 📂 Menu management (add / edit / delete / toggle availability)  
- 📄 CSV export for finance & order reports  

---

## 🚀 Setup Instructions

### 🔧 Backend (Spring Boot + Oracle/MySQL)

1. Clone the repository:
   ```bash
   git clone https://github.com/BharatBhagyajyoti/AI-Powered-Food-Order-WhatsApp-Chat-Bot.git
   cd AI-Powered-WhatsApp-ChatBot/backend
   ```

2. Configure database in `application.properties`:
   ```properties
   spring.datasource.url=jdbc:oracle:thin:@localhost:1521:xe
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   # or MySQL
   # spring.datasource.url=jdbc:mysql://localhost:3306/restaurantdb
   ```

3. Add your API keys:
   ```properties
   whatsapp.phoneNumberId=your_phone_number_id
   whatsapp.accessToken=your_whatsapp_access_token

   razorpay.key_id=your_key_id
   razorpay.key_secret=your_key_secret

   google.api.key=your_gemini_api_key
   ```

4. Run the backend:
   ```bash
   mvn spring-boot:run
   ```

5. Expose backend publicly (required for WhatsApp & Razorpay):
   ```bash
   ngrok http 8080
   ```

---

### 💻 Frontend (React + Vite)

1. Navigate to the frontend:
   ```bash
   cd ../Frontend(Resturant Owner Side) - ChatBot
   cd frontEnd_OwnerSide
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## 🔒 Why Custom Implementation Instead of Low-Code Tools?

This system demonstrates full-stack engineering with:

- End-to-end custom control  
- Scalable backend architecture  
- Flexible API integrations (WhatsApp, Gemini, Razorpay)  
- Better performance and freedom than n8n / Zapier workflows  

---

## 🧠 AI Behavior Notes

- Gemini responds only within defined restaurant rules  
- AI never hallucinates menu items  
- Conversation states ensure controlled ordering flow  
- AI insights use real revenue, popularity, and history data  

---

## 📂 Project Structure

```
├── backend/
│   ├── controller/
│   ├── service/
│   ├── model/
│   ├── repository/
│   ├── config/
│   └── application.properties
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── charts/
│   ├── websocket/
│   └── App.jsx
```

---

## 🧪 Future Improvements

- Admin authentication (Spring Security)  
- Multi-branch restaurant support  
- WhatsApp template messages (media/images)  
- Delivery partner tracking integration  
- Mobile app version for admins  

---

## 🙏 Acknowledgements

- WhatsApp Cloud API  
- Google Gemini  
- Razorpay Developer APIs  
- Spring Boot  
- React.js  

---

