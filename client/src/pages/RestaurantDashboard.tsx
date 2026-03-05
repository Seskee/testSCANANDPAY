import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDashboardSummary, getMonthlyRevenue, getTransactionHistory } from "@/api/restaurant"
import { logoutUser } from "@/api/auth"
import { useToast } from "@/hooks/useToast"
import {
  DollarSign,
  Heart,
  TrendingUp,
  Users,
  RefreshCw,
  Settings,
  LogOut,
  Clock,
  CheckCircle,
  Calendar,
  Filter,
  Download,
  ChevronUp,
  ChevronDown
} from "lucide-react"

interface DashboardSummary {
  today: {
    revenue: number
    tips: number
    transactions: number
    averageTransaction: number
    change: number
  }
  week: {
    revenue: number
    transactions: number
  }
  month: {
    revenue: number
    transactions: number
  }
  activeTables: number
  totalTables: number
}

interface Transaction {
  _id: string
  amount: number
  tipAmount: number
  totalAmount: number
  status: string
  paymentMethod: string
  tableNumber: number | null
  itemCount: number
  stripePaymentIntentId: string
  createdAt: string
  updatedAt: string
}

interface MonthlyRevenue {
  month: number
  year: number
  totalRevenue: number
  totalTips: number
  transactionCount: number
  averageTransaction: number
  dailyBreakdown: Array<{
    date: string
    revenue: number
    tips: number
    transactions: number
  }>
}

