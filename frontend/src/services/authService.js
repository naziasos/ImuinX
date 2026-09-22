// src/services/authService.js
// Calls the EXISTING backend endpoints as-is (backend/routes/authRoutes.js is untouched).
import { api } from './api';

export async function register({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}
