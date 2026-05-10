export async function login(
  email: string,
  password: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
    {
      method: 'POST',

      credentials: 'include',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        email,
        password,
      }),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(
      data.error || 'Erro ao fazer login'
    )
  }

  return data
}