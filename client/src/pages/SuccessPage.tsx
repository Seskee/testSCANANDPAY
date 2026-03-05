import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle, Mail, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendReceipt } from "@/api/receipts"
import { useToast } from "@/hooks/useToast"

const validateEmail = (email: string): boolean => {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return false
    }
    
    // Check for common email domains
    const validDomains = [
      '@gmail.com',
      '@yahoo.com',
      '@hotmail.com',
      '@outlook.com',
      '@icloud.com',
      '@aol.com',
      '@protonmail.com',
      '@mail.com',
      '@live.com',
      '@msn.com'
    ]
    
    return validDomains.some(domain => email.toLowerCase().endsWith(domain))
  }

export function SuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [sendingReceipt, setSendingReceipt] = useState(false)
  const [receiptSent, setReceiptSent] = useState(false)

  const paymentId = searchParams.get('paymentId')
  const amount = searchParams.get('amount')
  const restaurant = searchParams.get('restaurant')
  const googlePlaceId = searchParams.get('googlePlaceId')

  useEffect(() => {
    if (!paymentId) {
      navigate('/')
    }
  }, [paymentId, navigate])

  const handleSendReceipt = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      })
      return
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address (e.g., example@gmail.com)",
        variant: "destructive"
      })
      return
    }

    setSendingReceipt(true)
    try {
      console.log('Sending receipt to:', email, 'for payment:', paymentId)
      await sendReceipt({ email, paymentId })
      setReceiptSent(true)
      toast({
        title: "Receipt Sent",
        description: "Your receipt has been sent to your email",
      })
    } catch (error) {
      console.error('Error sending receipt:', error)
      toast({
        title: "Error",
        description: "Failed to send receipt. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingReceipt(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6 relative overflow-hidden" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <Card className="w-full max-w-md bg-white backdrop-blur-xl border-0 shadow-2xl relative z-10 animate-in fade-in-0 zoom-in-95 duration-500">
        <CardHeader className="text-center pb-6 relative">
          {/* Success animation */}
          <div className="flex justify-center mb-4 relative">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-700 delay-200">
              <CheckCircle className="h-8 w-8 text-white animate-in zoom-in-50 duration-500 delay-500" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 animate-in slide-in-from-bottom-4 duration-500 delay-300">
            <CardTitle className="text-2xl font-bold text-green-600">
              Payment to Sunset Beach Bar!
            </CardTitle>
          </div>
          <p className="text-lg text-gray-600 mt-2 animate-in slide-in-from-bottom-4 duration-500 delay-400 italic">
            Thank you for dining with us!
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-3 animate-in slide-in-from-bottom-4 duration-500 delay-400">
            <p className="text-gray-600 text-lg">Your payment has been processed successfully</p>
            {amount && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl">
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  ${parseFloat(amount).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-6 animate-in slide-in-from-bottom-4 duration-500 delay-500">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Receipt (Optional)
                </Label>
              </div>

              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={receiptSent}
                  className="flex-1 border-2 focus:border-blue-500 rounded-xl"
                />
                <Button
                  onClick={handleSendReceipt}
                  disabled={sendingReceipt || receiptSent}
                  className={`rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-300 ${
                    receiptSent
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  }`}
                >
                  {sendingReceipt ? "Sending..." : receiptSent ? "Sent ✓" : "Send"}
                </Button>
              </div>
            </div>
          </div>

          {/* Google Review CTA */}
          {restaurant && (
            <div className="border-t pt-6 animate-in slide-in-from-bottom-4 duration-500 delay-600">
              <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-yellow-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-md">
                    <Star className="h-5 w-5 text-white fill-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Enjoyed your experience?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Help {restaurant} grow with a Google review!
                    </p>
                  </div>
                </div>
                
                <a
                  href={
                    googlePlaceId 
                      ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
                      : `https://www.google.com/search?q=${encodeURIComponent(restaurant + ' review')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                  onClick={() => {
                    console.log('Review button clicked for:', restaurant, googlePlaceId ? `(Place ID: ${googlePlaceId})` : '(Generic search)');
                  }}
                >
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                    <Star className="h-5 w-5 mr-2 fill-current" />
                    Leave a Google Review →
                  </Button>
                </a>
                
                <p className="text-xs text-center text-gray-500">
                  Opens in a new tab • Your review helps us serve you better
                </p>
              </div>
            </div>
          )}

          <div className="text-center pt-4 animate-in slide-in-from-bottom-4 duration-500 delay-700">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
              <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Thank you for choosing Scan&Pay!
              </p>
              <p className="text-sm text-gray-500 mt-1">We appreciate your business!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}