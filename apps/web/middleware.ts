import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const ADMIN_ROLES = new Set(['staff', 'admin', 'owner'])

const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/error',
  '/auth/callback',
])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })
      .limit(1)
      .single()

    if (roleError || !roleData) {
      return NextResponse.redirect(new URL('/auth/error?code=NO_ROLE', req.url))
    }

    if (!ADMIN_ROLES.has(roleData.role)) {
      console.warn('[middleware] Unauthorized access attempt', {
        userId:   session.user.id,
        role:     roleData.role,
        path:     pathname,
        ip:       req.headers.get('x-forwarded-for'),
      })

      return NextResponse.redirect(new URL('/auth/error?code=FORBIDDEN', req.url))
    }

    const routePermissions: Record<string, Set<string>> = {
      '/dashboard/system':   new Set(['admin', 'owner']),
      '/dashboard/roles':    new Set(['owner']),
      '/dashboard/finance':  new Set(['admin', 'owner']),
      '/dashboard/staff':    new Set(['admin', 'owner']),
    }

    for (const [route, allowedRoles] of Object.entries(routePermissions)) {
      if (pathname.startsWith(route) && !allowedRoles.has(roleData.role)) {
        return NextResponse.redirect(new URL('/dashboard?error=INSUFFICIENT_PERMISSIONS', req.url))
      }
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id',   session.user.id)
    requestHeaders.set('x-user-role', roleData.role)

    return NextResponse.next({
      request: { headers: requestHeaders },
    })

  } catch (error) {
    console.error('[middleware] Unexpected error:', error)
    return NextResponse.redirect(new URL('/auth/error?code=MIDDLEWARE_ERROR', req.url))
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/admin/:path*',
  ],
}