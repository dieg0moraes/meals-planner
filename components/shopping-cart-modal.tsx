"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "@/types/products"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ShoppingCartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  carts: ShoppingCart[]
}

export function ShoppingCartModal({ open, onOpenChange, carts }: ShoppingCartModalProps) {
  if (carts.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carritos de Compras por Tienda</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={carts[0]?.store} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${carts.length}, 1fr)` }}>
            {carts.map((cart) => (
              <TabsTrigger key={cart.store} value={cart.store}>
                {cart.storeName}
                <Badge variant="secondary" className="ml-2">
                  ${cart.total.toFixed(2)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {carts.map((cart) => (
            <TabsContent key={cart.store} value={cart.store} className="space-y-4">
              <div className="grid gap-3">
                {cart.items.map((item, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex gap-4">
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name || item.ingredient}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm text-muted-foreground">
                              {item.ingredient}
                            </p>
                            <h3 className="font-semibold">
                              {item.product.name}
                            </h3>
                            {item.product.brand && (
                              <p className="text-sm text-muted-foreground">
                                {item.product.brand}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Necesitas: {item.quantity} {item.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              ${item.product.priceNumeric?.toFixed(2) || item.product.price}
                            </p>
                          </div>
                        </div>
                        {item.product.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {item.product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total {cart.storeName}</p>
                    <p className="text-xs text-muted-foreground">{cart.items.length} productos</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    ${cart.total.toFixed(2)}
                  </p>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Comparación de Precios</h3>
          <div className="grid gap-2">
            {carts
              .sort((a, b) => a.total - b.total)
              .map((cart, idx) => (
                <div
                  key={cart.store}
                  className={`flex justify-between items-center p-2 rounded ${
                    idx === 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cart.storeName}</span>
                    {idx === 0 && (
                      <Badge variant="default" className="bg-green-600">
                        Más económico
                      </Badge>
                    )}
                  </div>
                  <span className="font-bold">${cart.total.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

