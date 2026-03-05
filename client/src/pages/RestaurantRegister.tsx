import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { registerUser } from "@/api/auth"
import { useToast } from "@/hooks/useToast"
import { Mail, Lock, Store, Users, QrCode } from "lucide-react"

export function RestaurantRegister() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    restaurantName: '',
    tableCount: 10
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.password || !formData.restaurantName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const result = await registerUser({
        email: formData.email,
        password: formData.password,
        restaurantName: formData.restaurantName,
        tableCount: formData.tableCount
      })

      // Store auth token and restaurant data
      localStorage.setItem('restaurant_token', result.token)
      localStorage.setItem('restaurant_data', JSON.stringify(result.restaurant))

      toast({
        title: "Registration Successful",
        description: `Welcome to Scan&Pay, ${result.restaurant.name}!`
      })

      navigate('/restaurant/dashboard')
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Registration failed",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6 relative overflow-hidden" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <Card className="w-full max-w-md bg-white/90 backdrop-blur-md border-0 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <QrCode className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Create Account
          </CardTitle>
          <p className="text-gray-600">Join Scan&Pay for your restaurant</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restaurantName" className="text-sm font-medium text-gray-700">
                Restaurant Name *
              </Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="restaurantName"
                  type="text"
                  placeholder="Enter restaurant name"
                  value={formData.restaurantName}
                  onChange={(e) => setFormData(prev => ({ ...prev, restaurantName: e.target.value }))}
                  className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableCount" className="text-sm font-medium text-gray-700">
                Number of Tables
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="tableCount"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="10"
                  value={formData.tableCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, tableCount: parseInt(e.target.value) || 10 }))}
                  className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pl-10 border-2 focus:border-blue-500 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/restaurant/login"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}