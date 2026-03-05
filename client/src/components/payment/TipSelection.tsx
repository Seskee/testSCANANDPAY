import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart } from "lucide-react"

interface TipSelectionProps {
  subtotal: number
  onTipChange: (percentage: number, amount: number) => void
  selectedPercentage: number
}

export function TipSelection({ subtotal, onTipChange, selectedPercentage }: TipSelectionProps) {
  const [customAmount, setCustomAmount] = useState("")
  const [showCustom, setShowCustom] = useState(false)

  const tipOptions = [
    { percentage: 5, label: "5%" },
    { percentage: 10, label: "10%" },
    { percentage: 15, label: "15%" },
    { percentage: 0, label: "Custom" }
  ]

  const handleTipSelect = (percentage: number) => {
    console.log('Tip selected:', percentage + '%')
    if (percentage === 0) {
      setShowCustom(true)
      return
    }

    setShowCustom(false)
    setCustomAmount("")
    const amount = (subtotal * percentage) / 100
    onTipChange(percentage, amount)
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    const amount = parseFloat(value) || 0
    onTipChange(0, amount)
  }

  return (
    <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl ring-1 ring-white/20">
      <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-pink-50 rounded-t-lg py-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <Heart className="h-3 w-3 text-white" />
          </div>
          <CardTitle className="text-base font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            Add Tip
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          {tipOptions.map((option) => (
            <Button
              key={option.percentage}
              variant={selectedPercentage === option.percentage && !showCustom ? "default" : "outline"}
              onClick={() => handleTipSelect(option.percentage)}
              className={`h-10 text-sm font-bold rounded-xl transition-all duration-300 ${
                selectedPercentage === option.percentage && !showCustom
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
                  : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-2 hover:border-blue-200"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {showCustom && (
          <div className="space-y-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <Label htmlFor="custom-tip" className="text-xs font-semibold text-gray-700">
              Custom Tip Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-sm">
                $
              </span>
              <Input
                id="custom-tip"
                type="number"
                placeholder="0"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="pl-8 h-10 text-sm font-semibold rounded-xl border-2 focus:border-blue-500"
                step="1"
                min="0"
              />
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
            <p className="text-sm font-semibold text-gray-700">Tip Amount</p>
            <p className="text-base font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              ${showCustom ? (parseFloat(customAmount) || 0).toFixed(2) : ((subtotal * selectedPercentage) / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}