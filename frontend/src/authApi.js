// for login/register
import axios from "axios";

const authApi = axios.create({
  baseURL: "https://127.0.0.1:8000",
});

export default authApi;