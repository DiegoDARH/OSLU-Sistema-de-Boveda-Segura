import { redirect } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/auth'

export default async function RootPage() {
  const session = await getSessionFromCookies()
  redirect(session ? '/dashboard' : '/login')
}
