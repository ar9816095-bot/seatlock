import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sliders,
  Sparkles,
  Square,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { ApiError, seatlockApi } from '../../services/api';
import type { AiRecommendation, Seat } from '../../types';
import { Button } from '../FormControls';

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SUGGESTION_CHIPS = [
  { label: 'Best View', prompt: 'Suggest two seats with the best possible view.' },
  { label: 'Cheapest Seats', prompt: 'Find two cheapest available seats.' },
  { label: 'Near Stage', prompt: 'Find two seats together near the stage.' },
  { label: 'Aisle Seats', prompt: 'Find two aisle seats with good sightlines.' },
  { label: 'Best Value', prompt: 'Find two best value seats under ₹350 each.' },
  { label: 'Seats Together', prompt: 'Find four affordable seats in the same row.' },
  { label: 'Near Exit', prompt: 'Find two seats near exit for easy access.' },
  { label: 'Middle Section', prompt: 'Find two seats together in the middle section.' },
];

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendations?: AiRecommendation[];
  isError?: boolean;
}

interface SeatSensePanelProps {
  eventId: string;
  seats: Seat[];
  onHighlightRecommendations: (seatIds: string[]) => void;
  onApplyRecommendedSeats: (seatIds: string[]) => void;
  onOpenSquadSync: () => void;
}

