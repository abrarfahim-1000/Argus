import { useRef, useEffect } from 'react'
import {
  Eye, Sun, Moon, Search, ArrowUp,
  TrendingDown, TrendingUp, CalendarDays, Landmark,
  Sparkles, ArrowLeft, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChat } from '@/hooks/useChat'
import { cn } from '@/lib/utils'

// ─── Market Ticker ────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { symbol: 'SPY',  price: '512.40', change: '-1.2%',  up: false },
  { symbol: 'QQQ',  price: '430.18', change: '-2.0%',  up: false },
  { symbol: 'VIX',  price: '18.5',   change: '+12.4%', up: true  },
  { symbol: 'BTC',  price: '67,240', change: '+1.8%',  up: true  },
  { symbol: 'GC=F', price: '2,341',  change: '+0.4%',  up: true  },
  { symbol: 'ETH',  price: '3,420',  change: '+0.9%',  up: true  },
  { symbol: 'DJI',  price: '38,992', change: '-0.7%',  up: false },
  { symbol: 'CL=F', price: '82.14',  change: '+1.1%',  up: true  },
]

function TickerRow() {
  return (
    <div className="flex items-center">
      {TICKER_ITEMS.map((item, i) => (
        <div key={i} className="flex items-center">
          <div className="flex items-center gap-1.5 px-4">
            <span className="font-mono text-[11px] text-muted-foreground">{item.symbol}</span>
            <span className="font-mono text-[11px] tabular-nums text-foreground">{item.price}</span>
            <span className={cn(
              'font-mono text-[11px] tabular-nums',
              item.up ? 'text-[var(--argus)]' : 'text-red-500 dark:text-red-400'
            )}>
              {item.change}
            </span>
          </div>
          <div className="w-px h-3 bg-border shrink-0" aria-hidden="true" />
        </div>
      ))}
    </div>
  )
}

function MarketTicker() {
  return (
    <div
      className="relative overflow-hidden border-b border-border bg-background/60 backdrop-blur-md ticker-container"
      aria-label="Live market ticker"
    >
      <div className="ticker-track flex w-max py-2" aria-hidden="true">
        <TickerRow />
        <TickerRow />
      </div>
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pl-12 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none">
        <Badge
          variant="outline"
          className="font-mono text-[9px] tracking-widest border-[var(--argus)]/40 text-[var(--argus)] bg-[var(--argus)]/5 gap-1.5 h-auto py-0.5 px-2 pointer-events-auto"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--argus)] animate-pulse shrink-0" aria-hidden="true" />
          LIVE
        </Badge>
      </div>
    </div>
  )
}

// ─── Chat Nav ─────────────────────────────────────────────────────────────────

function ChatNav({ isDark, onToggle, onBack }) {
  return (
    <nav className="flex items-center justify-between px-5 py-3 border-b border-border/50">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to home"
            className="rounded-full w-8 h-8"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
        <div className="flex items-center gap-1.5 font-semibold text-sm tracking-[0.25em] uppercase text-foreground select-none">
          <Eye className="w-4 h-4 text-[var(--argus)]" strokeWidth={2.5} aria-hidden="true" />
          <span>ARG<span className="text-[var(--argus)]">U</span>S</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="rounded-full w-8 h-8 border border-border"
      >
        {isDark
          ? <Sun className="w-4 h-4" aria-hidden="true" />
          : <Moon className="w-4 h-4" aria-hidden="true" />
        }
      </Button>
    </nav>
  )
}

// ─── Hero Header ──────────────────────────────────────────────────────────────

function HeroHeader({ collapsed }) {
  return (
    <div
      className={cn(
        'w-full text-center transition-all duration-700 ease-in-out overflow-hidden origin-top',
        collapsed ? 'max-h-0 opacity-0 mb-0 py-0' : 'max-h-56 opacity-100 mb-10 pt-10 pb-2'
      )}
      aria-hidden={collapsed}
    >
      <p className="font-mono text-[10px] text-[var(--argus)] tracking-[0.25em] uppercase mb-3 opacity-80">
        AI-Powered Financial Intelligence
      </p>
      <h1 className="text-2xl md:text-4xl font-semibold text-foreground tracking-tight">
        Ask anything about the{' '}
        <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-[var(--argus)] to-sky-300 pr-0.5">
          market
        </span>
      </h1>
    </div>
  )
}

