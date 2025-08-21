import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/courses(.*)',
  '/events(.*)',
  '/public-resources(.*)',
  '/private-resources(.*)',
  '/api/private-(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Normalize accidental space URLs like "/private resources" -> "/private-resources"
  const url = new URL(req.url)
  // Normalize common mistakes: spaces or %20 in "private resources" / "public resources"
  const normalizedPath = url.pathname
    .replace(/private(?:%20|\s)+resources/gi, 'private-resources')
    .replace(/public(?:%20|\s)+resources/gi, 'public-resources')
    // Normalize underscores to hyphens
    .replace(/^\/private_resources\b/i, '/private-resources')
    .replace(/^\/public_resources\b/i, '/public-resources')

  if (normalizedPath !== url.pathname) {
    url.pathname = normalizedPath
    return NextResponse.redirect(url)
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 