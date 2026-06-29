'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
// and never blocks the initial dashboard paint.
export default function RevenueChart({ data, grid, text, tooltipBg, tooltipBorder, bar }: Props) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
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
      </ResponsiveContainer>
    </div>
  )
}
