import axios from 'axios'

/** Shared API transport. Authenticated flows can opt into same-origin cookies. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 4_000,
})

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback
  }
  return fallback
}
