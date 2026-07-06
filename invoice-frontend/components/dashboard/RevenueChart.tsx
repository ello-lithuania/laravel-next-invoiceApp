'use client'
import { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Props {
  data: Array<{ label: string; total: number; count: number }>
  grid: string
  text: string
  tooltipBg: string
  tooltipBorder: string
  bar: string
}

// Split out so the heavy recharts/d3 bundle is lazy-loaded (next/dynamic, ssr:false)
// and never blocks the initial dashboard paint. We measure the container ourselves
// (instead of ResponsiveContainer) and only render the chart once it has a real
// width — this avoids recharts' "width(-1) height(-1)" warning on first paint.
export default function RevenueChart({ data, grid, text, tooltipBg, tooltipBorder, bar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const height = 320

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="h-80 w-full">
      {width > 0 && (
        <BarChart width={width} height={height} data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="label" stroke={text} fontSize={12} />
          <YAxis stroke={text} fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatCurrency(value), 'Amount']}
          />
          <Bar dataKey="total" name="Amount" fill={bar} radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </div>
  )
}
