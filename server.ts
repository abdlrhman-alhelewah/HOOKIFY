import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Set up in-memory throttling table to restrict spamming/abuse of system API keys per user
interface ThrottlingState {
  lastRequestTime: number;
  isActive: boolean;
}

const userThrottleMap = new Map<string, ThrottlingState>();

// Blacklisted API keys that have depleted their Google/Gemini quota limit
const exhaustedKeys = new Set<string>();

// In-memory Prompt Cache for request deduplication/cost savings (avoids identical generations within a small window)
interface CacheEntry {
  text: string;
  timestamp: number;
}
const promptCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 25 * 1000; // 25 seconds duplicate prompt prevention

// Throttling settings
const COOLDOWN_MS = 6000; // 6 seconds cooldown between clicks for a single user

// Cleanup helper: periodically sweep stale memory states once an hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600 * 1000;
  for (const [key, state] of userThrottleMap.entries()) {
    if (state.lastRequestTime < oneHourAgo && !state.isActive) {
      userThrottleMap.delete(key);
    }
  }
}, 3600 * 1000);

// Purge cache memory stale entries every 5 minutes to maintain lightweight footprints in high volume traffic
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of promptCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      promptCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Clear blacklisted exhausted keys every 15 minutes to allow for quota resets or credential updates
setInterval(() => {
  exhaustedKeys.clear();
  console.log("[Gemini Diagnostics] Refreshed blacklisted keys pool for new quota window.");
}, 15 * 60 * 1000);

// Pool of Gemini keys helper: extracts and merges list of available keys from environments
function isValidGeminiKeyShape(key: string): boolean {
  if (!key) return false;
  // Check for common dummy/placeholder/variable-name strings
  const isDummy = 
    key.toLowerCase().includes("placeholder") || 
    key.toLowerCase().includes("your_") || 
    key.toLowerCase().includes("api_key") || 
    key.toLowerCase().includes("secret_key") || 
    key === "GEMINI_API_KEY" ||
    key.replaceAll(" ", "") === "" ||
    /^GEMINI_API_KEY_\d+$/.test(key);
  
  // Google API keys strictly start with "AIzaSy"
  const startsWithAIza = key.startsWith("AIzaSy");
  return startsWithAIza && !isDummy;
}

function getGeminiKeysPool(): string[] {
  const rawKeys: string[] = [];
  
  // 1. Check primary key
  if (process.env.GEMINI_API_KEY) {
    rawKeys.push(process.env.GEMINI_API_KEY.trim());
  }
  
  // 2. Check comma-separated list
  if (process.env.GEMINI_API_KEYS) {
    const list = process.env.GEMINI_API_KEYS.split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    rawKeys.push(...list);
  }
  
  // 3. Check numbered keys GEMINI_API_KEY_1 to 10
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim()) {
      rawKeys.push(key.trim());
    }
  }

  // Deduplicate raw list
  const uniqueRawKeys = Array.from(new Set(rawKeys)).filter((k) => k.length > 5);
  
  // Filter for valid-looking keys (starting with AIzaSy)
  const validKeys = uniqueRawKeys.filter(isValidGeminiKeyShape);

  // Securely log keys structure for troubleshooting (masked)
  console.log(`[Gemini Diagnostics] Loaded keys summary:`);
  uniqueRawKeys.forEach((k, idx) => {
    const isValid = isValidGeminiKeyShape(k);
    const masked = k.length > 10 ? `${k.slice(0, 6)}...${k.slice(-4)}` : `[too short: size ${k.length}]`;
    console.log(` - Key index ${idx}: ${masked} | passesShapeValidation=${isValid}`);
  });

  // If we have valid-looking keys, use them. Otherwise, fallback to the full unique list
  // to maintain resilience if Google changes key formats in the future.
  const finalPool = validKeys.length > 0 ? validKeys : uniqueRawKeys;
  
  // Exclude keys that are marked as exhausted
  const activePool = finalPool.filter((key) => !exhaustedKeys.has(key));
  const poolToUse = activePool.length > 0 ? activePool : finalPool;

  console.log(`[Gemini Diagnostics] Final active pool size for rotated fallback: ${poolToUse.length} (blacklisted so far: ${exhaustedKeys.size})`);
  return poolToUse;
}

