'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BreadcrumbOverride {
  label: string
}

export default function Breadcrumbs({ override }: { override?: BreadcrumbOverride }) {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    invoices: 'Invoices',
    clients: 'Clients',
    profile: 'Profile',
    settings: 'Settings',
    new: 'New',
    edit: 'Edit',
    view: 'Details',
  }

  if (segments.length <= 1) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const isLast = i === segments.length - 1
    let label = labels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)

    if (isLast && override?.label) {
      label = override.label
    }

    return { href, label, isLast }
  })

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-4">
      <Link href="/dashboard" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {crumb.isLast ? (
            <span className="text-gray-800 dark:text-gray-100 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