export function SeatSensePanel({
  eventId,
  seats,
  onHighlightRecommendations,
  onApplyRecommendedSeats,
  onOpenSquadSync,
}: SeatSensePanelProps) {
  const { preferences, t } = usePreferences();
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: 'Tell me what kind of seats you want — in English or Hindi (e.g., "Find two seats together near the stage under ₹350" or "Mujhe stage ke paas do seats chahiye").',
    },
  ]);

  // VoiceSeat state
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN'>(
    preferences.language === 'hi' ? 'hi-IN' : 'en-IN'
  );
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      recognitionRef.current?.stop();
    };
  }, []);

  const runAiQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLastPrompt(trimmed);
    setPrompt('');
    setLoading(true);
    setTurns((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);

    try {
      const response = await seatlockApi.requestAiAssist({
        eventId,
        prompt: trimmed,
        seats,
        signal: controller.signal,
      });

      const allRecIds = Array.from(
        new Set(response.recommendations.flatMap((r) => r.seatIds))
      );
      onHighlightRecommendations(allRecIds);

      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: response.message,
          recommendations: response.recommendations,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'SeatSense AI could not complete that request. You can still select seats manually on the map.';
      setTurns((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: msg,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopAi = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
  };

  const handleToggleVoice = () => {
    setVoiceNotice(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceNotice(
        'Voice recognition is not supported in this browser. Type your request below — English and Hindi text prompts work identically.'
      );
      return;
    }

    try {
      const rec = new Ctor();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        // Populate editable text box — NEVER auto-submit or auto-book!
        setPrompt(transcript);
      };

      rec.onerror = (ev) => {
        setIsListening(false);
        if (ev.error === 'not-allowed') {
          setVoiceNotice(
            'Microphone permission was denied. Enable mic access or type your request below.'
          );
        } else {
          setVoiceNotice(
            'Could not capture voice input cleanly. Edit or type your request below.'
          );
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setVoiceNotice('Voice recognition unavailable. Use the text box below.');
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151D30]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
              {t.aiAssistantTitle}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
              VoiceSeat + Smart Picks · POST /ai/assist
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSquadSync}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-[#4F46E5] transition hover:bg-indigo-500/20 dark:text-[#22D3EE]"
        >
          <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
          <span>SquadSync</span>
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={loading}
              onClick={() => void runAiQuery(chip.prompt)}
              className="min-h-[32px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-[#6366F1] hover:text-[#4F46E5] disabled:opacity-50 dark:border-slate-700/80 dark:bg-[#090E1C] dark:text-slate-300 dark:hover:border-[#818CF8]"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Stream */}
      <div className="max-h-[380px] flex-1 space-y-3.5 overflow-y-auto p-4">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`space-y-2.5 ${turn.role === 'user' ? 'flex flex-col items-end' : ''}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm ${
                turn.role === 'user'
                  ? 'bg-[#6366F1] text-white'
                  : turn.isError
                    ? 'border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                    : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700/70 dark:bg-[#090E1C] dark:text-slate-200'
              }`}
            >
              {turn.isError && (
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Assistant unavailable</span>
                </div>
              )}
              <p>{turn.text}</p>
            </div>

            {/* Structured AI Recommendation Cards */}
            {turn.recommendations && turn.recommendations.length > 0 && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.aiDisclaimer}</span>
                </p>

                {turn.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-violet-500/35 bg-violet-500/5 p-3.5 dark:bg-violet-500/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rec.label}
                      </span>
                      <span className="font-mono-num text-sm font-extrabold text-[#4F46E5] dark:text-[#22D3EE]">
                        ₹{rec.totalPrice}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rec.seats.map((s) => (
                        <span
                          key={s.id}
                          className="font-mono-num rounded-lg border border-violet-500/40 bg-white px-2 py-0.5 text-xs font-bold text-violet-900 dark:bg-[#090E1C] dark:text-violet-200"
                        >
                          {s.id} · ₹{s.price}
                        </span>
                      ))}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-[#94A3B8]">
                      {rec.reason}
                    </p>

                    {rec.warningNote && (
                      <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        {rec.warningNote}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => onApplyRecommendedSeats(rec.seatIds)}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.useTheseSeats}</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onHighlightRecommendations(rec.seatIds)}
                      >
                        Highlight
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Regenerate & Refine */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loading || !lastPrompt}
                    onClick={() => void runAiQuery(lastPrompt)}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.regenerate}</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setPrompt(
                        lastPrompt
                          ? `${lastPrompt} — prefer aisle and lower price`
                          : 'Find two seats together with best value'
                      )
                    }
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span>{t.refine}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5 text-xs font-medium text-indigo-900 dark:text-indigo-200"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Analyzing live seat map &amp; sightlines...</span>
            </div>
            <button
              type="button"
              onClick={handleStopAi}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/30 dark:text-red-300"
            >
              <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>Stop</span>
            </button>
          </div>
        )}
      </div>

      {/* VoiceSeat Waveform & Fallback Status */}
      {(isListening || voiceNotice) && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#090E1C]">
          {isListening && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 items-end gap-0.5" aria-hidden="true">
                  {[0, 150, 300, 120, 260].map((delay, i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${delay}ms` }}
                      className="animate-sl-wave h-4 w-1 rounded-full bg-[#22D3EE]"
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
                  Listening ({voiceLang === 'hi-IN' ? 'Hindi' : 'English'})... Review text before sending.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleVoice}
                className="text-xs font-semibold text-red-600 dark:text-red-400"
              >
                Stop Mic
              </button>
            </div>
          )}
          {voiceNotice && (
            <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
              {voiceNotice}
            </p>
          )}
        </div>
      )}

      {/* Prompt Input & VoiceSeat Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAiQuery(prompt);
        }}
        className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#94A3B8]">
          <span>VoiceSeat Language:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVoiceLang('en-IN')}
              className={`rounded px-2 py-0.5 font-semibold ${
                voiceLang === 'en-IN'
                  ? 'bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang('hi-IN')}
              className={`rounded px-2 py-0.5 font-semibold ${
                voiceLang === 'hi-IN'
                  ? 'bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            aria-label={isListening ? 'Stop VoiceSeat microphone' : 'Start VoiceSeat microphone'}
            aria-pressed={isListening}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
              isListening
                ? 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-slate-700 dark:bg-[#090E1C] dark:text-slate-200'
            }`}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Mic className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <label htmlFor="seatsense-prompt" className="sr-only">
            Describe your ideal seats
          </label>
          <input
            id="seatsense-prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 2 seats near stage under ₹350..."
            className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none dark:border-slate-700 dark:bg-[#090E1C] dark:text-[#F8FAFC]"
          />

          {loading ? (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleStopAi}
              aria-label="Stop AI request"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="md"
              disabled={!prompt.trim()}
              aria-label="Send seat recommendation request"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
