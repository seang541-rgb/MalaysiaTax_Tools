"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChatMessage, getTaxAssistantResponse } from "@/engine/tax-assistant";

export function TaxChat() {
  const t = useTranslations("aiTax");
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null); // null = not checked yet
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if Ollama is reachable on mount (lightweight GET health check)
  useEffect(() => {
    fetch("/api/chat", { signal: AbortSignal.timeout(8000) })
      .then((res) => res.json())
      .then((data) => {
        setLlmAvailable(data.status === "ok" && data.available);
      })
      .catch(() => {
        setLlmAvailable(false);
      });
  }, [locale]);

  // Auto-greet on mount
  useEffect(() => {
    const greeting = getTaxAssistantResponse("hi", locale);
    setMessages([{ role: "assistant", content: greeting }]);
  }, [locale]);

  // Stream response from Ollama
  const streamFromLLM = useCallback(
    async (allMessages: ChatMessage[]) => {
      const controller = new AbortController();
      abortRef.current = controller;

      // Add empty assistant message to fill via stream
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages.filter((m) => m.role !== "assistant" || m.content),
            locale,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("LLM request failed");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const data = line.replace(/^data: /, "").trim();
            if (!data || data === "[DONE]") continue;
            try {
              const { token } = JSON.parse(data);
              if (token) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + token,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        // Fallback to rule engine on LLM failure
        const lastUser = allMessages[allMessages.length - 1];
        const fallback = getTaxAssistantResponse(lastUser.content, locale);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fallback };
          return updated;
        });
      } finally {
        setIsTyping(false);
        abortRef.current = null;
      }
    },
    [locale]
  );

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (llmAvailable) {
      // Stream from Gemma 4 via Ollama
      streamFromLLM(newMessages);
    } else {
      // Fallback: rule-based engine
      setTimeout(() => {
        const reply = getTaxAssistantResponse(trimmed, locale);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setIsTyping(false);
      }, 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions =
    locale === "zh"
      ? [
          "月薪 RM5000 要交多少税？",
          "企业税率是多少？",
          "EPF 雇主要交多少？",
          "有哪些税务减免？",
        ]
      : locale === "ms"
        ? [
            "Berapa cukai untuk gaji RM5000?",
            "Apakah kadar cukai korporat?",
            "Berapa EPF majikan?",
            "Apakah pelepasan cukai?",
          ]
        : [
            "How much tax for RM5000 salary?",
            "What is the corporate tax rate?",
            "How much EPF does employer pay?",
            "What tax reliefs are available?",
          ];

  // Simple markdown-like rendering for links and bold
  const renderContent = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const href = linkMatch[2].startsWith("http")
          ? linkMatch[2]
          : `/${locale}${linkMatch[2]}`;
        return (
          <a
            key={i}
            href={href}
            className="text-primary underline hover:text-primary/80"
          >
            {linkMatch[1]}
          </a>
        );
      }
      const boldMatch = part.match(/\*\*(.*?)\*\*/);
      if (boldMatch) {
        return (
          <strong key={i} className="font-semibold">
            {boldMatch[1]}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const modeLabel =
    llmAvailable === null
      ? "..."
      : llmAvailable
        ? "Gemma 4 12B"
        : locale === "zh"
          ? "规则引擎"
          : "Rule Engine";

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-semibold text-sm">{t("title")}</h3>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              llmAvailable
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {modeLabel}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              }`}
            >
              {msg.role === "assistant"
                ? renderContent(msg.content)
                : msg.content}
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(q);
                  inputRef.current?.focus();
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-gray-50/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("send")}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
