import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ROLES = new Set(['staff', 'admin', 'owner'])

const PUBLIC_ROUTES = new Set([
  '/auth/login',
  '/auth/error',
  '/auth/callback',
  '/unauthorized',
])

const RESTRICTED_ROUTES: Record<string, Set<string>> = {
  '/dashboard/staff':  new Set(['admin', 'owner']),
  '/dashboard/audit':  new Set(['admin', 'owner']),
  '/dashboard/system': new Set(['owner']),
  '/dashboard/finance': new Set(['admin', 'owner']),
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('role', [...ADMIN_ROLES])
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (roleError || !roleData) {
    console.warn(JSON.stringify({
      level:    'WARN',
      event:    'UNAUTHORIZED_DASHBOARD_ACCESS',
      user_id:  user.id,
      email:    user.email,
      path:     pathname,
      ip:       request.headers.get('x-forwarded-for') ?? 'unknown',
      ua:       request.headers.get('user-agent') ?? 'unknown',
      ts:       new Date().toISOString(),
    }))

    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  const userRole = roleData.role

  for (const [restrictedPath, allowedRoles] of Object.entries(RESTRICTED_ROUTES)) {
    if (pathname.startsWith(restrictedPath)) {
      if (!allowedRoles.has(userRole)) {
        const dashboardUrl = new URL('/dashboard', request.url)
        dashboardUrl.searchParams.set('error', 'INSUFFICIENT_PERMISSIONS')
        dashboardUrl.searchParams.set('required', restrictedPath)
        return NextResponse.redirect(dashboardUrl)
      }
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id',    user.id)
  requestHeaders.set('x-user-role',  userRole)
  requestHeaders.set('x-user-email', user.email ?? '')

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/login',
  ],
}