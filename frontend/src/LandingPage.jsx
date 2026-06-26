import { useState, useEffect, useRef } from 'react'
import {
  Eye, ArrowRight, Sun, Moon,
  Activity, Rss, Brain, Link2
} from 'lucide-react'

const LinkedinIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
)

const GithubIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
)
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Background Canvas ──────────────────────────────────────────────────────

function BackgroundCanvas({ isDark }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY } }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouse)
    resize()

    const gridColor  = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)'
    const waveColor  = isDark ? 'rgba(0,212,255,0.07)'    : 'rgba(0,136,170,0.10)'
    const spotInner  = isDark ? 'rgba(0,212,255,0.10)'    : 'rgba(0,136,170,0.05)'
    const spotOuter  = 'rgba(0,0,0,0)'

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x, y } = mouseRef.current
      const g = ctx.createRadialGradient(x, y, 0, x, y, 600)
      g.addColorStop(0, spotInner)
      g.addColorStop(1, spotOuter)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      for (let gx = 0; gx < canvas.width; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke()
      }
      for (let gy = 0; gy < canvas.height; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke()
      }

      ctx.strokeStyle = waveColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let wx = 0; wx < canvas.width; wx++) {
        const wy = canvas.height / 2
          + Math.sin(wx * 0.01 + time) * 40
          + Math.sin(wx * 0.03 - time * 0.5) * 15
          + (Math.random() * 2 - 1)
        if (wx === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy)
      }
      ctx.stroke()

      time += 0.02
      rafId = requestAnimationFrame(render)
    }

    render()
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
      cancelAnimationFrame(rafId)
    }
  }, [isDark])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
}

// ─── Intersection Observer hook ─────────────────────────────────────────────

