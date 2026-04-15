import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronDown, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { assistantService } from "../services/assistantService";
import { pageTransition } from "../utils/animations";

const QUICK_PROMPTS = [
  "What should I eat after my workout?",
  "Am I hitting my protein today?",
  "Suggest a high-protein snack",
  "How's my nutrition today?",
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[24px] rounded-bl-md bg-slate-800 px-4 py-3 text-sm text-textPrimary shadow-lg shadow-black/15">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <motion.span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-textMuted"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: index * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadChat = async () => {
      try {
        const data = await assistantService.getChatState();
        if (!active) {
          return;
        }
        setMessages(data.messages || []);
        setTodaySummary(data.today_summary || null);
      } catch (error) {
        toast.error(error.response?.data?.message || "NutriCoach could not load the chat.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadChat();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = async (rawMessage = input) => {
    const message = rawMessage.trim();
    if (!message || sending) {
      return;
    }

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setInput("");
    setSending(true);

    try {
      const data = await assistantService.sendMessage(message);
      setMessages(data.messages || []);
      setTodaySummary(data.today_summary || null);
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      toast.error(error.response?.data?.message || "NutriCoach could not answer right now.");
    } finally {
      setSending(false);
    }
  };

  const macroCards = todaySummary
    ? [
        ["Goal", `${Math.round(todaySummary.daily_goal_calories || 0)} kcal`],
        ["Burned", `${Math.round(todaySummary.calories_burned_today || 0)} kcal`],
        ["Consumed", `${Math.round(todaySummary.calories_consumed_today || 0)} kcal`],
        ["Protein", `${Math.round(todaySummary.protein_consumed_g || 0)} g`],
        ["Carbs", `${Math.round(todaySummary.carbs_consumed_g || 0)} g`],
        ["Fat", `${Math.round(todaySummary.fat_consumed_g || 0)} g`],
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-24 rounded-[28px]" />
        <LoadingSkeleton className="h-[640px] rounded-[32px]" />
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="space-y-4">
      <button
        type="button"
        onClick={() => setSummaryCollapsed((current) => !current)}
        className="glass-panel flex w-full items-center justify-between rounded-[28px] px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-secondary/15 p-2 text-secondary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">Today&apos;s macro summary</p>
            <p className="text-xs text-textMuted">Tap to {summaryCollapsed ? "expand" : "collapse"} your live nutrition snapshot.</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-textMuted transition ${summaryCollapsed ? "" : "rotate-180"}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {!summaryCollapsed && todaySummary ? (
          <motion.section
            key="summary-card"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-panel rounded-[28px] p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {macroCards.map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-background/55 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">{label}</p>
                  <p className="mt-2 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="glass-panel flex h-[calc(100vh-13rem)] min-h-[620px] flex-col overflow-hidden rounded-[32px]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">NutriCoach</h1>
              <p className="text-sm text-textMuted">Ask about recovery meals, protein, timing, or your daily nutrition.</p>
            </div>
          </div>
        </div>

        <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {!messages.length ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-[28px] border border-dashed border-white/10 bg-background/35 p-8 text-center">
                <p className="text-lg font-semibold">Your nutrition coach is ready.</p>
                <p className="mt-2 text-sm leading-relaxed text-textMuted">
                  Ask a question about today&apos;s macros, recovery timing, or what to log after training.
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: isUser ? 22 : -22, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/10 sm:max-w-[72%] ${
                    isUser
                      ? "rounded-br-md bg-primary text-background"
                      : "rounded-bl-md bg-slate-800 text-textPrimary"
                  }`}
                >
                  {!isUser ? (
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                      <Bot className="h-3.5 w-3.5" />
                      NutriCoach
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            );
          })}

          {sending ? <TypingIndicator /> : null}
        </div>

        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="rounded-full border border-white/10 bg-background/45 px-3 py-2 text-sm text-textMuted transition hover:border-secondary/40 hover:text-textPrimary"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask NutriCoach about your recovery nutrition..."
              className="focus-ring max-h-40 min-h-[56px] flex-1 resize-none rounded-[24px] border border-white/10 bg-background/65 px-4 py-4 text-sm"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
