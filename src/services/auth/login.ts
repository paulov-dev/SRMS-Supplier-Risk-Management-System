import { apiFetch } from "../api"

export async function login(email: string, password: string) {
  return await apiFetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ email, password }),
  })
}