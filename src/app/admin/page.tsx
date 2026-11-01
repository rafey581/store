import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { getDashboardStats } from "@/server/dashboard";
import { expireDueOrders } from "@/server/orders";
import { PageHeader } from "@/components/admin/page-header";
import { formatPKR } from "@/lib/money";
import { formatDate, orderLabel } from "@/lib/utils";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { badgeCls, cardCls } from "@/components/ui/styles";
import { Banknote, TrendingUp, CalendarDays, ShoppingCart, BadgeCheck, Truck, Clock, AlertTriangle, Radio, Eye, Users, type LucideIcon } from "lucide-react";

const TONES = {
  green: "bg-brand-50 text-brand-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
} as const;

function Stat({ label, value, sub, href, alert, icon: Icon, tone = "slate" }: { label: string; value: string | number; sub?: string; href?: string; alert?: boolean; icon: LucideIcon; tone?: keyof typeof TONES }) {
  const inner = (
    <div className={`${cardCls} h-full p-5 transition hover:shadow-[var(--shadow-lift)] ${alert ? "ring-2 ring-amber-300" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}><Icon size={18} /></span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  await expireDueOrders(50);
  const s = await getDashboardStats();
  const max = Math.max(1, ...s.chart.map((c) => c.revenuePaisa));
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name || user.email}.`} />
      {sp.denied && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">You do not have permission to open that page.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Banknote} tone="green" label="Sales today" value={formatPKR(s.sales.todayPaisa)} sub={`${s.sales.todayCount} paid orders`} />
        <Stat icon={TrendingUp} tone="green" label="Last 7 days" value={formatPKR(s.sales.last7Paisa)} sub={`${s.sales.last7Count} paid orders`} />
        <Stat icon={CalendarDays} tone="green" label="Last 30 days" value={formatPKR(s.sales.last30Paisa)} sub={`${s.sales.last30Count} paid orders`} />
        <Stat icon={ShoppingCart} tone="blue" label="Orders today" value={s.ordersToday} sub="all statuses" href="/admin/orders" />
        <Stat icon={BadgeCheck} tone="amber" label="Pending proofs" value={s.pendingProofs} href="/admin/proofs" alert={s.pendingProofs > 0} />
        <Stat icon={Truck} tone="violet" label="To ship" value={s.toShip} sub="paid / processing" href="/admin/orders?status=TO_SHIP" alert={s.toShip > 0} />
        <Stat icon={Clock} tone="slate" label="Awaiting payment" value={s.pendingPayment} href="/admin/orders?status=PENDING_PAYMENT" />
        <Stat icon={AlertTriangle} tone="rose" label="Low stock variants" value={s.lowStock.length} href="/admin/products?status=LOW" alert={s.lowStock.length > 0} />
        <Stat icon={Radio} tone="green" label="Live visitors" value={s.visitors.live} sub="active in last 5 min" />
        <Stat icon={Eye} tone="blue" label="Visitors today" value={s.visitors.today} sub={`${s.visitors.pageViewsToday} page views`} />
        <Stat icon={Users} tone="slate" label="Total visitors" value={s.visitors.total.toLocaleString("en-PK")} sub="unique browsers" />
      </div>

      <section className={`${cardCls} p-5`}>
        <h2 className="mb-4 font-semibold">Paid sales, last 14 days</h2>
        <div className="flex h-40 items-end gap-1">
          {s.chart.map((c) => (
            <div key={c.date} className="group relative flex flex-1 flex-col items-center justify-end">
              <div className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${Math.max(2, (c.revenuePaisa / max) * 100)}%` }} title={`${c.date}: ${formatPKR(c.revenuePaisa)}, ${c.orders} orders, ${c.visitors} visitors`} />
              <span className="mt-1 hidden text-[10px] text-gray-500 sm:block">{c.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${cardCls} p-5`}>
          <h2 className="mb-3 font-semibold">Recent orders</h2>
          <ul className="divide-y text-sm">
            {s.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">{orderLabel(o.number)}</Link>
                <span className="flex-1 truncate">{o.customerName}</span>
                <span className={`${badgeCls} ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                <span className="w-24 text-right">{formatPKR(o.totalPaisa)}</span>
              </li>
            ))}
            {s.recentOrders.length === 0 && <li className="py-2 text-gray-500">No orders yet.</li>}
          </ul>
        </section>
        <section className={`${cardCls} p-5`}>
          <h2 className="mb-3 font-semibold">Low stock</h2>
          <ul className="divide-y text-sm">
            {s.lowStock.map((v) => (
              <li key={v.id} className="flex justify-between gap-2 py-2">
                <Link href={`/admin/products/${v.productId}`} className="truncate hover:text-brand-700">{v.productName}{v.title !== "Default" ? ` (${v.title})` : ""}</Link>
                <span className={v.stock === 0 ? "font-semibold text-red-600" : "font-semibold text-amber-700"}>{v.stock}</span>
              </li>
            ))}
            {s.lowStock.length === 0 && <li className="py-2 text-gray-500">All good.</li>}
          </ul>
        </section>
      </div>
      <p className="text-xs text-gray-400">Generated {formatDate(new Date())}</p>
    </div>
  );
}
