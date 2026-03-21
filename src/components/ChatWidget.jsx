"use client";

import {
    Bot,
    CalendarDays,
    Clock3,
    Loader2,
    MapPin,
    MessageCircle,
    Phone,
    Send,
    Ticket,
    X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "sa_tours_chat_history_v2";

const QUICK_ACTIONS = [
    "What are today’s bus timings?",
    "How can I book a seat?",
    "What is the contact number?",
    "Which routes are available?",
    "How do I check fare?",
];

const DEFAULT_MESSAGES = [
    {
        role: "assistant",
        content:
            "Hello 👋 Welcome to SA Tours & Travels.\nHow can I help you today?",
    },
];

const CONTACTS = {
    helpline: "8805718986",
    booking: "9209471601",
    borliBus: "9209471309",
    dighiBus: "9273635316",
};

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(DEFAULT_MESSAGES);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [modelInfo, setModelInfo] = useState(null);

    const modalRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const canSend = useMemo(
        () => input.trim().length > 0 && !loading,
        [input, loading]
    );

    /* -------------------------------------------------------
       LOAD CHAT HISTORY
    ------------------------------------------------------- */
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    }, []);

    /* -------------------------------------------------------
       SAVE CHAT HISTORY
    ------------------------------------------------------- */
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save chat history:", error);
        }
    }, [messages]);

    /* -------------------------------------------------------
       BODY SCROLL LOCK
    ------------------------------------------------------- */
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    /* -------------------------------------------------------
       ESC TO CLOSE
    ------------------------------------------------------- */
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    /* -------------------------------------------------------
       FOCUS INPUT WHEN OPEN
    ------------------------------------------------------- */
    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(() => inputRef.current?.focus(), 180);
        return () => clearTimeout(t);
    }, [isOpen]);

    /* -------------------------------------------------------
       AUTO SCROLL
    ------------------------------------------------------- */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading, isOpen]);

    // Render assistant message content: detect simple lists and render with icons/numbers
    function renderMessageContent(text) {
        if (!text) return null;

        const lines = String(text)
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

        // If it's a short multi-line message, render as list with icons
        if (lines.length > 1) {
            return (
                <div className="space-y-2">
                    {lines.map((line, idx) => {
                        // strip leading bullets or markdown
                        const clean = line.replace(/^[\*\-\d\.\s]+/, "").replace(/\*\*/g, "").trim();

                        // choose icon: route (has arrow), time (contains AM/PM), contact/phone (contains call/phone/helpline)
                        let Icon = MapPin;
                        if (/→|->|to|\bto\b/i.test(clean)) Icon = MapPin;
                        else if (/\bAM\b|\bPM\b|time|timings|schedule/i.test(clean)) Icon = Clock3;
                        else if (/call|helpline|booking|phone|contact/i.test(clean)) Icon = Phone;

                        // split title and detail by ':' if present
                        const [title, ...rest] = clean.split(":");
                        const detail = rest.join(":").trim();

                        return (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                    <span className="text-[10px] font-semibold">{idx + 1}</span>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-orange-500" />
                                        <div className="text-sm font-semibold text-slate-900">
                                            {title}
                                        </div>
                                    </div>

                                    {detail && (
                                        <div className="mt-1 text-sm text-slate-600">
                                            {detail}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        // single-line or fallback: preserve line breaks
        return <p className="whitespace-pre-wrap break-words">{text}</p>;
    }

    /* -------------------------------------------------------
       SEND MESSAGE
    ------------------------------------------------------- */
    const sendMessage = async (customMessage) => {
        const messageToSend = (customMessage ?? input).trim();
        if (!messageToSend || loading) return;

        const updatedMessages = [
            ...messages,
            { role: "user", content: messageToSend },
        ];

        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: updatedMessages,
                }),
            });

            const data = await res.json();

            setModelInfo({
                source: data?.source || null,
                modelUsed: data?.modelUsed || data?.modelTried || null,
                error: data?.error || null,
            });

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        data?.reply ||
                        `Sorry, chat is temporarily unavailable. Please call ${CONTACTS.helpline} or ${CONTACTS.booking}.`,
                },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `Sorry, chat is temporarily unavailable. Please call ${CONTACTS.helpline} or ${CONTACTS.booking}.`,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await sendMessage();
    };

    const clearChat = () => {
        setMessages(DEFAULT_MESSAGES);
        setModelInfo(null);

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear chat history:", error);
        }
    };

    /* -------------------------------------------------------
       OUTSIDE CLICK CLOSE
    ------------------------------------------------------- */
    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_20px_50px_rgba(249,115,22,0.35)] transition duration-200 hover:scale-105 hover:bg-orange-600 sm:bottom-5 sm:right-5"
                aria-label="Open chatbot"
                title="Chat with SA Tours"
            >
                <MessageCircle className="h-6 w-6" />
            </button>

            {/* Modal */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Live help chat"
                    className="fixed inset-0 z-[9999] bg-slate-950/45"
                    onClick={handleBackdropClick}
                >
                    <div className="flex h-full w-full items-end justify-end sm:items-end sm:justify-end">
                        <div
                            ref={modalRef}
                            className="
                flex w-full flex-col overflow-hidden bg-white
                h-[100dvh] rounded-none
                sm:mr-5 sm:mb-5 sm:h-[88vh] sm:max-h-[820px] sm:w-full sm:max-w-[460px] sm:rounded-[30px]
                lg:max-w-[500px]
                border border-slate-200 shadow-[0_30px_80px_rgba(15,23,42,0.22)]
              "
                        >
                            {/* Header */}
                            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] sm:h-14 sm:w-14">
                                            <Bot className="h-6 w-6 sm:h-7 sm:w-7" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500 sm:text-[11px] sm:tracking-[0.28em]">
                                                SA Tours Assistant
                                            </p>
                                            <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                                                Live Help Chat
                                            </h3>

                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <p className="text-xs font-medium text-emerald-600 sm:text-sm">
                                                    Online now
                                                </p>

                                                {modelInfo?.source && (
                                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 sm:text-xs">
                                                        {modelInfo.source === "gemini"
                                                            ? `Powered by ${modelInfo.modelUsed || "Gemini"}`
                                                            : modelInfo.source === "local-fallback"
                                                                ? "Local fallback"
                                                                : "Chat support"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 sm:h-12 sm:w-12"
                                        aria-label="Close chatbot"
                                    >
                                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </button>
                                </div>


                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4">
                                <div className="space-y-3">
                                    {messages.map((message, index) => (
                                        <div
                                            key={`${message.role}-${index}`}
                                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[84%] ${message.role === "user"
                                                    ? "rounded-br-md bg-orange-500 text-white"
                                                    : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="flex max-w-[88%] items-center gap-2 rounded-3xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm sm:max-w-[84%]">
                                                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                                Typing...
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
                                {/* Quick Action Chips */}
                                <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {QUICK_ACTIONS.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => sendMessage(item)}
                                            className="whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-100 sm:px-3.5 sm:text-xs"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    <Link
                                        href="/login"
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                    >
                                        <Ticket className="h-4 w-4 text-orange-500" />
                                        Book Now
                                    </Link>

                                    <Link
                                        href="/schedule"
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                    >
                                        <CalendarDays className="h-4 w-4 text-orange-500" />
                                        Schedule
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={clearChat}
                                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                    >
                                        Clear Chat
                                    </button>
                                </div>

                                {/* Input */}
                                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask about timings, fare, booking..."
                                        className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!canSend}
                                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        aria-label="Send message"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </form>

                                {/* Footer Note */}
                                <p className="mt-3 text-center text-[11px] leading-5 text-slate-500 sm:text-xs">
                                    For urgent booking/payment issues, call {CONTACTS.helpline} or{" "}
                                    {CONTACTS.booking}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}