'use client'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { invoices } from '@/lib/api'

// Renders a sample invoice PDF for a given template. The PDF is fetched as a
// blob with the Authorization header (the auth token is never placed in the
// URL) and the iframe points at the resulting object URL, which is revoked on
// unmount / template change to avoid leaking memory.
export default function SamplePdfFrame({ template, className, style, title }: {
  template: string
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    invoices.samplePdfBlobUrl(template)
      .then(u => {
        if (active) { objectUrl = u; setUrl(u) }
        else URL.revokeObjectURL(u)
      })
      .catch(() => {})
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [template])

  if (!url) return <div className={className} style={style} aria-busy="true" />
  return <iframe src={url} className={className} style={style} title={title} />
}
