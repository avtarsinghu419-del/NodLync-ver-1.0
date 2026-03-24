import type { ApiVaultItem } from "./apiVaultApi";
import { decryptValue } from "./encryptionHelper";

// ─── Provider registry ────────────────────────────────────────────────────────
//
// Each entry describes one recognisable AI provider.
// `keywords`    – matched against provider name + key name + description + tags (all lower-cased)
// `baseUrl`     – the OpenAI-compatible chat-completions endpoint (if applicable)
// `callStyle`   – which call implementation to use
// `defaultModel`– pre-selected model when this provider is chosen
// `models`      – curated model list shown in the dropdown

export type CallStyle =
  | "openai-compat"   // OpenAI /chat/completions shape, different base URL
  | "anthropic"       // Claude Messages API
  | "google"          // Google Generative Language API
  | "cohere"          // Cohere Chat API
  | "ollama";         // Local Ollama /api/chat

export interface ProviderConfig {
  id: string;           // stable identifier
  label: string;        // human-readable name shown in UI
  keywords: string[];   // any of these in the key metadata → this provider
  callStyle: CallStyle;
  baseUrl?: string;     // only for openai-compat
  defaultModel: string;
  models: { label: string; value: string }[];
}

export const PROVIDER_REGISTRY: ProviderConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keywords: ["anthropic", "claude"],
    callStyle: "anthropic",
    defaultModel: "claude-3-haiku-20240307",
    models: [
      { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
      { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
      { label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" },
      { label: "Claude 3 Sonnet", value: "claude-3-sonnet-20240229" },
      { label: "Claude 3 Opus", value: "claude-3-opus-20240229" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    keywords: ["google", "gemini", "generativelanguage"],
    callStyle: "google",
    defaultModel: "gemini-1.5-flash",
    models: [
      { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
      { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
      { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    ],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    keywords: ["perplexity", "pplx"],
    callStyle: "openai-compat",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "llama-3.1-sonar-small-128k-online",
    models: [
      { label: "Sonar Small (Online)", value: "llama-3.1-sonar-small-128k-online" },
      { label: "Sonar Large (Online)", value: "llama-3.1-sonar-large-128k-online" },
      { label: "Sonar Huge (Online)", value: "llama-3.1-sonar-huge-128k-online" },
      { label: "Sonar (Online)", value: "sonar-online" },
      { label: "Sonar (Chat)", value: "sonar" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    keywords: ["groq"],
    callStyle: "openai-compat",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    models: [
      { label: "Llama 3.1 8B Instant", value: "llama-3.1-8b-instant" },
      { label: "Llama 3.1 70B Versatile", value: "llama-3.1-70b-versatile" },
      { label: "Llama 3.3 70B Versatile", value: "llama-3.3-70b-versatile" },
      { label: "Mixtral 8x7B", value: "mixtral-8x7b-32768" },
      { label: "Gemma 2 9B", value: "gemma2-9b-it" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    keywords: ["mistral", "mistralai"],
    callStyle: "openai-compat",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    models: [
      { label: "Mistral Small", value: "mistral-small-latest" },
      { label: "Mistral Medium", value: "mistral-medium-latest" },
      { label: "Mistral Large", value: "mistral-large-latest" },
      { label: "Codestral", value: "codestral-latest" },
    ],
  },
  {
    id: "together",
    label: "Together AI",
    keywords: ["together", "togetherai"],
    callStyle: "openai-compat",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
    models: [
      { label: "Llama 3.2 11B Vision", value: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo" },
      { label: "Llama 3.1 8B Turbo", value: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
      { label: "Llama 3.1 70B Turbo", value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo" },
      { label: "Mistral 7B Instruct", value: "mistralai/Mistral-7B-Instruct-v0.3" },
      { label: "Qwen 2.5 72B", value: "Qwen/Qwen2.5-72B-Instruct-Turbo" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    keywords: ["deepseek"],
    callStyle: "openai-compat",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: [
      { label: "DeepSeek Chat (V3)", value: "deepseek-chat" },
      { label: "DeepSeek Reasoner (R1)", value: "deepseek-reasoner" },
    ],
  },
  {
    id: "xai",
    label: "xAI / Grok",
    keywords: ["xai", "grok", "x.ai"],
    callStyle: "openai-compat",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-beta",
    models: [
      { label: "Grok Beta", value: "grok-beta" },
      { label: "Grok 2", value: "grok-2-latest" },
      { label: "Grok 2 Vision", value: "grok-2-vision-latest" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keywords: ["openrouter"],
    callStyle: "openai-compat",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/free",
    models: [
      { label: "OpenRouter Free", value: "openrouter/free" },
    ],
  },
  {
    id: "cohere",
    label: "Cohere",
    keywords: ["cohere"],
    callStyle: "cohere",
    defaultModel: "command-r",
    models: [
      { label: "Command R", value: "command-r" },
      { label: "Command R+", value: "command-r-plus" },
      { label: "Command Light", value: "command-light" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    keywords: ["ollama", "localhost", "local"],
    callStyle: "ollama",
    defaultModel: "llama3",
    models: [
      { label: "Llama 3", value: "llama3" },
      { label: "Llama 3.1", value: "llama3.1" },
      { label: "Mistral", value: "mistral" },
      { label: "CodeLlama", value: "codellama" },
      { label: "Phi-3", value: "phi3" },
    ],
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    keywords: ["huggingface", "hugging face", "hf", "inference"],
    callStyle: "openai-compat",
    baseUrl: "https://api-inference.huggingface.co/v1",
    defaultModel: "mistralai/Mistral-7B-Instruct-v0.3",
    models: [
      { label: "Mistral 7B Instruct", value: "mistralai/Mistral-7B-Instruct-v0.3" },
      { label: "Llama 3.1 8B Instruct", value: "meta-llama/Meta-Llama-3.1-8B-Instruct" },
      { label: "Qwen 2.5 72B", value: "Qwen/Qwen2.5-72B-Instruct" },
    ],
  },
  // ── OpenAI last so other providers don't accidentally match generic "ai" keywords first ──
  {
    id: "openai",
    label: "OpenAI",
    keywords: ["openai", "gpt", "davinci", "turbo", "chatgpt"],
    callStyle: "openai-compat",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [
      { label: "GPT-4o Mini", value: "gpt-4o-mini" },
      { label: "GPT-4o", value: "gpt-4o" },
      { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
      { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
      { label: "o1 Mini", value: "o1-mini" },
      { label: "o1", value: "o1" },
    ],
  },
];

// ─── Provider detection ────────────────────────────────────────────────────────

/** Full-text search across all fields of an ApiVaultItem for provider matching */
function buildHaystack(item: ApiVaultItem): string {
  return [
    item.provider,
    item.key_name,
    item.description ?? "",
    item.tags ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Returns the first matching ProviderConfig, or undefined if nothing matched */
export function detectProvider(item: ApiVaultItem): ProviderConfig | undefined {
  const haystack = buildHaystack(item);
  return PROVIDER_REGISTRY.find((cfg) =>
    cfg.keywords.some((kw) => haystack.includes(kw))
  );
}

/** Whether this vault item looks like an AI provider at all */
const AI_KEYWORDS = [
  "openai", "anthropic", "claude", "gemini", "google", "mistral", "cohere",
  "groq", "together", "perplexity", "pplx", "huggingface", "ollama",
  "deepseek", "xai", "grok", "openrouter", "ai", "llm", "gpt", "model",
  "inference", "hf",
];

export function isAiProvider(item: ApiVaultItem): boolean {
  const haystack = buildHaystack(item);
  return AI_KEYWORDS.some((kw) => haystack.includes(kw));
}

// Keep these exports for backward-compat with the panel component
export type ProviderFamily = string;

export function detectProviderFamily(item: ApiVaultItem): string {
  return detectProvider(item)?.id ?? "openai";
}

export function getDefaultModel(familyOrId: string): string {
  return PROVIDER_REGISTRY.find((c) => c.id === familyOrId)?.defaultModel ?? "gpt-4o-mini";
}

export function getModelOptions(familyOrId: string): { label: string; value: string }[] {
  return PROVIDER_REGISTRY.find((c) => c.id === familyOrId)?.models ?? PROVIDER_REGISTRY.find(c => c.id === "openai")!.models;
}

// ─── Chat message type ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// ─── Main send-message dispatcher ─────────────────────────────────────────────

interface SendMessageOptions {
  apiItem: ApiVaultItem;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}

export async function sendChatMessage(opts: SendMessageOptions): Promise<string> {
  const { apiItem, model, messages, systemPrompt } = opts;
  const cfg = detectProvider(apiItem);
  const key = await decryptValue(apiItem.api_key, apiItem.initialization_vector);

  if (!cfg) {
    // Last resort: try as OpenAI-compatible with OpenAI base URL
    return callOpenAICompat({
      baseUrl: "https://api.openai.com/v1",
      key, model, messages, systemPrompt,
    });
  }

  switch (cfg.callStyle) {
    case "openai-compat":
      return callOpenAICompat({
        baseUrl: cfg.baseUrl ?? "https://api.openai.com/v1",
        key, model, messages, systemPrompt,
      });
    case "anthropic":
      return callAnthropic({ key, model, messages, systemPrompt });
    case "google":
      return callGoogle({ key, model, messages, systemPrompt });
    case "cohere":
      return callCohere({ key, model, messages, systemPrompt });
    case "ollama":
      return callOllama({ model, messages, systemPrompt });
    default:
      throw new Error(`Unknown call style for provider "${cfg.label}"`);
  }
}

// ─── OpenAI-compatible ────────────────────────────────────────────────────────

async function callOpenAICompat(opts: {
  baseUrl: string;
  key: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}): Promise<string> {
  const body: any = {
    model: opts.model,
    messages: [
      ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
      ...opts.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 2048,
    temperature: 0.7,
  };

  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? `HTTP ${res.status} from ${opts.baseUrl}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "(No response)";
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function callAnthropic(opts: {
  key: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}): Promise<string> {
  const payload: any = {
    model: opts.model,
    max_tokens: 2048,
    messages: opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content })),
  };
  if (opts.systemPrompt) payload.system = opts.systemPrompt;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "(No response)";
}

// ─── Google Gemini ────────────────────────────────────────────────────────────

async function callGoogle(opts: {
  key: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}): Promise<string> {
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const payload: any = { contents };
  if (opts.systemPrompt) {
    payload.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "(No response)";
}

// ─── Cohere ───────────────────────────────────────────────────────────────────

async function callCohere(opts: {
  key: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}): Promise<string> {
  const nonSystem = opts.messages.filter((m) => m.role !== "system");
  const chatHistory = nonSystem.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "CHATBOT" : "USER",
    message: m.content,
  }));
  const lastMsg = nonSystem.at(-1);

  const payload: any = {
    model: opts.model,
    message: lastMsg?.content ?? "",
    chat_history: chatHistory,
    preamble: opts.systemPrompt,
  };

  const res = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.text ?? "(No response)";
}

// ─── Ollama (local) ───────────────────────────────────────────────────────────

async function callOllama(opts: {
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}): Promise<string> {
  const payload = {
    model: opts.model,
    messages: [
      ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
      ...opts.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: false,
  };

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}. Is Ollama running at localhost:11434?`);
  }

  const data = await res.json();
  return data.message?.content ?? "(No response)";
}

// ─── OpenRouter Models Fetcher ───────────────────────────────────────────────

let cachedOpenRouterModels: { label: string; value: string }[] | null = null;

export async function fetchOpenRouterModels(): Promise<{ label: string; value: string }[]> {
  if (cachedOpenRouterModels) return cachedOpenRouterModels;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error("Failed to fetch models");
    
    const data = await res.json();
    const freeModels = data.data
      .filter((m: any) => m.id.includes(":free"))
      .map((m: any) => ({
        label: m.name || m.id,
        value: m.id
      }));

    if (freeModels.length === 0) {
      return [{ label: "OpenRouter Free", value: "openrouter/free" }];
    }

    cachedOpenRouterModels = freeModels;
    return freeModels;
  } catch (err) {
    console.error("OpenRouter model fetch error:", err);
    return [{ label: "OpenRouter Free", value: "openrouter/free" }];
  }
}
