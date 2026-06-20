import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title:     string
  value:     string | number
  subtitle?: string
  icon:      LucideIcon
  iconColor?: string
  iconBg?:   string
  trend?:    { value: number; positive: boolean }
  borderColor?: string
}

export default function StatsCard({
  title, value, subtitle, icon: Icon, iconColor = 'text-brand-500', iconBg = 'bg-brand-50', trend, borderColor = 'border-t-brand-500',
}: StatsCardProps) {
  return (
    <div className={cn('card card-hover border-t-4 group', borderColor)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-2', trend.positive ? 'text-status-active' : 'text-status-danger')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs. mes anterior
            </p>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105', iconBg, iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
