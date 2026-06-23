import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ordersApi } from '@/services/orders'
import { customersApi } from '@/services/customers'
import { productsApi } from '@/services/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Plus, Eye, Trash2, Loader2, ShoppingCart, X } from 'lucide-react'
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

const STATUS_VARIANTS = { Pending: 'warning', Completed: 'success', Cancelled: 'destructive' }

function CreateOrderForm({ onSuccess, onClose }) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }])
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => customersApi.getAll({ size: 100 }) })
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.getAll({ size: 100 }) })

  const mutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Order created', variant: 'success' })
      onSuccess()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const addItem = () => setItems([...items, { product_id: '', quantity: 1 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, value) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: value }
    setItems(next)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!customerId) return setError('Please select a customer')
    const validItems = items.filter(it => it.product_id)
    if (!validItems.length) return setError('Add at least one product')
    mutation.mutate({ customer_id: customerId, items: validItems.map(it => ({ product_id: it.product_id, quantity: parseInt(it.quantity) })) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Customer *</Label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
          <SelectContent>
            {customers?.items?.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.email})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add</Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1">
              <Select value={item.product_id} onValueChange={(v) => updateItem(i, 'product_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>
                  {products?.items?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} (stock: {p.quantity_in_stock})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input type="number" min="1" className="w-20" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Order
        </Button>
      </div>
    </form>
  )
}

export default function Orders() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, statusFilter }],
    queryFn: () => ordersApi.getAll({ page, size: 10, status: statusFilter || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: ordersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Order deleted and stock restored' })
    },
    onError: (err) => toast({ title: getErrorMessage(err), variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage customer orders</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}</div>
          ) : data?.items?.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Items</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {data?.items?.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</td>
                      <td className="py-3 px-2 font-medium">{o.customer?.full_name ?? '—'}</td>
                      <td className="py-3 px-2 text-right">{o.item_count ?? o.items?.length ?? 0}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(o.total_amount)}</td>
                      <td className="py-3 px-2"><Badge variant={STATUS_VARIANTS[o.status]}>{o.status}</Badge></td>
                      <td className="py-3 px-2 text-muted-foreground">{formatDate(o.created_at)}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/orders/${o.id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete order?</AlertDialogTitle>
                                <AlertDialogDescription>Stock will be restored if the order was not cancelled.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Order</DialogTitle></DialogHeader>
          <CreateOrderForm onSuccess={() => setDialogOpen(false)} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