// ─── Prompt Suggestions ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  { Icon: TrendingDown, title: 'Why is Nvidia falling today?',      desc: 'Analyze technicals and news driving NVDA.' },
  { Icon: TrendingUp,   title: 'Why is Bitcoin rising this week?',  desc: 'Check ETF inflows and macro drivers.' },
  { Icon: CalendarDays, title: 'What should I watch this week?',    desc: 'Upcoming earnings and economic data.' },
  { Icon: Landmark,     title: 'What did the Fed say about rates?', desc: 'Summary of latest FOMC statements.' },
]

function PromptSuggestions({ onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {SUGGESTIONS.map(({ Icon, title, desc }, i) => (
        <button
          key={i}
          onClick={() => onSelect(title)}
          className={cn(
            'text-left p-5 rounded-2xl border group cursor-pointer',
            'bg-white/50 dark:bg-white/[0.04] backdrop-blur-xl',
            'border-black/[0.08] dark:border-white/[0.08]',
            'hover:bg-[var(--argus)]/[0.08] hover:border-[var(--argus)]/40',
            'hover:-translate-y-1.5',
            'hover:shadow-[0_12px_32px_-8px_rgba(0,136,170,0.18)]',
            'dark:hover:shadow-[0_12px_32px_-8px_rgba(0,212,255,0.18)]',
            'transition-all duration-300 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--argus)]/50',
          )}
        >
          <Icon className="w-5 h-5 text-[var(--argus)] mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground mb-1">{title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{desc}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Message Bubbles ──────────────────────────────────────────────────────────

function UserBubble({ content }) {
  return (
    <div className="flex gap-3 justify-end w-full">
      <div className="max-w-[80%]">
        <div className="glass-user text-sm text-foreground px-4 py-3 rounded-2xl rounded-tr-sm leading-relaxed">
          {content}
        </div>
      </div>
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-mono text-muted-foreground bg-muted border border-border"
        aria-hidden="true"
      >
        U
      </div>
    </div>
  )
}

function AssistantBubble({ content, sources = [] }) {
  return (
    <div className="flex gap-3 w-full">
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 bg-[var(--argus)]/10 border border-[var(--argus)]/30"
        aria-hidden="true"
      >
        <Sparkles className="w-4 h-4 text-[var(--argus)]" aria-hidden="true" />
      </div>
      <div className="max-w-[85%] flex flex-col gap-2.5">
        <div className="glass-ai text-sm text-foreground px-4 py-3.5 rounded-2xl rounded-tl-sm leading-relaxed">
          {content}
        </div>
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sources.map((src, i) => (
              <Badge
                key={i}
                variant="outline"
                className="font-mono text-[10px] gap-1 h-auto py-1 px-2.5 cursor-pointer hover:text-[var(--argus)] hover:border-[var(--argus)]/40 hover:bg-[var(--argus)]/5 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                {src}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex gap-3 w-full" role="status" aria-label="Argus is thinking">
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-[var(--argus)]/10 border border-[var(--argus)]/30">
        <Sparkles className="w-4 h-4 text-[var(--argus)]" aria-hidden="true" />
      </div>
      <div className="glass-ai flex items-center gap-1.5 px-4 rounded-2xl rounded-tl-sm h-[46px]">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--argus)]" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--argus)]" style={{ animationDelay: '0.16s' }} />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--argus)]" style={{ animationDelay: '0.32s' }} />
      </div>
    </div>
  )
}

// ─── Chat History ─────────────────────────────────────────────────────────────

function ChatHistory({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div
      className="flex flex-col gap-6 w-full"
      role="log"
      aria-live="polite"
      aria-label="Chat history"
    >
      {messages.map(msg =>
        msg.role === 'user' ? (
          <UserBubble key={msg.id} content={msg.content} />
        ) : (
          <AssistantBubble key={msg.id} content={msg.content} sources={msg.sources} />
        )
      )}
      {isLoading && <TypingBubble />}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}

// ─── Chat Input Bar ───────────────────────────────────────────────────────────

function ChatInputBar({ value, onChange, onSubmit, isLoading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 px-4 md:px-6 pb-6 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="floating-pill flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-300">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about any market, asset, or trend..."
            disabled={isLoading}
            aria-label="Ask Argus a question"
            className={cn(
              'flex-1 bg-transparent border-none outline-none',
              'text-sm text-foreground placeholder:text-muted-foreground/60',
              'min-h-[40px]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
          <Button
            size="icon"
            onClick={onSubmit}
            disabled={!value.trim() || isLoading}
            aria-label="Send message"
            className={cn(
              'rounded-full w-8 h-8 shrink-0 border-0',
              'bg-[var(--argus)] hover:bg-[var(--argus)]/90 text-background',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-200',
              'hover:shadow-[0_0_16px_rgba(0,136,170,0.5)] dark:hover:shadow-[0_0_16px_rgba(0,212,255,0.5)]',
            )}
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-center mt-2.5 text-[10px] font-mono text-muted-foreground/40 tracking-wider uppercase">
          Argus can make mistakes. Verify important data.
        </p>
      </div>
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function ChatPage({ isDark, onToggle, onBack }) {
  const { messages, input, setInput, isLoading, sendMessage } = useChat()
  const hasMessages = messages.length > 0

  return (
    <div
      className="bg-background h-screen w-screen overflow-hidden text-foreground flex flex-col selection:bg-[var(--argus)]/30"
    >
      <style>{`
        :root { --argus: #0088aa; }
        .dark { --argus: #00d4ff; }

        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: tickerScroll 45s linear infinite;
        }
        .ticker-container:hover .ticker-track {
          animation-play-state: paused;
        }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .typing-dot {
          animation: typingBounce 1.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
          .typing-dot   { animation: none; opacity: 1; }
        }

        /* Glass bubble — user (teal) */
        .glass-user {
          background: linear-gradient(135deg, rgba(0,136,170,0.22) 0%, rgba(0,136,170,0.07) 100%);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0,136,170,0.25);
          border-top-color: rgba(0,136,170,0.5);
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(0,136,170,0.25);
        }
        .dark .glass-user {
          background: linear-gradient(135deg, rgba(0,212,255,0.18) 0%, rgba(0,212,255,0.05) 100%);
          border-color: rgba(0,212,255,0.22);
          border-top-color: rgba(0,212,255,0.5);
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,212,255,0.22);
        }

        /* Glass bubble — assistant (neutral).
           Translucent (no backdrop-filter) so the ambient glow tints through
           without the GPU compositing seam blur() produces in light mode. */
        .glass-ai {
          background: linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.62) 100%);
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.08);
        }
        .dark .glass-ai {
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%);
          border-color: rgba(255,255,255,0.1);
          border-top-color: rgba(255,255,255,0.22);
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.09);
        }

        /* Floating translucent input pill */
        .floating-pill {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(28px) saturate(150%);
          -webkit-backdrop-filter: blur(28px) saturate(150%);
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow:
            0 12px 40px -8px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .floating-pill:focus-within {
          border-color: rgba(0,136,170,0.5);
          box-shadow:
            0 12px 48px -8px rgba(0,136,170,0.28),
            inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .dark .floating-pill {
          background: rgba(20,24,30,0.55);
          border-color: rgba(255,255,255,0.12);
          box-shadow:
            0 12px 40px -8px rgba(0,0,0,0.7),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .dark .floating-pill:focus-within {
          border-color: rgba(0,212,255,0.5);
          box-shadow:
            0 12px 48px -8px rgba(0,212,255,0.28),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }
      `}</style>

      {/* Ambient bluish lighting — diffuses behind the glass.
          Kept in the upper region so it never reaches the input scrim. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-[var(--argus)]/[0.10] blur-[120px]" />
        <div className="absolute -top-[5%] right-[-12%] w-[48vw] h-[48vw] rounded-full bg-blue-600/[0.08] blur-[140px]" />
      </div>

      {/* Fixed header: ticker + nav */}
      <header className="relative flex-shrink-0 z-10">
        <MarketTicker />
        <ChatNav isDark={isDark} onToggle={onToggle} onBack={onBack} />
      </header>

      {/* Scrollable body */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center w-full max-w-3xl mx-auto px-4 md:px-6 pb-44">
          <HeroHeader collapsed={hasMessages} />

          {/* Prompt cards — collapses once chat starts */}
          <div className={cn(
            'w-full transition-all duration-500 ease-out',
            hasMessages ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'
          )}>
            <PromptSuggestions onSelect={sendMessage} />
          </div>

          {/* Chat messages — appears after first message */}
          {hasMessages && (
            <ChatHistory messages={messages} isLoading={isLoading} />
          )}
        </div>
      </main>

      {/* Floating input — always visible */}
      <ChatInputBar
        value={input}
        onChange={setInput}
        onSubmit={() => sendMessage(input)}
        isLoading={isLoading}
      />
    </div>
  )
}
