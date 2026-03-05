import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export function TypingEndOfWaiting() {
  const navigate = useNavigate()
  const [displayText, setDisplayText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  
  const fullText = "The End of Waiting."

  useEffect(() => {
    let currentIndex = 0
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(typewriterInterval)
        setIsComplete(true)
      }
    }, 100)

    return () => clearInterval(typewriterInterval)
  }, [])

  const handleDemoPayment = () => {
    navigate('/pay?restaurant=demo&table=1')
  }

  return (
    <div className="text-center py-20">
      <div className="mb-8">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
          {displayText}
          {!isComplete && (
            <span className="animate-pulse">|</span>
          )}
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Experience the future of restaurant payments today. Fast, secure, and effortless.
        </p>
      </div>
      
      <div className="space-y-4">
        <Button
          onClick={handleDemoPayment}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          Try Scan&Pay Now
        </Button>
        <p className="text-sm text-gray-500">
          No registration required • Works on any smartphone
        </p>
      </div>
    </div>
  )
}