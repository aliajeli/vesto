'use client';

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart,
} from 'recharts';
import { toFa, group } from '@/components/ui';

const PALETTE = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', '#8b5cf6', '#06b6d4', '#f472b6', '#84cc16', '#f97316'];

const toman = (rial) => Math.round(Number(rial || 0) / 10);

function compact(rial) {
  const t = toman(rial);
  if (Math.abs(t) >= 1e9) return toFa((t / 1e9).toFixed(1)) + ' میلیارد';
  if (Math.abs(t) >= 1e6) return toFa((t / 1e6).toFixed(1)) + ' م';
  if (Math.abs(t) >= 1e3) return toFa(Math.round(t / 1e3)) + ' هـ';
  return toFa(group(t));
}

const axisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 10 },
  axisLine: { stroke: 'var(--border)' },
  tickLine: false,
};

function TooltipBox({ active, payload, label, money = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 shadow-theme text-xs" style={{ minWidth: 150 }}>
      <p className="font-extrabold mb-2 pb-2 border-b border-line">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
              {p.name}
            </span>
            <span className="font-extrabold tabular">
              {money ? `${toFa(group(toman(p.value)))} ت` : toFa(group(p.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children, height = 300, className = '' }) {
  return (
    <div className={`card p-4 md:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div dir="ltr" style={{ width: '100%', height }}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------- نمودار درآمد */

export function RevenueChart({ data, keys = ['revenue'], names = { revenue: 'درآمد' }, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.42} />
              <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={20} />
        <YAxis {...axisProps} tickFormatter={compact} width={58} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            name={names[k] || k}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2.2}
            fill={`url(#grad-${k})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------- ستونی */

export function BarsChart({ data, xKey = 'label', keys = ['value'], names = {}, money = true, horizontal = false, stacked = false }) {
  const fmt = money ? compact : (v) => toFa(v);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={horizontal ? { top: 5, right: 16, left: 5, bottom: 5 } : { top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={horizontal} horizontal={!horizontal} />
        <XAxis
          {...axisProps}
          type={horizontal ? 'number' : 'category'}
          dataKey={horizontal ? undefined : xKey}
          tickFormatter={horizontal ? fmt : undefined}
          interval={horizontal ? undefined : 'preserveStartEnd'}
          height={horizontal ? 30 : 24}
        />
        <YAxis
          {...axisProps}
          type={horizontal ? 'category' : 'number'}
          dataKey={horizontal ? xKey : undefined}
          tickFormatter={horizontal ? undefined : fmt}
          width={horizontal ? 110 : money ? 58 : 38}
        />
        <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: 'var(--primary-soft)' }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={names[k] || k}
            fill={PALETTE[i % PALETTE.length]}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            stackId={stacked ? 'a' : undefined}
            maxBarSize={horizontal ? 24 : 46}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------- دایره‌ای */

export function DonutChart({ data, money = true, nameKey = 'name', dataKey = 'value' }) {
  const total = data.reduce((s, d) => s + (d[dataKey] || 0), 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          startAngle={90}
          endAngle={-270}
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          isAnimationActive={false}
          stroke="var(--surface)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0];
            const pct = total ? Math.round((p.value / total) * 1000) / 10 : 0;
            return (
              <div className="card p-3 shadow-theme text-xs">
                <p className="font-extrabold mb-1">{p.name}</p>
                <p className="tabular text-muted">
                  {money ? `${toFa(group(toman(p.value)))} تومان` : toFa(group(p.value))} — ٪{toFa(pct)}
                </p>
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => <span style={{ color: 'var(--text-muted)' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------- ترکیبی */

export function ComboChart({ data, barKey, lineKey, barName, lineName, money = true }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={20} />
        <YAxis yAxisId="l" {...axisProps} tickFormatter={compact} width={58} />
        <YAxis yAxisId="r" orientation="left" {...axisProps} tickFormatter={(v) => toFa(v)} width={34} />
        <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: 'var(--primary-soft)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar yAxisId="l" dataKey={barKey} name={barName} fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40} />
        <Line yAxisId="r" type="monotone" dataKey={lineKey} name={lineName} stroke="var(--accent)" strokeWidth={2.4} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------- رادار */

export function RadarChartView({ data, dataKey = 'value', nameKey = 'name' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey={nameKey} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
        <PolarRadiusAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} stroke="var(--border)" />
        <Radar dataKey={dataKey} stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} strokeWidth={2} />
        <Tooltip content={<TooltipBox money={false} />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------- خطی ساده */

export function SimpleLine({ data, keys = ['value'], names = {}, money = true }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={20} />
        <YAxis {...axisProps} tickFormatter={money ? compact : (v) => toFa(v)} width={money ? 58 : 38} />
        <Tooltip content={<TooltipBox money={money} />} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
        {keys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} name={names[k] || k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export { PALETTE };
