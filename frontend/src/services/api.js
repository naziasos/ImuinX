// src/services/api.js
// Thin axios wrapper. Points at the SAME backend the rest of the app already
// uses (http://localhost:5000/api) — no backend routes or logic touched.
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Turns any axios/fetch-style error into a friendly, displayable string.
export function errorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message === 'Network Error') return 'Could not connect to server.';
  if (err?.message) return err.message;
  return 'Something went wrong. Please try again.';
}
