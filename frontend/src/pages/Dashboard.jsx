import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, ShoppingCart, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#0f172a', '#374151', '#6b7280', '#9ca3af', '#d1d5db']

function StatCard({ title, value, icon: Icon, description, className }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${className}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="skeleton h-4 w-24" />
      </CardHeader>
      <CardContent>
        <div className="skeleton h-8 w-16" />
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.getStats })
  const { data: orderChart } = useQuery({ queryKey: ['order-chart'], queryFn: dashboardApi.getOrderChart })
  const { data: inventoryChart } = useQuery({ queryKey: ['inventory-chart'], queryFn: dashboardApi.getInventoryChart })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your inventory and orders</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard title="Total Products" value={stats?.total_products ?? 0} icon={Package} className="bg-blue-50 text-blue-600" />
            <StatCard title="Total Customers" value={stats?.total_customers ?? 0} icon={Users} className="bg-purple-50 text-purple-600" />
            <StatCard title="Total Orders" value={stats?.total_orders ?? 0} icon={ShoppingCart} className="bg-green-50 text-green-600" />
            <StatCard title="Low Stock" value={stats?.low_stock_products ?? 0} icon={AlertTriangle} className="bg-yellow-50 text-yellow-600" description="≤ 10 units" />
            <StatCard title="Inventory Value" value={formatCurrency(stats?.inventory_value ?? 0)} icon={DollarSign} className="bg-emerald-50 text-emerald-600" />
            <StatCard title="Pending Orders" value={stats?.pending_orders ?? 0} icon={TrendingUp} className="bg-orange-50 text-orange-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {!orderChart || orderChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No order data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={orderChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {!inventoryChart || inventoryChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No inventory data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={inventoryChart} dataKey="total_stock" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ category }) => category}>
                    {inventoryChart.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
