import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { BillReview } from "@/components/payment/BillReview"
import { TipSelection } from "@/components/payment/TipSelection"
import { PaymentMethods } from "@/components/payment/PaymentMethods"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getBillDetails } from "@/api/bills"
import { useToast } from "@/hooks/useToast"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PaymentPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [billData, setBillData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedQuantities, setSelectedQuantities] = useState<{ [key: string]: number }>({})
  const [tipAmount, setTipAmount] = useState(0)
  const [tipPercentage, setTipPercentage] = useState(0)

  const restaurantId = searchParams.get('restaurant')
  const tableNumber = searchParams.get('table')

  useEffect(() => {
    const fetchBillData = async () => {
      if (!restaurantId || !tableNumber) {
        setError("Restaurant ID and table number are required")
        setLoading(false)
        return
      }

      try {
        setError(null)
        console.log('Fetching bill data for restaurant:', restaurantId, 'table:', tableNumber)
        const response = await getBillDetails(restaurantId, tableNumber)

        // Check if the bill is fully paid
        if (response.fullyPaid) {
          console.log('Bill is fully paid:', response.message)
          setError(response.message)
          setLoading(false)
          return
        }

        const billDataFromApi = response.bill
        setBillData(billDataFromApi)
        // Initially select all items with full quantities
        const initialSelectedItems = billDataFromApi.items.map(item => item._id)
        const initialQuantities = {}
        billDataFromApi.items.forEach(item => {
          initialQuantities[item._id] = item.quantity
        })
        setSelectedItems(initialSelectedItems)
        setSelectedQuantities(initialQuantities)
      } catch (error) {
        console.error('Error fetching bill data:', error)
        setError(error.message || "Failed to load bill details")
        toast({
          title: "Error",
          description: "Failed to load bill details",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBillData()
  }, [restaurantId, tableNumber, toast])

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSelectedItems = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]

      // If item is being selected, set quantity to full amount
      // If item is being deselected, set quantity to 0
      if (!prev.includes(itemId)) {
        const item = billData.items.find(item => item._id === itemId)
        if (item) {
          setSelectedQuantities(prevQuantities => ({
            ...prevQuantities,
            [itemId]: item.quantity
          }))
        }
      } else {
        setSelectedQuantities(prevQuantities => ({
          ...prevQuantities,
          [itemId]: 0
        }))
      }

      return newSelectedItems
    })
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }))

    // If quantity becomes 0, remove from selected items
    // If quantity becomes > 0 and item not selected, add to selected items
    if (quantity === 0) {
      setSelectedItems(prev => prev.filter(id => id !== itemId))
    } else if (!selectedItems.includes(itemId)) {
      setSelectedItems(prev => [...prev, itemId])
    }
  }

  const calculateSubtotal = () => {
    if (!billData) return 0
    return billData.items
      .filter(item => selectedItems.includes(item._id))
      .reduce((sum, item) => {
        const selectedQuantity = selectedQuantities[item._id] || 0
        return sum + (item.price * selectedQuantity)
      }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + tipAmount
  }

  const handleTipChange = (percentage: number, amount: number) => {
    setTipPercentage(percentage)
    setTipAmount(amount)
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    // Trigger re-fetch by updating a dependency
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading bill details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Unable to Load Bill</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!billData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Bill Not Found</h2>
          <p className="text-gray-600">Unable to load bill details</p>
          <Button
            onClick={() => navigate('/')}
            className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="space-y-4">
          <BillReview
            billData={billData}
            selectedItems={selectedItems}
            selectedQuantities={selectedQuantities}
            onItemToggle={handleItemToggle}
            onQuantityChange={handleQuantityChange}
            subtotal={calculateSubtotal()}
          />

          <TipSelection
            subtotal={calculateSubtotal()}
            onTipChange={handleTipChange}
            selectedPercentage={tipPercentage}
          />

          <PaymentMethods
            total={calculateTotal()}
            billData={billData}
            selectedItems={selectedItems}
            selectedQuantities={selectedQuantities}
            tipAmount={tipAmount}
          />
        </div>
      </div>
    </div>
  )
}