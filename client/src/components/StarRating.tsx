import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  animated?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showNumber?: boolean
}

export function StarRating({ rating, animated = false, size = "md", className, showNumber = false }: StarRatingProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-6 w-6"
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200",
              animated && "transition-all duration-300 hover:scale-110"
            )}
          />
        ))}
      </div>
      {showNumber && (
        <span className={cn("font-semibold text-slate-700", textSizeClasses[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}

export default StarRating