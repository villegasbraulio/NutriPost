import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronDown, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useLanguage } from "../hooks/useLanguage";
import { assistantService } from "../services/assistantService";
import { pageTransition } from "../utils/animations";

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-[24px] rounded-bl-md bg-slate-800 px-4 py-3 text-sm text-textPrimary shadow-lg shadow-black/15 sm:max-w-[72%]">
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
  const { isSpanish } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const messagesRef = useRef(null);
  const quickPrompts = isSpanish
    ? [
        "¿Qué debería comer después de entrenar?",
        "¿Estoy llegando a mi proteína hoy?",
        "Sugiéreme un snack alto en proteína",
        "¿Cómo va mi nutrición hoy?",
      ]
    : [
        "What should I eat after my workout?",
        "Am I hitting my protein today?",
        "Suggest a high-protein snack",
        "How's my nutrition today?",
      ];
  const copy = isSpanish
    ? {
        loadError: "NutriCoach no pudo cargar el chat.",
        sendError: "NutriCoach no pudo responder en este momento.",
        summaryTitle: "Resumen de macros de hoy",
        summaryText: summaryCollapsed
          ? "Toca para expandir tu resumen nutricional."
          : "Toca para contraer tu resumen nutricional.",
        goal: "Objetivo",
        burned: "Gastadas",
        consumed: "Consumidas",
        protein: "Proteina",
        carbs: "Carbohidratos",
        fat: "Grasas",
        headerText: "Pregunta por comidas de recuperación, proteína, timing o tu nutrición diaria.",
        emptyTitle: "Tu coach nutricional está listo.",
        emptyText: "Haz una pregunta sobre tus macros de hoy, el timing de recuperación o qué conviene cargar después de entrenar.",
        placeholder: "Pregúntale a NutriCoach sobre tu nutrición de recuperación...",
        send: "Enviar mensaje",
      }
    : {
        loadError: "NutriCoach could not load the chat.",
        sendError: "NutriCoach could not answer right now.",
        summaryTitle: "Today&apos;s macro summary",
        summaryText: summaryCollapsed
          ? "Tap to expand your live nutrition snapshot."
          : "Tap to collapse your live nutrition snapshot.",
        goal: "Goal",
        burned: "Burned",
        consumed: "Consumed",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat",
        headerText: "Ask about recovery meals, protein, timing, or your daily nutrition.",
        emptyTitle: "Your nutrition coach is ready.",
        emptyText: "Ask a question about today&apos;s macros, recovery timing, or what to log after training.",
        placeholder: "Ask NutriCoach about your recovery nutrition...",
        send: "Send message",
      };

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
        toast.error(error.response?.data?.message || copy.loadError);
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
  }, [copy.loadError]);

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
      toast.error(error.response?.data?.message || copy.sendError);
    } finally {
      setSending(false);
    }
  };

  const macroCards = todaySummary
    ? [
        [copy.goal, `${Math.round(todaySummary.daily_goal_calories || 0)} kcal`],
        [copy.burned, `${Math.round(todaySummary.calories_burned_today || 0)} kcal`],
        [copy.consumed, `${Math.round(todaySummary.calories_consumed_today || 0)} kcal`],
        [copy.protein, `${Math.round(todaySummary.protein_consumed_g || 0)} g`],
        [copy.carbs, `${Math.round(todaySummary.carbs_consumed_g || 0)} g`],
        [copy.fat, `${Math.round(todaySummary.fat_consumed_g || 0)} g`],
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
        className="glass-panel flex w-full items-start justify-between gap-3 rounded-[28px] px-4 py-4 text-left sm:px-5"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-secondary/15 p-2 text-secondary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">{isSpanish ? "Resumen de macros de hoy" : "Today's macro summary"}</p>
            <p className="text-xs text-textMuted">{copy.summaryText}</p>
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
            <div className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
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

      <section className="glass-panel flex h-[calc(100dvh-10rem)] min-h-[560px] flex-col overflow-hidden rounded-[32px] sm:h-[calc(100vh-13rem)] sm:min-h-[620px]">
        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">NutriCoach</h1>
                <p className="text-sm text-textMuted">{copy.headerText}</p>
              </div>
            </div>
          </div>

        <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {!messages.length ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-[28px] border border-dashed border-white/10 bg-background/35 p-5 text-center sm:p-8">
                <p className="text-lg font-semibold">{copy.emptyTitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-textMuted">
                  {copy.emptyText}
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
                  className={`max-w-[92%] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/10 sm:max-w-[72%] ${
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
            {quickPrompts.map((prompt) => (
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
              placeholder={copy.placeholder}
              className="focus-ring max-h-40 min-h-[56px] flex-1 resize-none rounded-[24px] border border-white/10 bg-background/65 px-4 py-4 text-sm"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-14"
              aria-label={copy.send}
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
