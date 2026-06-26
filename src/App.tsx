import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Compass, 
  MessageSquare,
  ShieldCheck,
  Heart
} from "lucide-react";
import { motion } from "motion/react";
import { Message } from "./types";

const INITIAL_MESSAGE: Message = {
  id: "init-msg",
  role: "assistant",
  content: "Hello! I am your AI mental health companion. How are you handling school and life today?",
  timestamp: new Date().toISOString()
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Chat container reference for auto-scroll
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("student_chat_history");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        // Fallback to default
      }
    }
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Send message to server api
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText ? customText.trim() : inputMessage.trim();
    if (!textToSend) return;

    if (!customText) {
      setInputMessage("");
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
          healthLogs: [] // Empty logs now since we are simple bot only
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from wellness companion server.");
      }

      const data = await response.json();
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.reply || "I am here to support you! Let's work together to balance study and health.",
        timestamp: new Date().toISOString()
      };

      const finalHistory = [...updatedHistory, assistantMsg];
      setMessages(finalHistory);
      localStorage.setItem("student_chat_history", JSON.stringify(finalHistory));
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `⚠️ Sorry, I ran into an issue connecting to the AI Health Companion server: "${err.message || "Unknown error"}". Please make sure your GEMINI_API_KEY is configured in the Secrets panel!`,
        timestamp: new Date().toISOString()
      };
      setMessages([...updatedHistory, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Clear Conversation history
  const handleClearChat = () => {
    if (window.confirm("Do you want to reset this conversation history?")) {
      setMessages([INITIAL_MESSAGE]);
      localStorage.removeItem("student_chat_history");
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4fc] text-slate-800 font-sans flex flex-col items-center justify-center p-4 md:p-6" id="main-student-pulse-root">
      
      {/* Decorative ambient blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-5xl flex flex-col z-10" id="chat-outer-wrapper">
        
        {/* Header Block exactly matching the clean aesthetic */}
        <header className="text-center mb-6" id="welcome-header-container">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[#6366f1] tracking-tight mb-2" id="welcome-title">
            AI Mental Health Assistant
          </h1>

          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed" id="welcome-subtitle">
            A safe, confidential space to chat about your feelings.
          </p>
        </header>

        {/* Central Chat Board Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 flex flex-col overflow-hidden min-h-[500px] md:min-h-[560px]" id="bento-ai-chat-board">
          
          {/* Chat Panel Top Header */}
          <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between" id="chat-header">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366f1] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6366f1]"></span>
              </span>
              <div>
                <h2 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1">
                  AI Companion
                </h2>
              </div>
            </div>
            
            <button
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Reset the chat conversation"
              id="clear-chat-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Chat
            </button>
          </div>

          {/* Messages Panel Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4" id="chat-messages-container">
            {messages.map((m) => {
              const isAssistant = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-slate-100 text-slate-700 rounded-tl-none"
                        : "bg-[#6366f1] text-white rounded-tr-none shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-line prose max-w-none">
                      {m.content}
                    </div>
                    <span className={`block text-[9px] mt-1.5 text-right ${isAssistant ? "text-slate-400" : "text-violet-200"}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-tl-none p-3.5 text-xs flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span className="font-medium text-slate-500">AI Wellness bot is typing...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Bar */}
          <div className="px-5 py-2.5 bg-slate-50/60 border-t border-slate-100/80 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Suggestions:</span>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {[
                "Study stress tips 🤯",
                "Sleep help 💤",
                "Anxiety relief 🧘",
                "Healthy food 🍎"
              ].map((text, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(text)}
                  disabled={isSending}
                  className="text-xs font-semibold bg-white border border-slate-200 hover:border-[#6366f1] hover:text-[#6366f1] text-slate-600 px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input form area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-white border-t border-slate-100 flex items-center gap-3"
            id="chat-input-form"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-50 text-xs md:text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#6366f1] focus:bg-white text-slate-800 placeholder:text-slate-400"
              disabled={isSending}
              id="chat-input-field"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-5 py-3 bg-[#6366f1] hover:bg-[#5254df] text-white font-bold rounded-xl text-xs md:text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              id="chat-submit-btn"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </motion.button>
          </form>

        </div>

        {/* Footer info banner */}
        <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-xs px-2" id="app-footer">
          <div className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure & Private Session</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Student Wellness</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
