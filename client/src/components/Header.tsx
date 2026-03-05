import { QrCode } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function Header() {
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-center px-6">
        <div
          className="flex items-center gap-1 cursor-pointer transition-all duration-300 hover:drop-shadow-lg"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 flex items-center justify-center transition-all duration-300">
            <QrCode className="h-7 w-7 text-black" />
          </div>
          <span className="text-2xl font-bold text-black transition-all duration-300 hover:drop-shadow-sm">
            Scan&Pay
          </span>
        </div>
      </div>
    </header>
  )
}