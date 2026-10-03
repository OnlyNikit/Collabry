import axios from "axios";

import { getActingAsId } from "../context/ActingAsContext";

const RAW_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: `${RAW_BASE_URL}/api`,
  withCredentials: true,
});

/*
  Delegated mode me har request par X-Acting-As jaata hai.
  Delegation management routes (/delegations) hamesha logged-in user
  ke naam par chalte hain, isliye unpe header nahi lagate.
*/
api.interceptors.request.use((config) => {
  const actingAsId = getActingAsId();

  const url = config.url || "";

  if (actingAsId && !url.startsWith("/delegations")) {
    config.headers = config.headers || {};
    config.headers["X-Acting-As"] = actingAsId;
  }

  return config;
});

export default api;