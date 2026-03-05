import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { Layout } from "./components/Layout"
import { PaymentPage } from "./pages/PaymentPage"
import { HomePage } from "./pages/HomePage"
import { SuccessPage } from "./pages/SuccessPage"
import { DashboardDemo } from "./pages/DashboardDemo"
import { RestaurantLogin } from "./pages/RestaurantLogin"
import { RestaurantRegister } from "./pages/RestaurantRegister"
import { RestaurantDashboard } from "./pages/RestaurantDashboard"
import { RestaurantSettings } from "./pages/RestaurantSettings"
import RestaurantManagement from "./pages/RestaurantManagement"

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/pay/:encryptionKey" element={<PaymentPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/dashboard/demo" element={<DashboardDemo />} />
          </Route>
          {/* Restaurant routes without layout */}
          <Route path="/restaurant/login" element={<RestaurantLogin />} />
          <Route path="/restaurant/register" element={<RestaurantRegister />} />
          <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
          <Route path="/restaurant/settings" element={<RestaurantSettings />} />
          <Route path="/restaurant/manage" element={<RestaurantManagement />} />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  )
}

export default App