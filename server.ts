import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client to prevent crashes if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Chat endpoint proxies to Gemini API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, healthLogs } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Helper to generate quick local responses if Gemini API Key is missing or service fails
    const generateSimulatedResponse = (text: string): string => {
      const lower = text.toLowerCase();
      if (lower.includes("sleep") || lower.includes("tired") || lower.includes("rest") || lower.includes("bad sleep")) {
        return "It sounds like you are feeling tired or having trouble with sleep. 💤 Good sleep is crucial for learning and memory retention!\n\nHere are 3 quick student sleep tips:\n1. **Limit Blue Light:** Turn off phone & laptop screens 30 minutes before sleeping.\n2. **Cool & Dark Room:** Keep your dorm room cool and completely dark.\n3. **Consistency:** Try to sleep and wake up at the exact same time every day.\n\nWould you like a quick breathing exercise to help relax?";
      }
      if (lower.includes("stress") || lower.includes("exams") || lower.includes("test") || lower.includes("study") || lower.includes("school")) {
        return "I hear you. Academic stress can be really overwhelming, especially around exam times! 🤯\n\nTry the **Pomodoro Technique**: study focused for 25 minutes, then take a mandatory 5-minute study break to stretch and drink water. Remember, your grades do not define your worth. Take 3 deep breaths right now—you've got this!";
      }
      if (lower.includes("anxiety") || lower.includes("nervous") || lower.includes("scared") || lower.includes("panic")) {
        return "Feeling anxious is a very natural response to student pressure. 🧘 Let's slow down together.\n\nTry the **5-4-3-2-1 Grounding Technique** to ease anxiety:\n- 👀 **5 things** you can see around you.\n- 🖐️ **4 things** you can touch (your clothes, desk, etc.).\n- 👂 **3 things** you can hear.\n- 👃 **2 things** you can smell.\n- 👅 **1 thing** you can taste.\n\nThis immediately centers your nervous system in the present moment. How do you feel after trying this?";
      }
      if (lower.includes("food") || lower.includes("snack") || lower.includes("eat") || lower.includes("diet") || lower.includes("healthy")) {
        return "Eating healthy fuels your brain and keeps your energy levels stable! 🍎\n\nInstead of sugary snacks or heavy energy drinks which cause crashes, try these smart study snacks:\n- 🍌 **Bananas & Apples** (natural energy + vitamins)\n- 🥜 **Almonds or Walnuts** (brain-boosting healthy fats)\n- 🥛 **Greek Yogurt or Oatmeal** (slow-release energy)\n- 💧 **Cool Water** (dehydration is the #1 cause of afternoon fatigue!)";
      }
      if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("hola")) {
        return "Hi there! 👋 I am your AI mental health companion. How has your day been so far? Tell me how you are handling school, or if anything is on your mind today.";
      }
      return "Thank you for sharing that with me. I'm here to listen! Campus life can be a balancing act, and it's perfectly normal to feel overwhelmed at times. ❤️\n\nWhat's on your mind right now? We can chat about sleep, stress, self-care, study habits, or anything else you'd like.";
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY is not configured or placeholder. Using instant simulated wellness reply.");
      const reply = generateSimulatedResponse(lastUserMessage);
      return res.json({ reply });
    }

    const ai = getGeminiClient();

    // Map frontend messages to Gemini content format
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Generate recent health log summary
    let logsContext = "No health or well-being metrics logged yet by the student.";
    if (healthLogs && Array.isArray(healthLogs) && healthLogs.length > 0) {
      // Get the last 5 logs
      const recentLogs = healthLogs.slice(-5).reverse();
      logsContext = "Here are the student's recent daily logs (most recent first):\n" + 
        recentLogs.map((log: any) => 
          `- Date: ${log.date}\n  Sleep: ${log.sleepHours} hours\n  Stress level (1-10): ${log.stressLevel}\n  Focus time: ${log.focusMinutes} mins\n  Water intake: ${log.waterIntakeCups} cups\n  Mood: ${log.mood}\n  Physical activity: ${log.activityLevel}`
        ).join("\n\n") + 
        "\n\nUse this data to tailor your tips specifically to their recent metrics (e.g. if their sleep is low, offer relaxation tips; if stress is high, recommend deep breathing exercises). Make sure to reference their actual logged stats naturally where relevant!";
    }

    const systemInstruction = `You are a friendly, compassionate, and highly supportive AI Student Health and Well-being Companion. Your role is to help students manage academic stress, establish good sleep habits, find healthy meal and exercise options, maintain mental wellness, and optimize focus.

${logsContext}

Rules:
- Be extremely supportive, warm, and empathetic. Speak like a friendly, encouraging campus wellness coach.
- Use the student's logged metrics (if provided) to personalize your response. For example, if they have low sleep, note that gently and offer a sleep hygiene tip. If they have high stress, offer a quick breathing technique.
- DO NOT provide medical diagnoses or prescribe medications. If a student indicates severe mental health issues, always gently guide them to professional campus counseling, help hotlines, or adult support.
- Keep recommendations practical, actionable, bite-sized, and realistic for a busy student budget and schedule.
- Use clean Markdown formatting with paragraphs, bullet points, and bold text for key ideas. Keep answers relatively concise and engaging.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I'm here to support you! Let me know how you are feeling.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini API error (falling back to simulation):", error);
    // Graceful fallback to avoid breaking the frontend if Gemini is slow or throws error
    try {
      const { messages } = req.body;
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      
      const generateSimulatedResponse = (text: string): string => {
        const lower = text.toLowerCase();
        if (lower.includes("sleep") || lower.includes("tired") || lower.includes("rest") || lower.includes("bad sleep")) {
          return "It sounds like you are feeling tired or having trouble with sleep. 💤 Good sleep is crucial for learning and memory retention!\n\nHere are 3 quick student sleep tips:\n1. **Limit Blue Light:** Turn off phone & laptop screens 30 minutes before sleeping.\n2. **Cool & Dark Room:** Keep your dorm room cool and completely dark.\n3. **Consistency:** Try to sleep and wake up at the exact same time every day.";
        }
        if (lower.includes("stress") || lower.includes("exams") || lower.includes("test") || lower.includes("study") || lower.includes("school")) {
          return "I hear you. Academic stress can be really overwhelming, especially around exam times! 🤯\n\nTry the **Pomodoro Technique**: study focused for 25 minutes, then take a mandatory 5-minute study break to stretch and drink water. Remember, your grades do not define your worth. Take 3 deep breaths right now—you've got this!";
        }
        if (lower.includes("anxiety") || lower.includes("nervous") || lower.includes("scared") || lower.includes("panic")) {
          return "Feeling anxious is a very natural response to student pressure. 🧘 Let's slow down together.\n\nTry the **5-4-3-2-1 Grounding Technique**:\n- 👀 **5 things** you can see.\n- 🖐️ **4 things** you can touch.\n- 👂 **3 things** you can hear.\n- 👃 **2 things** you can smell.\n- 👅 **1 thing** you can taste.";
        }
        if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
          return "Hi there! 👋 I am your AI mental health companion. How has your day been so far? Tell me how you are handling school, or if anything is on your mind today.";
        }
        return "Thank you for sharing that with me. I'm here to listen! Campus life can be a balancing act, and it's perfectly normal to feel overwhelmed at times. ❤️\n\nWhat's on your mind right now? We can chat about sleep, stress, self-care, study habits, or anything else you'd like.";
      };

      const reply = generateSimulatedResponse(lastUserMessage);
      res.json({ reply });
    } catch (fallbackError) {
      res.status(500).json({ 
        error: "Failed to communicate with AI health assistant.",
        details: error.message || error
      });
    }
  }
});

// Vite middleware setup for assets in development/production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start Vite server:", err);
});
