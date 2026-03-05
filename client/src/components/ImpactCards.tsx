import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { useEffect, useState, useRef } from "react"
import { Clock, TrendingUp, RefreshCw, Star } from "lucide-react"

interface ImpactCardProps {
  icon: React.ReactNode
  title: string
  metric: string
  label: string
  description: string
  visualClass: string
  delay?: number
}

function ImpactCard({ icon, title, metric, label, description, visualClass, delay = 0 }: ImpactCardProps) {
  const [ref, inView] = useInView({ threshold: 0.5, triggerOnce: true })
  const [displayMetric, setDisplayMetric] = useState("")
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true

      // Animate the metric with count-up effect for numbers
      const numMatch = metric.match(/(\d+)/)
      if (numMatch) {
        const targetNum = parseInt(numMatch[1])
        const duration = 1500 // 1.5 seconds
        const steps = 30
        const increment = targetNum / steps
        const stepDuration = duration / steps

        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= targetNum) {
            setDisplayMetric(metric)
            clearInterval(timer)
          } else {
            const prefix = metric.startsWith('↑') ? '↑ ' : metric.startsWith('–') ? '–' : ''
            const suffix = metric.includes('%') ? '%' : metric.includes('min') ? ' min / table' : ''
            setDisplayMetric(`${prefix}${Math.floor(current)}${suffix}`)
          }
        }, stepDuration)

        return () => clearInterval(timer)
      } else {
        // For non-numeric metrics, just show them
        setDisplayMetric(metric)
      }
    }
  }, [inView, metric])

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: delay,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeInUp}
      className="glass-card rounded-3xl overflow-hidden"
    >
      {/* Visual Background */}
      <div className={`${visualClass} h-32 md:h-40 flex items-center justify-center relative`}>
        <div className="text-slate-700/30 absolute">
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 space-y-2">
        <h3 className="text-base md:text-lg font-medium text-slate-700">
          {title}
        </h3>
        <div className="text-3xl md:text-4xl font-normal text-slate-900 leading-tight min-h-[2.5rem]">
          {displayMetric || metric}
        </div>
        <p className="text-xs md:text-sm text-slate-600 font-normal">
          {label}
        </p>
        <p className="text-xs md:text-sm text-slate-500 leading-relaxed pt-2">
          {description}
        </p>
      </div>
    </motion.div>
  )
}

export function ImpactCards() {
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true })

  const fadeInUp = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  const cards = [
    {
      icon: <Clock className="h-16 w-16 md:h-20 md:w-20" strokeWidth={1.5} />,
      title: "⏱️ Time Saved",
      metric: "–10 min / table",
      label: "Faster checkout, smoother flow",
      description: "",
      visualClass: "card-visual-time"
    },
    {
      icon: <TrendingUp className="h-16 w-16 md:h-20 md:w-20" strokeWidth={1.5} />,
      title: "💸 Tips",
      metric: "↑ up to 30%",
      label: "Guests tip when the moment feels right",
      description: "",
      visualClass: "card-visual-tips"
    },
    {
      icon: <RefreshCw className="h-16 w-16 md:h-20 md:w-20" strokeWidth={1.5} />,
      title: "🔄 Table Turnover",
      metric: "More guests per shift",
      label: "No waiting, no chasing payments",
      description: "",
      visualClass: "card-visual-turnover"
    },
    {
      icon: <Star className="h-16 w-16 md:h-20 md:w-20" strokeWidth={1.5} />,
      title: "⭐ Reviews",
      metric: "More 5★ moments",
      label: "Great endings turn into great reviews",
      description: "",
      visualClass: "card-visual-reviews"
    }
  ]

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center py-16 md:py-20 scroll-snap-section"
      style={{
        background: 'linear-gradient(135deg, #fdfcfb 0%, #faf9f7 50%, #f7f5f3 100%)',
        width: '100vw'
      }}
    >
      <div className="px-6 max-w-7xl mx-auto w-full">
        {/* Section Title */}
        <motion.h2
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-4xl md:text-5xl lg:text-6xl font-normal text-center mb-12 md:mb-16 text-slate-800 leading-tight"
        >
          What Changes When You Remove the Wait
        </motion.h2>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto mb-12 md:mb-16">
          {cards.map((card, index) => (
            <ImpactCard
              key={index}
              {...card}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Closing Line */}
        <motion.p
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.6,
                delay: 0.5,
                ease: [0.22, 1, 0.36, 1]
              }
            }
          }}
          className="text-xl md:text-2xl text-slate-600 font-semibold text-center max-w-2xl mx-auto leading-relaxed"
          style={{ opacity: 0.85 }}
        >
          Because time is your most valuable ingredient.
        </motion.p>
      </div>
    </section>
  )
}
