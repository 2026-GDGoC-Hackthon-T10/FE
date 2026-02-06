import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
    withCredentials: false,
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
    },
});


export default api;
