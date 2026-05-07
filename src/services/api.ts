export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token")

  const headers = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    ...options.headers,
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Erro na requisição")
  }

  return data
}