function useInView(threshold = 0.4) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold }
    )
    obs.observe(el)
    return () => obs.unobserve(el)
  }, [threshold])

  return [ref, visible]
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ isDark, onToggle }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-10">
      <div className="flex items-center gap-2 font-semibold text-base tracking-[0.25em] uppercase text-foreground select-none">
        <Eye className="w-5 h-5 text-[var(--argus)]" strokeWidth={2.5} aria-hidden="true" />
        ARGUS
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-full border border-border"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-xs tracking-widest uppercase"
        >
          Launch App
        </Button>
      </div>
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroSection({ id }) {
  const [ref, visible] = useInView(0.3)

  return (
    <section
      id={id}
      ref={ref}
      className="snap-section relative flex flex-col items-center justify-center z-10"
    >
      {/* Decorative price-chart line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-50" aria-hidden="true">
        <svg viewBox="0 0 1000 300" className="w-[130%] h-auto max-w-none" preserveAspectRatio="none">
          <path
            d="M0,250 L100,240 L150,260 L200,200 L250,220 L300,100 L350,150 L400,80 L500,90 L550,40 L600,120 L700,100 L800,180 L850,150 L900,220 L1000,180"
            fill="none"
            stroke="var(--argus)"
            strokeWidth="2"
            className="draw-line"
          />
        </svg>
      </div>

      <div
        className={cn(
          'text-center z-10 transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}
      >
        <h1 className="font-bold leading-none tracking-tighter text-foreground select-none"
            style={{ fontSize: 'clamp(4.5rem, 17vw, 14rem)' }}>
          ARGUS
        </h1>
        <p
          className="text-muted-foreground mt-6 text-sm md:text-base tracking-[0.25em] uppercase transition-all duration-700"
          style={{ transitionDelay: '100ms' }}
        >
          Know why the market moves.
        </p>
      </div>

      <div
        className={cn(
          'absolute bottom-10 flex flex-col items-center gap-3 transition-all duration-700',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDelay: '200ms' }}
        aria-hidden="true"
      >
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
          Scroll to explore
        </span>
        <div className="w-px h-10 bg-gradient-to-b from-[var(--argus)] to-transparent animate-pulse" />
      </div>
    </section>
  )
}

// ─── Feature Section ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'feature-1',
    Icon: Activity,
    heading: 'Real-time market data.',
    text: 'Live prices for indices, crypto, commodities — always current. We map the landscape the second you ask.',
    source: 'LIVE: SPY, QQQ, BTC-USD',
    reversed: false,
  },
  {
    id: 'feature-2',
    Icon: Rss,
    heading: 'News, retrieved and ranked.',
    text: 'RSS feeds from Reuters, CNBC, MarketWatch parsed every 15 minutes. Signal extraction, zero noise.',
    source: 'PIPELINE: 4 SOURCES',
    reversed: true,
  },
  {
    id: 'feature-3',
    Icon: Brain,
    heading: 'RAG-powered answers.',
    text: 'Semantically relevant context retrieved before every response. Our agents actually read the news before they speak.',
    source: 'EMBEDDINGS: all-MiniLM-L6-v2',
    reversed: false,
  },
  {
    id: 'feature-4',
    Icon: Link2,
    heading: 'Cited explanations.',
    text: 'Every answer links back to its sources. Verify the logic, audit the data, trust the process.',
    source: 'STATUS: AUDITABLE',
    reversed: true,
  },
]

function FeatureSection({ id, Icon, heading, text, source, reversed }) {
  const [ref, visible] = useInView(0.35)

  return (
    <section
      id={id}
      ref={ref}
      className="snap-section relative flex items-center justify-center px-8 md:px-24 z-10"
    >
      <div
        className={cn(
          'w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 md:gap-24',
          reversed && 'md:flex-row-reverse'
        )}
      >
        {/* Heading side */}
        <div
          className={cn(
            'flex-1 transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-[var(--argus)]/30 bg-[var(--argus)]/10 mb-6">
            <Icon className="w-6 h-6 text-[var(--argus)]" aria-hidden="true" />
          </div>
          <h2 className="font-bold text-4xl md:text-6xl lg:text-7xl leading-tight tracking-tight">
            {heading.split(' ').map((word, i) => (
              <span
                key={i}
                className={word.includes('.') ? 'text-[var(--argus)]' : 'text-foreground'}
              >
                {word}{' '}
              </span>
            ))}
          </h2>
        </div>

        {/* Text side */}
        <div
          className={cn(
            'flex-1 transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
          style={{ transitionDelay: '100ms' }}
        >
          <div className="border-l-2 border-border pl-6 md:pl-10 py-2">
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              {text}
            </p>
            {source && (
              <div className="mt-5">
                <Badge
                  variant="outline"
                  className="font-mono text-[0.68rem] tracking-wider border-[var(--argus)]/40 text-[var(--argus)] bg-[var(--argus)]/5 gap-1.5 py-1.5 px-3 h-auto"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--argus)] animate-pulse shrink-0" />
                  {source}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Audience Section ─────────────────────────────────────────────────────────

const AUDIENCES = [
  {
    title: 'Retail Investors',
    desc: 'Ask why your portfolio moved. Get cited answers, not guesses.',
    label: 'PORTFOLIO_01',
  },
  {
    title: 'Finance Students',
    desc: 'Learn what drives markets by watching it happen in real time.',
    label: 'LEARNING_02',
  },
  {
    title: 'Researchers',
    desc: 'Query live market conditions and recent news through a single interface.',
    label: 'QUERY_03',
  },
]

function AudienceSection({ id }) {
  const [ref, visible] = useInView(0.3)

  return (
    <section
      id={id}
      ref={ref}
      className="snap-section relative flex flex-col items-center justify-center px-8 md:px-24 z-10"
    >
      <div className="w-full max-w-6xl">
        <h2
          className={cn(
            'font-bold text-3xl md:text-5xl mb-16 text-center text-foreground transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          Who it&apos;s for
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AUDIENCES.map((a, i) => (
            <Card
              key={a.label}
              className={cn(
                'group/card hover:border-[var(--argus)]/50 hover:-translate-y-2 transition-all duration-500 cursor-default',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              )}
              style={{ transitionDelay: `${(i + 1) * 100}ms` }}
            >
              <CardHeader>
                <div className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-[0.25em] mb-1">
                  {a.label}
                </div>
                <CardTitle className="group-hover/card:text-[var(--argus)] transition-colors duration-300">
                  {a.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{a.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer / CTA ─────────────────────────────────────────────────────────────

function FooterSection({ id }) {
  const [ref, visible] = useInView(0.5)

  return (
    <section
      id={id}
      ref={ref}
      className="snap-section relative flex flex-col items-center justify-center px-8 z-10"
    >
      <div
        className={cn(
          'text-center max-w-3xl transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}
      >
        <h2 className="font-bold text-5xl md:text-7xl mb-10 text-foreground leading-tight tracking-tight">
          Ask your first question.
        </h2>

        <Button
          size="lg"
          className="rounded-sm gap-2 font-semibold tracking-wide px-8 h-12 group"
          style={{ background: 'var(--argus)', color: 'oklch(0.145 0 0)' }}
        >
          Launch Platform
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </Button>

        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="LinkedIn"
              asChild
            >
              <a href="#">
                <LinkedinIcon aria-hidden="true" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="GitHub"
              asChild
            >
              <a href="#">
                <GithubIcon aria-hidden="true" />
              </a>
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
            Built to explain markets, not just report them.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const SECTIONS = ['hero', 'feature-1', 'feature-2', 'feature-3', 'feature-4', 'audience', 'footer']

export default function LandingPage() {
  const containerRef = useRef(null)
  const [activeSection, setActiveSection] = useState(0)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      setActiveSection(Math.round(el.scrollTop / window.innerHeight))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const scrollTo = (i) => {
    containerRef.current?.scrollTo({ top: i * window.innerHeight, behavior: 'smooth' })
  }

  return (
    <div className="bg-background h-screen w-screen overflow-hidden text-foreground selection:bg-[var(--argus)]/30">
      <style>{`
        :root { --argus: #0088aa; }
        .dark { --argus: #00d4ff; }

        .snap-section {
          scroll-snap-align: start;
          scroll-snap-stop: always;
          height: 100vh;
          width: 100%;
          position: relative;
        }
        .snap-container {
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .snap-container::-webkit-scrollbar { display: none; }

        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        .draw-line {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: draw 3s cubic-bezier(0.25, 1, 0.5, 1) 0.5s forwards;
        }
      `}</style>

      <BackgroundCanvas isDark={isDark} />
      <Navbar isDark={isDark} onToggle={() => setIsDark(p => !p)} />

      {/* Dot navigation */}
      <div
        className="fixed right-6 md:right-8 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3"
        aria-label="Page sections"
      >
        {SECTIONS.map((id, i) => (
          <button
            key={id}
            onClick={() => scrollTo(i)}
            aria-label={`Go to section ${i + 1}`}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              activeSection === i
                ? 'bg-[var(--argus)] scale-150'
                : 'bg-border hover:bg-muted-foreground'
            )}
          />
        ))}
      </div>

      <main ref={containerRef} className="snap-container h-full w-full">
        <HeroSection id={SECTIONS[0]} />
        {FEATURES.map(f => (
          <FeatureSection key={f.id} {...f} />
        ))}
        <AudienceSection id={SECTIONS[5]} />
        <FooterSection id={SECTIONS[6]} />
      </main>
    </div>
  )
}
