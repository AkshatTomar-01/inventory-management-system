import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/services/orders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

const STATUS_VARIANTS = { Pending: 'warning', Completed: 'success', Cancelled: 'destructive' }

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
  })

  const statusMutation = useMutation({
    mutationFn: (status) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast({ title: 'Order status updated', variant: 'success' })
    },
    onError: (err) => toast({ title: getErrorMessage(err), variant: 'destructive' }),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-60 w-full" />
      </div>
    )
  }

  if (!order) return <p className="text-muted-foreground">Order not found.</p>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="text-muted-foreground text-xs font-mono mt-0.5">{order.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{order.customer?.full_name}</p>
            <p className="text-sm text-muted-foreground">{order.customer?.email}</p>
            {order.customer?.phone && <p className="text-sm text-muted-foreground">{order.customer.phone}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={STATUS_VARIANTS[order.status]}>{order.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{formatDate(order.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-muted-foreground shrink-0">Update status:</span>
              <Select
                value={order.status}
                onValueChange={(v) => statusMutation.mutate(v)}
                disabled={statusMutation.isPending || order.status === 'Cancelled'}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {statusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Order Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Product</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">SKU</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Unit Price</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2.5 px-2 font-medium">{item.product?.name ?? '—'}</td>
                  <td className="py-2.5 px-2 font-mono text-xs text-muted-foreground">{item.product?.sku ?? '—'}</td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2.5 px-2 text-right">{item.quantity}</td>
                  <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-3 px-2 text-right font-semibold">Total</td>
                <td className="py-3 px-2 text-right font-bold text-base">{formatCurrency(order.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
