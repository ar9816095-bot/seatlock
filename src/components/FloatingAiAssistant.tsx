import { useState } from 'react';
import { Bot, Compass, HelpCircle, Send, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePreferences } from '../context/PreferencesContext';
import { Button } from './FormControls';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  actionLabel?: string;
  actionRoute?: string;
}

const QUICK_TOPICS = [
  'How does the 5-minute hold work?',
  'Explain seat map colors',
  'How does SeatShield handle conflicts?',
  'Help me pick seats for a group',
];

function getLocalGuidanceReply(query: string, activeEventId: string | null): Omit<ChatMessage, 'id' | 'role'> {
  const lower = query.toLowerCase();

  if (/(hold|timer|5|five|expire|countdown)/.test(lower)) {
    return {
      text: 'Once you select up to 4 seats and click "Hold Seats", SEATLOCK reserves them exclusively for you for 5 minutes. The checkout countdown calculates remaining time directly from the server expiration timestamp so it stays accurate even if you switch tabs. If it expires, seats return to the auditorium pool automatically.',
    };
  }
  if (/(color|colour|legend|status|green|amber|red|grey|violet)/.test(lower)) {
    return {
      text: 'Seat Map Status Guide: Green with check = Available; Indigo = Selected by you; Amber with clock = Temporarily held by another student; Red with X = Confirmed booked; Grey with slash = Blocked; Violet ring = SeatSense AI recommended. Every state pairs color with an icon for color-blind accessibility.',
    };
  }
  if (/(conflict|shield|taken|someone else|reserved)/.test(lower)) {
    return {
      text: 'SeatShield monitors live seat updates and hold responses. If another student reserves one of your selected seats, SeatShield removes only that unavailable seat, keeps your other valid seats intact, and suggests the closest same-row or similar-price alternative side by side. You always confirm before switching.',
    };
  }
  if (/(recommend|seat|stage|cheap|budget|group|squad|together|view|aisle)/.test(lower)) {
    if (!activeEventId) {
      return {
        text: 'To give live AI seat recommendations tailored to real prices and open seats, please choose an event first. Open any event to use SeatSense AI and SquadSync directly alongside the auditorium map.',
        actionLabel: 'Browse Campus Events',
        actionRoute: '/events',
      };
    }
    return {
      text: 'You already have an event open! Use the SeatSense AI assistant or SquadSync Group Finder right next to the auditorium seat map to run live AI queries, voice requests (English/Hindi), and group seating searches. SEATLOCK will never auto-book seats without your click.',
    };
  }
  return {
    text: 'I can explain seat statuses, the 5-minute reservation timer, SeatShield conflict recovery, or guide you to SeatSense AI & SquadSync for live seat picks. Note: I never hold or book seats automatically — you stay in complete control.',
    actionLabel: activeEventId ? undefined : 'Explore Events',
    actionRoute: activeEventId ? undefined : '/events',
  };
}

export function FloatingAiAssistant({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = usePreferences();
  const location = useLocation();
  const navigate = useNavigate();

  const eventMatch = location.pathname.match(/^\/events\/([^/]+)/);
  const activeEventId = eventMatch ? eventMatch[1] : null;
  const isCheckoutOrSeatMap =
    location.pathname.startsWith('/events/') || location.pathname.startsWith('/checkout');

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! I am your SEATLOCK Assistant. Ask me about seat statuses, 5-minute holds, conflict recovery, or how to find the best seats for your squad.',
    },
  ]);

  const sendQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = getLocalGuidanceReply(trimmed, activeEventId);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
      { id: `a-${Date.now() + 1}`, role: 'assistant', ...reply },
    ]);
    setInput('');
  };

  return (
    <>
      {/* Floating trigger positioned carefully to never cover checkout/mobile bottom controls */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open SEATLOCK AI Assistant"
          className={`no-print fixed right-4 z-30 flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#6366F1]/30 transition hover:bg-[#4F46E5] active:scale-95 sm:right-6 ${
            activeEventId ? 'bottom-36 lg:hidden' : isCheckoutOrSeatMap ? 'bottom-36 md:bottom-6' : 'bottom-20 md:bottom-6'
          }`}
        >
          <Sparkles className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
          <span className="hidden sm:inline">{t.navAiAssist}</span>
        </button>
      )}

      {/* Accessible desktop side panel / mobile bottom sheet */}
      {open && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-end bg-slate-950/50 backdrop-blur-xs sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="SEATLOCK AI Assistant"
            className="flex max-h-[82vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/70 dark:bg-[#151D30] sm:max-w-md sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                    SEATLOCK Guide &amp; AI Assist
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    {activeEventId
                      ? 'Event open · Live seat tips ready'
                      : 'Select an event for live seat picks'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close AI Assistant"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!activeEventId && (
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-xs text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>No event selected yet</span>
                  </div>
                  <p className="mt-1 opacity-90">
                    Choose an event from Explore Events to get live seat-map recommendations from SeatSense AI.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#6366F1] text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700/70 dark:bg-[#090E1C] dark:text-slate-200'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.actionLabel && msg.actionRoute && (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(msg.actionRoute!);
                        }}
                      >
                        {msg.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick guidance prompts */}
              <div className="pt-2">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Quick help topics</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => sendQuestion(topic)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-slate-700 dark:bg-[#090E1C] dark:text-slate-300 dark:hover:border-[#818CF8]"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(input);
              }}
              className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
            >
              <label htmlFor="floating-ai-input" className="sr-only">
                Ask SEATLOCK assistant
              </label>
              <input
                id="floating-ai-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about holds, seats, or conflicts..."
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none dark:border-slate-700 dark:bg-[#090E1C] dark:text-[#F8FAFC]"
              />
              <Button type="submit" size="md" aria-label="Send message" disabled={!input.trim()}>
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
