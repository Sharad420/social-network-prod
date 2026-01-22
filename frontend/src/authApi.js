// for login/register
import axios from "axios";


const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const authApi = axios.create({
  baseURL: API_BASE,
});

export default authApi;