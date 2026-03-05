import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { updateRestaurantSettings, generateQRCodes } from "@/api/restaurant"
import { startStripeOnboarding, checkStripeStatus, getStripeDashboardLink } from "@/api/stripe"
import { useToast } from "@/hooks/useToast"
import {
  ArrowLeft,
  Settings,
  QrCode,
  Download,
  Building2,
  Hash,
  Save,
  RefreshCw,
  CreditCard,
  CheckCircle,
  XCircle,
  ExternalLink
} from "lucide-react"

export function RestaurantSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [settings, setSettings] = useState({ name: '', tableCount: 20 })
  const [loading, setLoading] = useState(false)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [qrCodes, setQrCodes] = useState([])
  const [stripeStatus, setStripeStatus] = useState({
    onboardingComplete: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    accountId: null
  })
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('restaurant_token')
    if (!token) {
      navigate('/restaurant/login')
      return
    }

    // Load current restaurant data
    const restaurantData = localStorage.getItem('restaurant_data')
    if (restaurantData) {
      const data = JSON.parse(restaurantData)
      setSettings({
        name: data.name || '',
        tableCount: data.tableCount || 20
      })

      // Check Stripe status
      loadStripeStatus(data._id)
    }
  }, [navigate])

  const loadStripeStatus = async (restaurantId: string) => {
    try {
      setCheckingStatus(true)
      const status = await checkStripeStatus(restaurantId)
      setStripeStatus(status)
    } catch (error) {
      console.error('Error loading Stripe status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleStartStripeOnboarding = async () => {
    const restaurantData = localStorage.getItem('restaurant_data')
    if (!restaurantData) return

    const data = JSON.parse(restaurantData)
    setLoadingStripe(true)

    try {
      const baseUrl = window.location.origin
      const result = await startStripeOnboarding({
        restaurantId: data._id,
        refreshUrl: `${baseUrl}/restaurant/settings`,
        returnUrl: `${baseUrl}/restaurant/settings`
      })

      // Redirect to Stripe onboarding
      window.location.href = result.url
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to start Stripe onboarding",
        variant: "destructive"
      })
      setLoadingStripe(false)
    }
  }

  const handleOpenStripeDashboard = async () => {
    const restaurantData = localStorage.getItem('restaurant_data')
    if (!restaurantData) return

    const data = JSON.parse(restaurantData)
    setLoadingStripe(true)

    try {
      const result = await getStripeDashboardLink(data._id)
      window.open(result.url, '_blank')
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe dashboard",
        variant: "destructive"
      })
    } finally {
      setLoadingStripe(false)
    }
  }

  const handleRefreshStripeStatus = async () => {
    const restaurantData = localStorage.getItem('restaurant_data')
    if (!restaurantData) return

    const data = JSON.parse(restaurantData)
    await loadStripeStatus(data._id)

    toast({
      title: "Status Refreshed",
      description: "Stripe account status has been updated"
    })
  }

  const handleSaveSettings = async () => {
    if (!settings.name || settings.tableCount < 1) {
      toast({
        title: "Invalid Settings",
        description: "Please enter a valid restaurant name and table count",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const result = await updateRestaurantSettings(settings)

      // Update local storage with the returned restaurant data
      const restaurantData = localStorage.getItem('restaurant_data')
      if (restaurantData && result.restaurant) {
        const data = JSON.parse(restaurantData)
        const updatedData = { ...data, ...result.restaurant }
        localStorage.setItem('restaurant_data', JSON.stringify(updatedData))
      }

      toast({
        title: "Settings Updated",
        description: "Restaurant settings have been saved successfully"
      })
    } catch (error: any) {
      console.error("Save settings error:", error.message)
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQRCodes = async () => {
    const restaurantData = localStorage.getItem('restaurant_data')
    if (!restaurantData) return

    const data = JSON.parse(restaurantData)
    setGeneratingQR(true)

    try {
      const result = await generateQRCodes({
        restaurantId: data._id,
        tableCount: settings.tableCount
      })

      setQrCodes(result.qrCodes)
      toast({
        title: "QR Codes Generated",
        description: `Generated ${result.qrCodes.length} QR codes for your tables`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR codes",
        variant: "destructive"
      })
    } finally {
      setGeneratingQR(false)
    }
  }

  const downloadQRCode = (qrCode) => {
    const link = document.createElement('a')
    link.href = qrCode.qrCodeData
    link.download = `table-${qrCode.table}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAllQRCodes = () => {
    qrCodes.forEach(qrCode => {
      setTimeout(() => downloadQRCode(qrCode), 100 * qrCode.table)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/restaurant/dashboard')}
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Restaurant Settings</h1>
            <p className="text-gray-600">Manage your restaurant configuration</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Stripe Connect Section */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                Payment Processing
              </CardTitle>
              <CardDescription>
                Connect your Stripe account to accept payments from customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {checkingStatus ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Account Status</span>
                      <Badge variant={stripeStatus.onboardingComplete ? "default" : "secondary"}>
                        {stripeStatus.onboardingComplete ? "Active" : "Not Setup"}
                      </Badge>
                    </div>

                    {stripeStatus.accountId && (
                      <>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Accept Payments</span>
                          {stripeStatus.chargesEnabled ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Receive Payouts</span>
                          {stripeStatus.payoutsEnabled ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {!stripeStatus.onboardingComplete ? (
                      <Button
                        onClick={handleStartStripeOnboarding}
                        disabled={loadingStripe}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {loadingStripe ? (
                          <div className="flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Setup Stripe Connect
                          </div>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={handleOpenStripeDashboard}
                          disabled={loadingStripe}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {loadingStripe ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Open Dashboard
                            </div>
                          )}
                        </Button>
                        <Button
                          onClick={handleRefreshStripeStatus}
                          disabled={checkingStatus}
                          variant="outline"
                          className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {!stripeStatus.onboardingComplete && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Important:</strong> You need to complete Stripe Connect setup to accept payments from customers. The setup process takes about 5 minutes.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Restaurant Settings */}
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                Basic Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="restaurant-name" className="text-sm font-medium text-gray-700">
                  Restaurant Name
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="restaurant-name"
                    type="text"
                    placeholder="Enter restaurant name"
                    value={settings.name}
                    onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="table-count" className="text-sm font-medium text-gray-700">
                  Number of Tables
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="table-count"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Enter number of tables"
                    value={settings.tableCount}
                    onChange={(e) => setSettings(prev => ({ ...prev, tableCount: parseInt(e.target.value) || 0 }))}
                    className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Settings
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Generation */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <QrCode className="h-4 w-4 text-white" />
                </div>
                QR Code Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Generate QR codes for all your tables. Each QR code will link directly to the payment page for that specific table.
                </p>
                <Button
                  onClick={handleGenerateQRCodes}
                  disabled={generatingQR}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {generatingQR ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Generate QR Codes
                    </div>
                  )}
                </Button>
              </div>

              {qrCodes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Generated QR Codes</h3>
                    <Button
                      onClick={downloadAllQRCodes}
                      variant="outline"
                      className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-xl"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {qrCodes.map((qrCode) => (
                      <div key={qrCode.table} className="p-3 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">Table {qrCode.table}</p>
                            <p className="text-xs text-gray-600 truncate">{qrCode.url}</p>
                          </div>
                          <Button
                            onClick={() => downloadQRCode(qrCode)}
                            size="sm"
                            variant="outline"
                            className="border border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-lg"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  )
}