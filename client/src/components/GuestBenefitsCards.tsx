import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"

interface BenefitCardProps {
  title: string
  description: string
  visualClass: string
  visualElement: React.ReactNode
  delay?: number
}

function BenefitCard({ title, description, visualClass, visualElement, delay = 0 }: BenefitCardProps) {
  const [ref, inView] = useInView({ threshold: 0.3, triggerOnce: true })

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay: delay / 1000,
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
      className="glass-card rounded-3xl overflow-hidden flex flex-col"
    >
      {/* Illustration Area - Top */}
      <div className={`${visualClass} h-32 md:h-40 relative flex-shrink-0`}>
        {visualElement}
      </div>

      {/* Content - Bottom Area with proper spacing */}
      <div className="p-6 md:p-8 space-y-3 flex flex-col justify-center flex-grow">
        {/* Title - Clear separation */}
        <h3 className="text-lg md:text-xl font-medium text-slate-800 leading-snug tracking-normal">
          {title}
        </h3>

        {/* Description - Natural spacing */}
        <p className="text-sm md:text-base text-slate-600 font-normal leading-relaxed tracking-normal" style={{ opacity: 0.9, letterSpacing: '0.01em' }}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}

export function GuestBenefitsCards() {
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true })

  const fadeInUp = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  // Visual 1: Payment confirmation screen with checkmark
  const visual1 = (
    <svg className="guest-visual-icon" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Payment confirmation screen */}
      <rect x="15" y="10" width="50" height="60" rx="6" fill="rgb(30, 41, 59)" stroke="rgb(30, 41, 59)" strokeWidth="2"/>
      {/* Screen content area */}
      <rect x="20" y="16" width="40" height="48" rx="3" fill="rgb(248, 250, 252)"/>
      {/* Payment amount bars */}
      <rect x="25" y="22" width="30" height="6" rx="2" fill="rgb(148, 163, 184)"/>
      <rect x="25" y="32" width="20" height="5" rx="2" fill="rgb(203, 213, 225)"/>
      {/* Large checkmark circle */}
      <circle cx="40" cy="50" r="10" fill="rgb(34, 197, 94)"/>
      {/* Checkmark icon */}
      <path d="M 35 50 L 38.5 53.5 L 45 47" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  // Visual 2: Bill divided into 4 equal parts
  const visual2 = (
    <svg className="guest-visual-icon" width="100" height="80" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main bill outline */}
      <rect x="15" y="20" width="70" height="40" rx="4" fill="rgb(30, 41, 59)" stroke="rgb(30, 41, 59)" strokeWidth="2"/>
      {/* Division lines creating 4 parts */}
      <line x1="50" y1="20" x2="50" y2="60" stroke="rgb(248, 250, 252)" strokeWidth="3"/>
      <line x1="15" y1="40" x2="85" y2="40" stroke="rgb(248, 250, 252)" strokeWidth="3"/>
      {/* Bill detail lines in each quadrant */}
      <line x1="20" y1="28" x2="45" y2="28" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="20" y1="33" x2="40" y2="33" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="55" y1="28" x2="80" y2="28" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="55" y1="33" x2="75" y2="33" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="20" y1="48" x2="45" y2="48" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="20" y1="53" x2="40" y2="53" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="55" y1="48" x2="80" y2="48" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
      <line x1="55" y1="53" x2="75" y2="53" stroke="rgb(148, 163, 184)" strokeWidth="2"/>
    </svg>
  )

  // Visual 3: Clock with checkmark (time saved)
  const visual3 = (
    <svg className="guest-visual-icon" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clock circle */}
      <circle cx="40" cy="40" r="22" fill="rgb(30, 41, 59)" stroke="rgb(30, 41, 59)" strokeWidth="3"/>
      {/* Clock face */}
      <circle cx="40" cy="40" r="18" fill="rgb(248, 250, 252)"/>
      {/* Clock hands */}
      <line x1="40" y1="40" x2="40" y2="28" stroke="rgb(30, 41, 59)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="40" x2="48" y2="40" stroke="rgb(30, 41, 59)" strokeWidth="3" strokeLinecap="round"/>
      {/* Center dot */}
      <circle cx="40" cy="40" r="2" fill="rgb(30, 41, 59)"/>
      {/* Checkmark overlay */}
      <circle cx="55" cy="25" r="10" fill="rgb(34, 197, 94)"/>
      <path d="M 51 25 L 54 28 L 59 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  // Visual 4: QR code with checkmark
  const visual4 = (
    <svg className="guest-visual-icon" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* QR code main square */}
      <rect x="20" y="20" width="40" height="40" rx="4" fill="rgb(30, 41, 59)" stroke="rgb(30, 41, 59)" strokeWidth="3"/>
      {/* QR pattern - 3x3 grid of squares */}
      <rect x="26" y="26" width="8" height="8" rx="1" fill="white"/>
      <rect x="36" y="26" width="8" height="8" rx="1" fill="white"/>
      <rect x="46" y="26" width="8" height="8" rx="1" fill="white"/>
      <rect x="26" y="36" width="8" height="8" rx="1" fill="white"/>
      <rect x="36" y="36" width="8" height="8" rx="1" fill="white"/>
      <rect x="46" y="36" width="8" height="8" rx="1" fill="white"/>
      <rect x="26" y="46" width="8" height="8" rx="1" fill="white"/>
      <rect x="36" y="46" width="8" height="8" rx="1" fill="white"/>
      <rect x="46" y="46" width="8" height="8" rx="1" fill="white"/>
      {/* Success checkmark */}
      <circle cx="55" cy="25" r="10" fill="rgb(34, 197, 94)"/>
      <path d="M 51 25 L 54 28 L 59 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const benefits = [
    {
      title: "Pay in seconds",
      description: "No waiting for the bill",
      visualClass: "card-visual-guest-1",
      visualElement: visual1
    },
    {
      title: "Split the bill instantly",
      description: "Even with large groups",
      visualClass: "card-visual-guest-2",
      visualElement: visual2
    },
    {
      title: "Leave when you're ready",
      description: "No awkward waving or waiting",
      visualClass: "card-visual-guest-3",
      visualElement: visual3
    },
    {
      title: "One scan. That's it.",
      description: "No apps. No accounts.",
      visualClass: "card-visual-guest-4",
      visualElement: visual4
    }
  ]

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center py-16 md:py-20 scroll-snap-section"
      style={{
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e8eef4 50%, #e0e8f0 100%)',
        width: '100vw'
      }}
    >
      <div className="px-6 md:px-8 max-w-6xl mx-auto w-full">
        {/* Section Title - Proper spacing */}
        <motion.h2
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-4xl md:text-5xl font-normal text-center mb-12 md:mb-16 text-slate-800 leading-tight tracking-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          For Guests
        </motion.h2>

        {/* Cards Grid - Balanced spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              {...benefit}
              delay={index * 120}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
