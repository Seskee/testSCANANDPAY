import { QrCode, CreditCard, Heart, Users, Clock, TrendingUp, Zap, ArrowRight, Mail, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ImpactCards } from "@/components/ImpactCards"
import { GuestBenefitsCards } from "@/components/GuestBenefitsCards"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { useEffect, useRef, useState } from "react"

export function HomePage() {
  const navigate = useNavigate()

  // State to track which statement underlines should be animated
  const [animateRemember, setAnimateRemember] = useState(false)
  const [animateNever, setAnimateNever] = useState(false)
  const [animateInstant, setAnimateInstant] = useState(false)

  // State to track pulse animation viewport status
  const [pulseInView, setPulseInView] = useState(false)

  // Refs for each statement block
  const rememberRef = useRef<HTMLDivElement>(null)
  const neverRef = useRef<HTMLDivElement>(null)
  const instantRef = useRef<HTMLDivElement>(null)
  const pulseRef = useRef<HTMLSpanElement>(null)

  const handleDemoPayment = () => {
    navigate('/pay?restaurant=demo&table=1')
  }

  const handleGetInTouch = () => {
    window.location.href = 'mailto:scanandpay.contact@gmail.com'
  }

  // Premium animation variants - calm, subtle, refined
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

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  }

  // Hook for scroll animations
  const [heroRef, heroInView] = useInView({ threshold: 0.2, triggerOnce: true })
  const [section2Ref, section2InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section3Ref, section3InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section4Ref, section4InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section5Ref, section5InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section6Ref, section6InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section7Ref, section7InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section8Ref, section8InView] = useInView({ threshold: 0.3, triggerOnce: true })
  const [section9Ref, section9InView] = useInView({ threshold: 0.3, triggerOnce: true })

  // Scroll-driven underline animations for Section 5
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6 // Element needs to be 60% visible to trigger
    }

    const handleRememberIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animateRemember) {
          setAnimateRemember(true)
        }
      })
    }

    const handleNeverIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animateNever) {
          setAnimateNever(true)
        }
      })
    }

    const handleInstantIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animateInstant) {
          setAnimateInstant(true)
        }
      })
    }

    const rememberObserver = new IntersectionObserver(handleRememberIntersection, observerOptions)
    const neverObserver = new IntersectionObserver(handleNeverIntersection, observerOptions)
    const instantObserver = new IntersectionObserver(handleInstantIntersection, observerOptions)

    if (rememberRef.current) rememberObserver.observe(rememberRef.current)
    if (neverRef.current) neverObserver.observe(neverRef.current)
    if (instantRef.current) instantObserver.observe(instantRef.current)

    return () => {
      if (rememberRef.current) rememberObserver.unobserve(rememberRef.current)
      if (neverRef.current) neverObserver.unobserve(neverRef.current)
      if (instantRef.current) instantObserver.unobserve(instantRef.current)
    }
  }, [animateRemember, animateNever, animateInstant])

  // Pulse animation viewport tracking (continuous, not triggerOnce)
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 // Section needs to be 50% visible
    }

    const handlePulseIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        setPulseInView(entry.isIntersecting)
      })
    }

    const pulseObserver = new IntersectionObserver(handlePulseIntersection, observerOptions)

    if (pulseRef.current) pulseObserver.observe(pulseRef.current)

    return () => {
      if (pulseRef.current) pulseObserver.unobserve(pulseRef.current)
    }
  }, [])

  const faqData = [
    {
      question: "Do guests need to download an app?",
      answer: "No. Scan&Pay is 100% web-based. Guests scan the QR code at their table and the payment page opens instantly in their mobile browser. No apps. No logins. No friction. Just scan → tip → pay → done."
    },
    {
      question: "Is it secure?",
      answer: "Absolutely. All payments are protected by bank-level encryption and SSL/TLS protocols. We're fully PCI-DSS compliant and use Stripe — the same infrastructure trusted by Amazon, Lyft, and Shopify. Your data and your guests' data are never stored on our servers."
    },
    {
      question: "Can we integrate Scan&Pay with our existing POS?",
      answer: "Yes. We integrate directly with the most popular POS systems including Square, Toast, Clover, and Lightspeed. The integration is seamless — no new hardware, no new workflows, no staff retraining. Bills sync automatically and payments are marked as complete in real-time."
    },
    {
      question: "Will this slow down our staff or change how they work?",
      answer: "The opposite. Scan&Pay removes friction, not adds it. Staff no longer need to run cards, split checks manually, or wait for guests to settle up. They simply serve, and guests pay when they're ready. Most restaurants see staff spending 40% less time managing payments — time they can redirect to hospitality."
    }
  ]

  return (
    <div className="w-full overflow-x-hidden scroll-snap-container" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
      {/* Section 1: Hero - Hospitality without the wait */}
      <section
        ref={heroRef}
        className="relative flex items-center justify-center overflow-hidden scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #f0f4f8 50%, #e8eef4 100%)',
          minHeight: 'calc(100vh - 4rem)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="text-center px-6 max-w-5xl mx-auto"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-normal mb-4 leading-tight tracking-tight text-slate-800"
          >
            <div className="block">Hospitality</div>
            <div className="block">
              <span className="curved-underline whitespace-nowrap">
                without the wait
                <svg viewBox="0 0 300 18" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                  <defs>
                    <filter id="hand-drawn-filter">
                      <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise" seed="5" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                  </defs>
                  <path d="M 5 12 Q 40 9, 80 13 Q 120 11, 160 14 Q 200 10, 240 12 Q 270 13, 295 11" />
                </svg>
              </span>
              .
            </div>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-base md:text-lg text-slate-600 font-normal leading-relaxed mb-8 max-w-2xl mx-auto"
          >
            Guests pay in seconds. Staff serve more tables. Everyone leaves happier.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Button
              onClick={handleDemoPayment}
              size="lg"
              className="group bg-slate-800 text-white hover:bg-slate-700 px-10 py-6 rounded-full text-base font-normal shadow-lg hover:shadow-xl hover-cta-button"
            >
              Try Demo Now
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 2: How It Works */}
      <section
        ref={section2Ref}
        className="relative md:h-screen flex items-center justify-center py-16 md:py-0 scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #fdfcfb 0%, #faf9f7 50%, #f7f5f3 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section2InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="px-6 max-w-6xl mx-auto w-full"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-normal text-center mb-8 md:mb-12 text-slate-800 leading-tight"
          >
            Three Steps. Zero Friction.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 lg:gap-16 max-w-5xl mx-auto">
            <motion.div
              variants={fadeInUp}
              custom={0}
              className="text-center space-y-2 md:space-y-3 group"
            >
              <div className="inline-flex items-center justify-center mb-2 md:mb-3 transition-transform duration-300 group-hover:scale-105">
                <QrCode className="h-9 w-9 md:h-11 md:w-11 text-slate-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-medium text-slate-800 mb-1 md:mb-2">Scan</h3>
              <p className="text-slate-600 leading-relaxed font-normal text-sm">
                Guest scans QR code at table
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              custom={1}
              transition={{ delay: 0.15 }}
              className="text-center space-y-2 md:space-y-3 group"
            >
              <div className="inline-flex items-center justify-center mb-2 md:mb-3 transition-transform duration-300 group-hover:scale-105">
                <Heart className="h-9 w-9 md:h-11 md:w-11 text-slate-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-medium text-slate-800 mb-1 md:mb-2">Tip</h3>
              <p className="text-slate-600 leading-relaxed font-normal text-sm">
                Choose tip amount in one tap
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              custom={2}
              transition={{ delay: 0.3 }}
              className="text-center space-y-2 md:space-y-3 group"
            >
              <div className="inline-flex items-center justify-center mb-2 md:mb-3 transition-transform duration-300 group-hover:scale-105">
                <CreditCard className="h-9 w-9 md:h-11 md:w-11 text-slate-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-xl font-medium text-slate-800 mb-1 md:mb-2">Pay</h3>
              <p className="text-slate-600 leading-relaxed font-normal text-sm">
                Done with Apple Pay or Google Pay
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Section 3: For Guests - Redesigned with glassmorphism cards */}
      <GuestBenefitsCards />

      {/* Section 4: For Restaurants */}
      <section
        ref={section4Ref}
        className="relative h-screen flex items-center justify-center scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #faf9f7 0%, #f5f3f1 50%, #f0ede9 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section4InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="px-6 max-w-5xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-5xl md:text-6xl font-normal mb-16 text-slate-800 leading-tight"
          >
            For Restaurants
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-10 max-w-4xl mx-auto">
            <motion.div variants={fadeInUp} className="text-left space-y-3 group">
              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-slate-600 mt-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                <div>
                  <h3 className="text-lg font-normal text-slate-800 mb-1 hover-text-primary">
                    Faster table turnover
                  </h3>
                  <p className="text-slate-600 text-sm font-normal leading-relaxed hover-text-secondary" style={{opacity: 0.9}}>
                    Serve more guests per shift
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-left space-y-3 group">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-6 w-6 text-slate-600 mt-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                <div>
                  <h3 className="text-lg font-normal text-slate-800 mb-1 hover-text-primary">
                    Higher tips
                  </h3>
                  <p className="text-slate-600 text-sm font-normal leading-relaxed hover-text-secondary" style={{opacity: 0.9}}>
                    Up to 35% increase in average tip
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-left space-y-3 group">
              <div className="flex items-start gap-4">
                <Zap className="h-6 w-6 text-slate-600 mt-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                <div>
                  <h3 className="text-lg font-normal text-slate-800 mb-1 hover-text-primary">
                    Zero setup time
                  </h3>
                  <p className="text-slate-600 text-sm font-normal leading-relaxed hover-text-secondary" style={{opacity: 0.9}}>
                    Print QR codes and start immediately
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-left space-y-3 group">
              <div className="flex items-start gap-4">
                <Users className="h-6 w-6 text-slate-600 mt-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                <div>
                  <h3 className="text-lg font-normal text-slate-800 mb-1 hover-text-primary">
                    Staff can focus
                  </h3>
                  <p className="text-slate-600 text-sm font-normal leading-relaxed hover-text-secondary" style={{opacity: 0.9}}>
                    Less time chasing payments
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Section 5: The Payment Experience Guests Remember */}
      <section
        ref={section5Ref}
        className="relative h-screen flex items-center justify-center scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #e8eef4 0%, #e0e8f0 50%, #d8e2ec 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section5InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="px-6 max-w-5xl mx-auto text-center"
        >
          {/* Section Title - Isolated */}
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-normal mb-16 md:mb-20 text-slate-800 leading-tight"
          >
            The Payment Experience Guests Remember
          </motion.h2>

          {/* Three Equal Statements - Unified Block */}
          <div className="flex flex-col items-center justify-center space-y-8 md:space-y-10 max-w-4xl mx-auto">
            {/* Statement 1 */}
            <motion.div
              ref={rememberRef}
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <h3 className="text-xl md:text-2xl text-slate-800 font-normal leading-tight">
                The Last Thing They See. The First Thing They{' '}
                <span className={`editorial-underline-word ${animateRemember ? 'animate-in' : ''}`} data-word="remember">
                  Remember
                  <svg viewBox="0 0 200 16" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <defs>
                      <filter id="editorial-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" result="noise" seed="7" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
                      </filter>
                    </defs>
                    <path d="M 5 10 Q 35 7, 70 11 Q 105 9, 140 10 Q 170 11, 195 9" />
                  </svg>
                </span>.
              </h3>
              <p className="text-sm md:text-base text-slate-600 font-normal leading-relaxed">
                Turning simple payments into memorable moments.
              </p>
            </motion.div>

            {/* Statement 2 */}
            <motion.div
              ref={neverRef}
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <h3 className="text-xl md:text-2xl text-slate-800 font-normal leading-tight">
                Service That{' '}
                <span className={`editorial-underline-word ${animateNever ? 'animate-in' : ''}`} data-word="never">
                  Never
                  <svg viewBox="0 0 200 16" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M 5 10 Q 35 8, 70 10 Q 105 11, 140 9 Q 170 10, 195 11" />
                  </svg>
                </span>{' '}
                Slows You Down.
              </h3>
              <p className="text-sm md:text-base text-slate-600 font-normal leading-relaxed">
                Instant service that makes guests feel valued — from first scan to goodbye.
              </p>
            </motion.div>

            {/* Statement 3 */}
            <motion.div
              ref={instantRef}
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <h3 className="text-xl md:text-2xl text-slate-800 font-normal leading-tight">
                Skip the Waiter — Goodbye waiting. Hello{' '}
                <span className={`editorial-underline-word ${animateInstant ? 'animate-in' : ''}`} data-word="instant">
                  instant
                  <svg viewBox="0 0 200 16" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M 5 11 Q 35 9, 70 11 Q 105 10, 140 11 Q 170 9, 195 10" />
                  </svg>
                </span>{' '}
                payment.
              </h3>
              <p className="text-sm md:text-base text-slate-600 font-normal leading-relaxed">
                Freedom to pay on your own time, without interrupting the flow.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Section 6: Real-Time Dashboard */}
      <section
        ref={section6Ref}
        className="relative h-screen flex items-center justify-center scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #f5f3f1 0%, #f0ede9 50%, #ebe6e1 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section6InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="px-6 max-w-4xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-5xl md:text-6xl font-normal mb-10 text-slate-800 leading-tight"
          >
            The <span ref={pulseRef} className={`heartbeat-pulse ${pulseInView ? 'in-view' : 'out-of-view'}`}>Pulse</span> of Your Restaurant
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-xl md:text-2xl text-slate-600 font-normal leading-relaxed mb-16 max-w-2xl mx-auto"
          >
            Track revenue, tips, and table status as they happen
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Button
              onClick={() => navigate('/dashboard/demo')}
              size="lg"
              className="group bg-slate-800 text-white hover:bg-slate-700 px-10 py-6 rounded-full text-base font-normal shadow-lg hover:shadow-xl hover-cta-button"
            >
              View Live Dashboard
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 7: Works With Your POS */}
      <section
        ref={section7Ref}
        className="relative h-screen flex items-center justify-center scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #e0e8f0 0%, #d8e2ec 50%, #d0dce8 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section7InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="px-6 max-w-5xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-5xl md:text-6xl font-normal mb-16 text-slate-800 leading-tight"
          >
            Works With Your POS
          </motion.h2>

          <div className="space-y-8 max-w-3xl mx-auto">
            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-slate-700 font-normal leading-relaxed hover-text-primary"
            >
              Integrates seamlessly with existing systems
            </motion.p>

            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-slate-700 font-normal leading-relaxed hover-text-primary"
            >
              No workflow changes
            </motion.p>

            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-slate-700 font-normal leading-relaxed hover-text-primary"
            >
              No staff retraining needed
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* Section 8: FAQ */}
      <section
        ref={section8Ref}
        className="relative flex items-center justify-center py-16 md:py-20 scroll-snap-section"
        style={{
          background: 'linear-gradient(135deg, #faf9f7 0%, #f5f3f1 50%, #f0ede9 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section8InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="px-6 max-w-4xl mx-auto w-full"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-normal text-center mb-12 md:mb-16 text-slate-800 leading-tight tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Everything You Might Be Wondering
          </motion.h2>

          <motion.div variants={fadeInUp}>
            <Accordion type="single" collapsible className="space-y-3 md:space-y-4">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-0 bg-transparent">
                  <AccordionTrigger className="text-left hover:no-underline px-6 md:px-8 py-5 md:py-6 hover:bg-white/40 transition-colors duration-200 rounded-xl border border-slate-200/60">
                    <span className="text-base md:text-lg font-medium text-slate-800 pr-4">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 md:px-8 py-4 md:py-5 text-slate-600 leading-relaxed text-sm md:text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 9: What Changes When You Remove the Wait - Impact Cards */}
      <ImpactCards />

      {/* Section 10: Final CTA */}
      <section
        ref={section9Ref}
        className="relative flex items-center justify-center scroll-snap-section px-6 py-16 md:py-20"
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #f0f4f8 50%, #e8eef4 100%)',
          width: '100vw'
        }}
      >
        <motion.div
          initial="hidden"
          animate={section9InView ? "visible" : "hidden"}
          variants={staggerChildren}
          className="w-full max-w-3xl mx-auto text-center space-y-8 md:space-y-12"
        >
          {/* Headline */}
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-normal text-slate-800 leading-tight tracking-tight"
          >
            Ready to transform your restaurant?
          </motion.h2>

          {/* Supporting Text */}
          <motion.div variants={fadeInUp} className="space-y-6 max-w-2xl mx-auto">
            <p className="text-lg md:text-xl text-slate-700 font-normal leading-relaxed">
              Take your dining experience to next level.
            </p>
            <p className="text-base md:text-lg text-slate-600 font-normal leading-relaxed">
              See how Scan&Pay improves service speed, increases tips, and fits seamlessly into your existing operations — without changing your workflow.
            </p>
            <p className="text-base md:text-lg text-slate-600 font-normal leading-relaxed">
              Let us show you how effortless modern dining can be.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            {/* Primary Button */}
            <Button
              onClick={handleDemoPayment}
              size="lg"
              className="w-full sm:w-auto group bg-slate-800 text-white hover:bg-slate-700 px-10 py-6 rounded-full text-base font-normal shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
            >
              Try Demo
            </Button>

            {/* Secondary Button */}
            <Button
              onClick={handleGetInTouch}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto group border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 px-10 py-6 rounded-full text-base font-normal transition-all duration-300 hover:scale-[1.02]"
            >
              Get in Touch → scanandpay.contact@gmail.com
            </Button>
          </motion.div>

          {/* Micro-Footer */}
          <motion.div
            variants={fadeInUp}
            className="pt-8"
          >
            <p className="text-xs text-slate-400 font-normal text-center">
              © Scan&Pay — Built for modern hospitality
            </p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
