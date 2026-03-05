import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Heart, TrendingUp, CheckCircle, Users, RefreshCw, Eye, BarChart3 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { motion, Variants } from "framer-motion"

// Mikro-komponenta koja sprječava re-renderiranje cijelog dashboarda
const LiveClock = () => {
  const[time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  },[]);
  return <span>{time.toLocaleTimeString()}</span>;
};

export function DashboardDemo() {
  const navigate = useNavigate()

  // Dodan tip Variants kako se TypeScript ne bi bunio oko 'ease' stringa
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const kpiData =[
    {
      title: "Today's Revenue",
      value: "$2,847.50",
      change: "+12.5%",
      icon: <DollarSign className="h-6 w-6 text-white" />,
      gradient: "from-green-500 to-emerald-600",
      textGradient: "from-green-600 to-emerald-600"
    },
    {
      title: "Tips (Today)",
      value: "$428.20",
      change: "+18.3%",
      icon: <Heart className="h-6 w-6 text-white" />,
      gradient: "from-blue-500 to-purple-600",
      textGradient: "from-blue-600 to-purple-600"
    },
    {
      title: "Avg. Bill",
      value: "$47.20",
      change: "+5.2%",
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      gradient: "from-orange-500 to-red-600",
      textGradient: "from-orange-600 to-red-600"
    },
    {
      title: "Paid Tables",
      value: "34",
      change: "+8 today",
      icon: <CheckCircle className="h-6 w-6 text-white" />,
      gradient: "from-purple-500 to-pink-600",
      textGradient: "from-purple-600 to-pink-600"
    }
  ]

  const recentTransactions =[
    { id: 1, table: "Table 12", amount: "$67.50", tip: "$10.13", time: "2 min ago", status: "completed" },
    { id: 2, table: "Table 8", amount: "$34.20", tip: "$5.13", time: "5 min ago", status: "completed" },
    { id: 3, table: "Table 15", amount: "$89.75", tip: "$13.46", time: "8 min ago", status: "completed" },
    { id: 4, table: "Table 3", amount: "$42.30", tip: "$6.35", time: "12 min ago", status: "completed" },
    { id: 5, table: "Table 7", amount: "$56.80", tip: "$8.52", time: "15 min ago", status: "completed" }
  ]

  const activeTables =[
    { table: "Table 1", guests: 4, bill: "$78.50", status: "dining" },
    { table: "Table 5", guests: 2, bill: "$45.20", status: "ready" },
    { table: "Table 9", guests: 6, bill: "$156.30", status: "dining" },
    { table: "Table 11", guests: 3, bill: "$67.80", status: "ready" },
    { table: "Table 14", guests: 2, bill: "$34.50", status: "dining" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Dashboard Demo
              </h1>
              <p className="text-gray-600">
                Live view of your restaurant's performance • <LiveClock />
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                Back to Home
              </Button>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${kpi.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                      {kpi.icon}
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                      {kpi.change}
                    </Badge>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${kpi.textGradient} bg-clip-text text-transparent mb-1`}>
                      {kpi.value}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">{kpi.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Transactions */}
            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                      Recent Transactions
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      <Eye className="h-4 w-4 mr-1" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {transaction.table.split(' ')[1]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{transaction.table}</p>
                          <p className="text-sm text-gray-600">{transaction.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{transaction.amount}</p>
                        <p className="text-sm text-green-600 font-medium">+{transaction.tip} tip</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Tables */}
            <motion.div variants={fadeInUp}>
              <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      Active Tables
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {activeTables.length} Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeTables.map((table, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:from-orange-50 hover:to-red-50 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {table.table.split(' ')[1]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{table.table}</p>
                          <p className="text-sm text-gray-600">{table.guests} guests</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{table.bill}</p>
                        <Badge 
                          variant={table.status === 'ready' ? 'default' : 'secondary'}
                          className={table.status === 'ready' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                          }
                        >
                          {table.status === 'ready' ? 'Ready to Pay' : 'Dining'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Demo Notice */}
          <motion.div variants={fadeInUp}>
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-xl">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Demo Dashboard
                  </p>
                </div>
                <p className="text-gray-600 mb-4">
                  This is a demonstration of your restaurant's analytics dashboard. Real data would be updated in real-time.
                </p>
                <Button
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                >
                  Get Started with Scan&Pay
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}