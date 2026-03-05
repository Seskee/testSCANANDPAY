import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Smartphone, Shield, AlertCircle } from "lucide-react"
import { createPayment, confirmPayment } from "@/api/payments"
import { useToast } from "@/hooks/useToast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface PaymentMethodsProps {
  total: number
  billData: any
  selectedItems: string[]
  selectedQuantities: { [key: string]: number }
  tipAmount: number
}

export function PaymentMethods({ total, billData, selectedItems, selectedQuantities, tipAmount }: PaymentMethodsProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState("")

  const paymentMethods = [
    {
      id: "apple-pay",
      name: "Apple Pay",
      icon: <Smartphone className="h-5 w-5" />,
      available: /iPad|iPhone|iPod/.test(navigator.userAgent),
      color: "from-gray-800 to-black"
    },
    {
      id: "google-pay",
      name: "Google Pay",
      icon: <CreditCard className="h-5 w-5" />,
      available: /Android/.test(navigator.userAgent),
      color: "from-blue-500 to-green-500"
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: <CreditCard className="h-5 w-5" />,
      available: true,
      color: "from-blue-600 to-blue-700"
    },
    {
      id: "aircash",
      name: "AirCash",
      icon: <CreditCard className="h-5 w-5" />,
      available: true,
      color: "from-red-500 to-red-600"
    }
  ]

  const availableMethods = paymentMethods.filter(method => method.available)

  const handlePayment = async (methodId: string) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to pay for",
        variant: "destructive"
      })
      return
    }

    if (total <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please select items with a valid amount to pay",
        variant: "destructive"
      })
      return
    }

    setProcessing(true)
    setSelectedMethod(methodId)

    try {
      console.log('Processing payment with method:', methodId, 'total:', total)

      // Convert methodId to payment method format
      const paymentMethodMap: { [key: string]: string } = {
        'apple-pay': 'apple_pay',
        'google-pay': 'google_pay',
        'paypal': 'paypal',
        'aircash': 'aircash'
      }

      // Prepare items array for payment
      const items = selectedItems.map(itemId => {
        const item = billData.items.find((i: any) => i._id === itemId)
        return {
          itemId: itemId,
          quantity: selectedQuantities[itemId] || item?.quantity || 1
        }
      })

      // Create payment intent
      const paymentData = {
        billId: billData._id,
        items: items,
        tip: tipAmount,
        paymentMethod: paymentMethodMap[methodId] || methodId,
        customerEmail: ''
      }

      console.log('Creating payment with data:', paymentData)
      const paymentResult = await createPayment(paymentData)
      console.log('Payment created:', paymentResult)

      // For now, we'll simulate successful payment
      // In a production environment, you would integrate with Stripe.js
      // and use the clientSecret to complete the payment

      // Simulate a brief payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Confirm the payment
      const confirmResult = await confirmPayment(paymentResult.paymentId)
      console.log('Payment confirmed:', confirmResult)

      if (confirmResult.success) {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully",
        })

        navigate(`/success?paymentId=${paymentResult.paymentId}&amount=${total}&restaurant=${encodeURIComponent(billData.restaurant.name)}${billData.restaurant.googlePlaceId ? `&googlePlaceId=${billData.restaurant.googlePlaceId}` : ''}`)
      } else {
        throw new Error("Payment confirmation failed")
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
      setSelectedMethod("")
    }
  }

  if (selectedItems.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl ring-1 ring-white/20">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Items Selected</h3>
          <p className="text-gray-600">Please select at least one item from your bill to proceed with payment.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl ring-1 ring-white/20">
      <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg py-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <Shield className="h-3 w-3 text-white" />
          </div>
          <CardTitle className="text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Payment Method
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          {availableMethods.map((method) => (
            <Button
              key={method.id}
              onClick={() => handlePayment(method.id)}
              disabled={processing}
              className={`w-full h-12 text-sm font-bold bg-gradient-to-r ${method.color} hover:opacity-90 text-white transition-all duration-300 hover:shadow-xl rounded-xl ${
                processing && selectedMethod === method.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                {processing && selectedMethod === method.id ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  method.icon
                )}
                <span>{method.name}</span>
              </div>
            </Button>
          ))}
        </div>

        <div className="mt-4">
          <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        </div>

        <div className="space-y-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-gray-700 font-medium text-sm">Subtotal</p>
            <p className="font-bold text-gray-800 text-sm">${(total - tipAmount).toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-700 font-medium text-sm">Tip</p>
            <p className="font-bold text-gray-800 text-sm">${tipAmount.toFixed(2)}</p>
          </div>
          <Separator className="bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <p className="text-base font-bold text-gray-800">Total</p>
            <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">${total.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}