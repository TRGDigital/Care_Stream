'use client'

// Extracted from the dashboard so recharts (~90KB) is lazy-loaded via next/dynamic
// only when the Overview tab is shown, instead of in the initial dashboard bundle.
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

export default function QueryVolumeChart({ data, days }: { data: any[]; days: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={d => {
            const dt = new Date(d)
            return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          }}
          interval={days <= 7 ? 0 : days <= 30 ? 4 : 9}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          labelFormatter={d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          formatter={(value: any, name: any) => [value, name === 'chat' ? 'Chat' : name === 'voice' ? 'Voice' : 'Email']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={name => name === 'chat' ? 'Chat' : name === 'voice' ? 'Voice' : 'Email'}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
        <Line type="monotone" dataKey="chat"     stroke="#0d9488" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="voice"    stroke="#9333ea" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="email"    stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
