import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Minus } from "lucide-react"

interface BillItem {
  _id: string
  name: string
  quantity: number
  price: number
}

interface BillData {
  restaurant: {
    name: string
    address: string
  }
  table: string
  items: BillItem[]
}

interface BillReviewProps {
  billData: BillData
  selectedItems: string[]
  selectedQuantities: { [key: string]: number }
  onItemToggle: (itemId: string) => void
  onQuantityChange: (itemId: string, quantity: number) => void
  subtotal: number
}

export function BillReview({
  billData,
  selectedItems,
  selectedQuantities,
  onItemToggle,
  onQuantityChange,
  subtotal
}: BillReviewProps) {
  const handleQuantityChange = (itemId: string, change: number) => {
    const currentQuantity = selectedQuantities[itemId] || 0
    const item = billData.items.find(item => item._id === itemId)
    const maxQuantity = item?.quantity || 0
    const newQuantity = Math.max(0, Math.min(maxQuantity, currentQuantity + change))
    onQuantityChange(itemId, newQuantity)
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center py-3">
        <CardTitle className="text-lg font-bold">
          {billData.restaurant.name}
        </CardTitle>
        <p className="text-sm text-gray-600 mb-3">Table {billData.table}</p>
        <div className="flex items-center justify-between mb-3">
        </div>
        <div className="flex items-center p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center flex-1">
            <div className="w-5 h-5 mr-2"></div>
            <div className="text-sm font-semibold text-gray-700">Item</div>
          </div>
          <div className="text-sm font-semibold text-gray-700 text-center w-20 flex items-center justify-center">Quantity</div>
          <div className="text-sm font-semibold text-gray-700 text-right w-20">Price</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4">
        {billData.items.map((item) => {
          const selectedQuantity = selectedQuantities[item._id] || 0
          const isSelected = selectedItems.includes(item._id)

          return (
            <div key={item._id} className="p-2 border rounded-lg">
              <div className="flex items-center">
                <div className="flex items-center flex-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onItemToggle(item._id)}
                    className="mr-2"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center w-20">
                  <span className="text-sm text-gray-600 font-medium">x{item.quantity}</span>
                </div>
                <div className="text-right w-20">
                  <p className="font-bold text-sm">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="mt-2 pt-2 border-t flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item._id, -1)}
                      disabled={selectedQuantity <= 0}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-bold text-sm">
                      x{selectedQuantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item._id, 1)}
                      disabled={selectedQuantity >= item.quantity}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-bold text-blue-600 text-sm">
                    ${(item.price * selectedQuantity).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        <Separator />

        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <p className="text-base font-bold">Subtotal</p>
          <p className="text-base font-bold text-blue-600">
            ${subtotal.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}