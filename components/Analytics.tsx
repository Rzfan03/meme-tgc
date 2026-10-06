'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'
export function Analytics() {
  useEffect(() => { const k = process.env.NEXT_PUBLIC_POSTHOG_KEY; if (k) posthog.init(k, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com' }) }, [])
  return null
}
