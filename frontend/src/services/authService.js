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

export async function forgotPassword({ email }) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword({ email, otp, newPassword }) {
  const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
  return data;
}