// Global Round-Robin index pointer
let globalKeyIndex = 0;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Generation
  app.post("/api/generate", async (req, res) => {
    // 1. Identify client
    const userUid = (req.headers["x-user-uid"] as string) || "";
    const userEmail = (req.headers["x-user-email"] as string) || "";
    const clientKey = userUid || userEmail || req.ip || "anonymous";

    const now = Date.now();
    const state = userThrottleMap.get(clientKey);

    // Apply strict Throttling guards
    if (state) {
      // Rule A: Max 1 generator run at a time per client connection
      if (state.isActive) {
        return res.status(429).json({
          error: "You already have an active generation in progress. Please wait for it to finish.",
          errorAr: "لديك طلب توليد قيد التنفيذ حالياً. يرجى الانتظار حتى يكتمل قبل إرسال طلب جديد حفاظاً على استقرار ومجانية الخدمة."
        });
      }

      // Rule B: Cooldown timeframe between triggers
      const elapsed = now - state.lastRequestTime;
      if (elapsed < COOLDOWN_MS) {
        const secondsRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          error: `Please wait ${secondsRemaining} more second(s) before generating again to prevent abuse.`,
          errorAr: `يرجى الانتظار ${secondsRemaining} ثوانٍ إضافية قبل محاولة توليد المحتوى مجدداً لمنع الضغط الزائد.`
        });
      }
    }

    // Allocate / Lock slot
    userThrottleMap.set(clientKey, {
      lastRequestTime: now,
      isActive: true
    });

    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Deduplicate identical prompts requested in high-frequency windows to optimize budget
      const cachedResponse = promptCache.get(prompt);
      if (cachedResponse && (now - cachedResponse.timestamp < CACHE_TTL_MS)) {
        console.log(`[SaaS Deduplication Cache] HIT! Serving pre-compiled content for identical prompt. Client Key: ${clientKey}`);
        
        // Match the text/event-stream headers precisely
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        // Emit the cached block chunks to the client's listener stream
        res.write(`data: ${JSON.stringify({ text: cachedResponse.text })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Retrieve keys pool
      const pool = getGeminiKeysPool();
      if (pool.length === 0) {
        return res.status(500).json({ 
          error: "API key is missing. Please make sure GEMINI_API_KEY is configured in your Secrets/Settings." 
        });
      }

      let responseStream;
      let attempt = 0;
      // We will try at least 4 times, or complete a full sweep of all available pool keys
      const maxAttempts = Math.max(4, pool.length);
      let delayMs = 1200;
      let forceFlashLite = false;

      // Select a starting key index to distribute load
      const startKeyOffset = Math.floor(Math.random() * pool.length);

      let iterator: any = null;
      let firstResult: any = null;
      let currentApiKey = "";

      while (attempt < maxAttempts) {
        // Select rotated target key and increment attempt
        const targetRotationIndex = (startKeyOffset + attempt) % pool.length;
        currentApiKey = pool[targetRotationIndex];
        attempt++;

        // Fail-safe model fallback: if initial attempts on gemini-3.5-flash experience 503 high demand patterns, 
        // fallback to gemini-3.1-flash-lite which has massive throughput capabilities.
        const modelToUse = (attempt > 2 || forceFlashLite) ? "gemini-3.1-flash-lite" : "gemini-3.5-flash";

        try {
          const ai = new GoogleGenAI({ 
            apiKey: currentApiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });

          console.log(`[Gemini Request] Dispatching request with model: ${modelToUse} (attempt ${attempt}/${maxAttempts})`);
          responseStream = await ai.models.generateContentStream({
            model: modelToUse,
            contents: prompt,
          });

          // Pre-emptively fetch the first chunk of the stream inside the try-catch block of the retry loop.
          // This evaluates model authentication, validity, and credentials *before* we declare success.
          iterator = responseStream[Symbol.asyncIterator]();
          firstResult = await iterator.next();

          break; // Successful handshake and chunk retrieval! Break out of rotation/retry loop
        } catch (error: any) {
          const errorMsg = error?.message || "";
          const errorString = typeof error === "object" ? JSON.stringify(error) : String(error);
          const errorStatus = error?.status || error?.code || 0;
          
          const lowercaseM = (errorMsg + " " + errorString).toLowerCase();
          
          // Detect actual hard quota / billing configuration exceptions (permanent until funded or reset)
          const isHardQuotaError = 
            lowercaseM.includes("current quota") ||
            lowercaseM.includes("exceeded your current quota") ||
            lowercaseM.includes("billing details") ||
            lowercaseM.includes("check your plan") ||
            lowercaseM.includes("quota_exceeded") ||
            (lowercaseM.includes("billing") && !lowercaseM.includes("rate limit")) ||
            (lowercaseM.includes("quota") && lowercaseM.includes("plan")) ||
            ((lowercaseM.includes("quota") || lowercaseM.includes("billing") || lowercaseM.includes("plan") || lowercaseM.includes("limit")) && 
             !lowercaseM.includes("per minute") &&
             !lowercaseM.includes("per second") &&
             !lowercaseM.includes("resourceexhausted") &&
             !lowercaseM.includes("queries per minute") &&
             !lowercaseM.includes("rate limit") &&
             !lowercaseM.includes("too many requests"));

          if (isHardQuotaError) {
            // Add to inactive blacklisted set
            exhaustedKeys.add(currentApiKey);
            console.warn(`[Gemini Key Blacklist] Key index ${targetRotationIndex} added to blacklist due to quota limit expiration.`);
          }

          // Classify retriable / temporary errors
          const isRateLimit = !isHardQuotaError && (
            errorStatus === 429 || 
            errorMsg.includes("429") || 
            errorMsg.toLowerCase().includes("rate limit") || 
            errorMsg.includes("ResourceExhausted") || 
            errorMsg.includes("Quota exceeded") ||
            errorMsg.toLowerCase().includes("per minute") ||
            errorMsg.toLowerCase().includes("per second") ||
            errorMsg.toLowerCase().includes("queries per minute") ||
            errorMsg.toLowerCase().includes("too many requests")
          );

          const isTransientUnavailable = errorStatus === 503 || errorMsg.includes("503") || errorMsg.toLowerCase().includes("temporary") || errorMsg.toLowerCase().includes("high demand") || errorMsg.toLowerCase().includes("unavailable") || errorMsg.toLowerCase().includes("service unavailable");
          const isServerError = errorStatus === 500 || errorMsg.includes("500") || errorStatus === 502 || errorStatus === 504;
          
          // Hard quota error is retriable ONLY if we have *other* distinct keys left in the pool we haven't tried yet
          const hasUnusedKeysInPool = attempt < pool.length;
          const canSwitchToFlashLite = modelToUse === "gemini-3.5-flash";
          const isRetriable = isRateLimit || isTransientUnavailable || isServerError || (isHardQuotaError && hasUnusedKeysInPool);

          if (isTransientUnavailable || (isHardQuotaError && canSwitchToFlashLite && hasUnusedKeysInPool)) {
            forceFlashLite = true;
          }

          console.warn(`[Gemini Attempt Action] Attempt ${attempt}/${maxAttempts} failed on key index ${targetRotationIndex}. Reason: ${errorMsg.slice(0, 150)}... [Retriable=${isRetriable}]`);

          // If not retriable, or we ran out of retries/unique keys, raise and terminate loop early to save UI delays
          if (!isRetriable) {
            console.error(`[Gemini Engine Failure] Non-retriable error (or single depleted key). Breaking early.`);
            throw error;
          }

          if (attempt < maxAttempts) {
            // Determine retry delay
            let currentDelay = 300; // Small delay for rotating keys on generic errors
            if (isRateLimit) {
              currentDelay = delayMs;
              delayMs = Math.round(delayMs * 1.5);
              console.log(`[Gemini Retry Backoff] 429 Rate Limit encountered. Retrying with next rotated key in ${currentDelay}ms and backing off...`);
            } else if (isTransientUnavailable) {
              currentDelay = delayMs;
              delayMs = Math.round(delayMs * 1.5);
              console.log(`[Gemini Retry Backoff] 503 Service Unavailable (High Demand). Retrying with next rotated key in ${currentDelay}ms and backing off...`);
            } else {
              console.log(`[Gemini Retry Quick] Rotational retry with next key in ${currentDelay}ms...`);
            }
            
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
          } else {
            console.error(`[Gemini Engine Failure] All ${maxAttempts} rotation/retry attempts failed. Raising final exception to caller.`);
            throw error;
          }
        }
      }

      if (!iterator || !firstResult) {
        throw new Error("Unable to establish communication with Gemini AI model stream.");
      }

      // Set headers for server-sent events for streaming after successful generation handshake
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      let fullText = "";

      // Stream the pre-fetched first chunk to the client
      if (firstResult.value) {
        const chunk = firstResult.value;
        if (chunk.text) {
          fullText += chunk.text;
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      // Stream the remaining chunks from the iterator
      if (!firstResult.done) {
        let nextResult = await iterator.next();
        while (!nextResult.done) {
          const chunk = nextResult.value;
          if (chunk && chunk.text) {
            fullText += chunk.text;
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
          nextResult = await iterator.next();
        }
      }

      // Store in promptCache for duplicate request acceleration
      if (fullText.trim()) {
        promptCache.set(prompt, { text: fullText, timestamp: Date.now() });
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Gemini Route Process Error:", error);
      const rawErrorMsg = error?.message || "";
      const errorString = typeof error === "object" ? JSON.stringify(error) : String(error);
      const isQuotaExceeded = 
        rawErrorMsg.includes("quota") || 
        rawErrorMsg.includes("billing") || 
        rawErrorMsg.includes("plan") || 
        rawErrorMsg.includes("Quota exceeded") || 
        rawErrorMsg.includes("current quota") ||
        rawErrorMsg.includes("exceeded your current quota") ||
        rawErrorMsg.toLowerCase().includes("quota_exceeded") ||
        errorString.toLowerCase().includes("quota") ||
        errorString.toLowerCase().includes("billing") ||
        errorString.toLowerCase().includes("plan") ||
        errorString.toLowerCase().includes("limit");

      const status = error.status === 429 || rawErrorMsg.includes('429') ? 429 : 500;
      
      let customError = rawErrorMsg || "Failed to generate content";
      let customErrorAr = undefined;

      if (isQuotaExceeded) {
        customError = "The system API key quota has been exceeded (429 Quota Limit). To resolve this, please go to the 'Settings > Secrets' (or environment configuration) pane of the platform inside Google AI Studio, ensure your Gemini API Key is configured and has billing/usage-quota active.";
        customErrorAr = "تم تجاوز حصة الاستخدام (Quota Limit - 429) لمفتاح الربط البرمجي المشترك في النطاق المجاني لخوادم Gemini. لحل المشكلة فوراً، يرجى تهيئة أو التحقق من مفتاح API نشط ويمتلك رصيداً للفوترة عبر نافذة 'Settings > Secrets' في لوحة التحكم العلوية للبيئة الذكية.";
      } else if (status === 429) {
        customError = "Content generation is temporarily rate-limited (429). Please wait 30 seconds for the cooldown period to complete.";
        customErrorAr = "تم تجاوز معدل الطلبات المؤقت (أقصى عدد من التوليدات المتزامنة - 429). يرجى الانتظار 30 ثانية لتبريد الاتصال ثم إعادة المحاولة.";
      }

      if (!res.headersSent) {
        res.status(status).json({ 
          error: customError,
          errorAr: customErrorAr
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: customError, errorAr: customErrorAr })}\n\n`);
        res.end();
      }
    } finally {
      // CRITICAL: Always release concurrent generation lock for this client's key in a finally block
      const currentState = userThrottleMap.get(clientKey);
      if (currentState) {
        currentState.isActive = false;
        userThrottleMap.set(clientKey, currentState);
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