export function RestaurantDashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("overview")

  // Filter states
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all")
  const [filterTableNumber, setFilterTableNumber] = useState("")

  // Monthly analysis states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('restaurant_token')
    if (!token) {
      navigate('/restaurant/login')
      return
    }
  }, [navigate])

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const summaryData = await getDashboardSummary()
      setSummary(summaryData)

      // Fetch current month revenue
      const monthlyRevenueData = await getMonthlyRevenue(selectedMonth, selectedYear)
      setMonthlyData(monthlyRevenueData)

      // Fetch recent transactions (last 20)
      const transactionsData = await getTransactionHistory({ limit: 20, skip: 0 })
      setTransactions(transactionsData.transactions)
    } catch (error: any) {
      console.error("Dashboard fetch error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Fetch monthly data when month/year changes
  const fetchMonthlyData = async () => {
    try {
      const monthlyRevenueData = await getMonthlyRevenue(selectedMonth, selectedYear)
      setMonthlyData(monthlyRevenueData)
    } catch (error: any) {
      console.error("Monthly data fetch error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load monthly data",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchMonthlyData()
    }
  }, [selectedMonth, selectedYear])

  // Apply transaction filters
  const applyFilters = async () => {
    try {
      const filters: any = { limit: 100, skip: 0 }

      if (filterStartDate) filters.startDate = filterStartDate
      if (filterEndDate) filters.endDate = filterEndDate
      if (filterStatus && filterStatus !== "all") filters.status = filterStatus
      if (filterPaymentMethod && filterPaymentMethod !== "all") filters.paymentMethod = filterPaymentMethod
      if (filterTableNumber) filters.tableNumber = parseInt(filterTableNumber)

      const transactionsData = await getTransactionHistory(filters)
      setTransactions(transactionsData.transactions)

      toast({
        title: "Filters Applied",
        description: `Found ${transactionsData.transactions.length} transactions`
      })
    } catch (error: any) {
      console.error("Filter error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to apply filters",
        variant: "destructive"
      })
    }
  }

  const clearFilters = async () => {
    setFilterStartDate("")
    setFilterEndDate("")
    setFilterStatus("all")
    setFilterPaymentMethod("all")
    setFilterTableNumber("")

    try {
      const transactionsData = await getTransactionHistory({ limit: 20, skip: 0 })
      setTransactions(transactionsData.transactions)
    } catch (error: any) {
      console.error("Clear filters error:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      localStorage.removeItem('restaurant_token')
      localStorage.removeItem('restaurant_data')
      navigate('/restaurant/login')
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out"
      })
    } catch (error: any) {
      // Even if API call fails, still logout locally
      localStorage.removeItem('restaurant_token')
      localStorage.removeItem('restaurant_data')
      navigate('/restaurant/login')
    }
  }

  const getRestaurantName = () => {
    const restaurantData = localStorage.getItem('restaurant_data')
    if (restaurantData) {
      return JSON.parse(restaurantData).name
    }
    return 'Restaurant'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {getRestaurantName()} Dashboard
            </h1>
            <p className="text-gray-600">
              Live view • {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl"
            >
              {refreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/restaurant/settings')}
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white rounded-xl"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {summary && (
          <>
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Today
                    </Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">
                      ${summary.today.revenue.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 font-medium mb-2">Revenue</p>
                    {summary.today.change !== 0 && (
                      <div className={`flex items-center text-xs ${summary.today.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.today.change > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span>{Math.abs(summary.today.change).toFixed(1)}% vs yesterday</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Today
                    </Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                      ${summary.today.tips.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Tips</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      Avg
                    </Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">
                      ${summary.today.averageTransaction.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Transaction</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      Today
                    </Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                      {summary.today.transactions}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Transactions</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-[600px] bg-white/80 backdrop-blur-md p-1 rounded-xl shadow-lg">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                  Monthly Analysis
                </TabsTrigger>
                <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                  Transactions
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Week Stats */}
                  <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        This Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                        <span className="text-gray-700 font-medium">Revenue</span>
                        <span className="text-2xl font-bold text-blue-600">${summary.week.revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                        <span className="text-gray-700 font-medium">Transactions</span>
                        <span className="text-2xl font-bold text-purple-600">{summary.week.transactions}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Month Stats */}
                  <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        This Month
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                        <span className="text-gray-700 font-medium">Revenue</span>
                        <span className="text-2xl font-bold text-green-600">${summary.month.revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                        <span className="text-gray-700 font-medium">Transactions</span>
                        <span className="text-2xl font-bold text-emerald-600">{summary.month.transactions}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Transactions */}
                <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      Recent Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction._id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl hover:from-green-50 hover:to-emerald-50 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {transaction.tableNumber || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {transaction.tableNumber ? `Table ${transaction.tableNumber}` : 'No Table'}
                            </p>
                            <p className="text-sm text-gray-600">{transaction.paymentMethod}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">${transaction.amount.toFixed(2)}</p>
                          <p className="text-sm text-green-600 font-medium">+${transaction.tipAmount.toFixed(2)} tip</p>
                          <Badge
                            variant={transaction.status === 'succeeded' ? 'default' : 'secondary'}
                            className={transaction.status === 'succeeded'
                              ? 'bg-green-100 text-green-700 hover:bg-green-100 text-xs'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Monthly Analysis Tab */}
              <TabsContent value="monthly" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <CardTitle className="text-xl font-bold text-gray-800">Monthly Revenue Analysis</CardTitle>
                      <div className="flex gap-3">
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                              <SelectItem key={month} value={month.toString()}>
                                {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {monthlyData && (
                      <div className="space-y-6">
                        {/* Monthly Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600">${monthlyData.totalRevenue.toFixed(2)}</p>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">Total Tips</p>
                            <p className="text-2xl font-bold text-blue-600">${monthlyData.totalTips.toFixed(2)}</p>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">Transactions</p>
                            <p className="text-2xl font-bold text-orange-600">{monthlyData.transactionCount}</p>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">Avg Transaction</p>
                            <p className="text-2xl font-bold text-purple-600">${monthlyData.averageTransaction.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Daily Breakdown */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Breakdown</h3>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {monthlyData.dailyBreakdown.map((day) => (
                              <div
                                key={day.date}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                                  day.transactions > 0
                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                    day.transactions > 0
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                      : 'bg-gray-400'
                                  }`}>
                                    {new Date(day.date).getDate()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">{formatDate(day.date)}</p>
                                    <p className="text-sm text-gray-600">{day.transactions} transactions</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-800">${day.revenue.toFixed(2)}</p>
                                  <p className="text-sm text-green-600 font-medium">+${day.tips.toFixed(2)} tips</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Filter className="h-5 w-5 text-blue-600" />
                      Filter Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tableNumber">Table Number</Label>
                        <Input
                          id="tableNumber"
                          type="number"
                          placeholder="e.g., 5"
                          value={filterTableNumber}
                          onChange={(e) => setFilterTableNumber(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger id="status" className="mt-1">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="succeeded">Succeeded</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                          <SelectTrigger id="paymentMethod" className="mt-1">
                            <SelectValue placeholder="All methods" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All methods</SelectItem>
                            <SelectItem value="apple_pay">Apple Pay</SelectItem>
                            <SelectItem value="google_pay">Google Pay</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="aircash">AirCash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={applyFilters} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl">
                        <Filter className="h-4 w-4 mr-2" />
                        Apply Filters
                      </Button>
                      <Button onClick={clearFilters} variant="outline" className="rounded-xl">
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800">
                      Transaction History ({transactions.length} transactions)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {transactions.map((transaction) => (
                        <div key={transaction._id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {transaction.tableNumber || '?'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-800">
                                  {transaction.tableNumber ? `Table ${transaction.tableNumber}` : 'No Table'}
                                </p>
                                <Badge
                                  variant={transaction.status === 'succeeded' ? 'default' : 'secondary'}
                                  className={transaction.status === 'succeeded'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                                  }
                                >
                                  {transaction.status === 'succeeded' ? (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  {transaction.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{transaction.paymentMethod}</p>
                              <p className="text-xs text-gray-500">{formatDateTime(transaction.createdAt)}</p>
                              <p className="text-xs text-gray-400 mt-1">{transaction.itemCount} items</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-800">${transaction.totalAmount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Bill: ${transaction.amount.toFixed(2)}</p>
                            <p className="text-sm text-green-600 font-medium">Tip: +${transaction.tipAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                      {transactions.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-500">No transactions found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
