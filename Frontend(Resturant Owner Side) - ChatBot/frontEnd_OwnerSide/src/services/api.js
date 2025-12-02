// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:8080", // ✅ your backend URL
//   headers: { "Content-Type": "application/json" },
// });

// export default api;

import axios from "axios";

// Read backend URL from .env file
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,  
  headers: { "Content-Type": "application/json" },
});

export default API_BASE_URL;
export { api };
