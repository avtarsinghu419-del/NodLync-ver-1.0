import { supabase } from "./supabaseClient";
import type { ApiVaultItem } from "./apiVaultApi";

// ─── Provider registry (UI Only) ─────────────────────────────────────────────

export type CallStyle = "openai-compat" | "anthropic" | "google" | "cohere" | "ollama";

export interface ProviderConfig {
  id: string;
  label: string;
  keywords: string[];
  callStyle: CallStyle;
  baseUrl?: string;
  defaultModel: string;
  models: { label: string; value: string }[];
}

function modelPriority(model: { label: string; value: string }): number {
  const text = `${model.label} ${model.value}`.toLowerCase();
  if (text.includes("free") || text.includes(":free")) return 100;
  if (
    text.includes("mini") ||
    text.includes("flash") ||
    text.includes("haiku") ||
    text.includes("small") ||
    text.includes("lite") ||
    text.includes("instant")
  ) {
    return 80;
  }
  if (text.includes("pro") || text.includes("sonnet") || text.includes("turbo")) return 60;
  if (text.includes("opus") || text.includes("ultra") || text.includes("70b") || text.includes("405b")) {
    return 40;
  }
  return 20;
}

export function sortModelsPreferFree(models: { label: string; value: string }[]) {
  return [...models].sort((left, right) => {
    const scoreDelta = modelPriority(right) - modelPriority(left);
    if (scoreDelta !== 0) return scoreDelta;
    return left.label.localeCompare(right.label);
  });
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
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    keywords: ["google", "gemini"],
    callStyle: "google",
    defaultModel: "gemini-1.5-flash",
    models: [
      { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
      { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
      { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
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
      { label: "Llama 3.3 70B Versatile", value: "llama-3.3-70b-versatile" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keywords: ["openai", "gpt", "turbo"],
    callStyle: "openai-compat",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [
      { label: "GPT-4o Mini", value: "gpt-4o-mini" },
      { label: "GPT-4o", value: "gpt-4o" },
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
];

export function detectProvider(item: ApiVaultItem): ProviderConfig | undefined {
  const haystack = [item.key_name, item.provider, (item as any).description ?? ""].join(" ").toLowerCase();
  return PROVIDER_REGISTRY.find(c => c.keywords.some(kw => haystack.includes(kw)));
}

export function isAiProvider(item: ApiVaultItem): boolean {
  return [
    "openai", "anthropic", "claude", "gemini", "google", "mistral", "cohere",
    "groq", "together", "perplexity", "huggingface", "ollama", "openrouter", "ai", "llm"
  ].some(kw => item.provider.toLowerCase().includes(kw) || item.key_name.toLowerCase().includes(kw));
}

export function getDefaultModel(familyOrId: string): string {
  const provider = PROVIDER_REGISTRY.find((c) => c.id === familyOrId);
  return sortModelsPreferFree(provider?.models ?? [])[0]?.value ?? provider?.defaultModel ?? "gpt-4o-mini";
}

export function getModelOptions(familyOrId: string): { label: string; value: string }[] {
  const provider =
    PROVIDER_REGISTRY.find((c) => c.id === familyOrId) ??
    PROVIDER_REGISTRY.find((c) => c.id === "openai")!;
  return sortModelsPreferFree(provider.models);
}

// ─── Chat implementation ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

type PlaygroundMode = "chat" | "image" | "video";

interface SendMessageOptions {
  apiItem: ApiVaultItem;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  baseUrl?: string;
  mode?: PlaygroundMode;
}

async function invokeAiProxy(body: Record<string, unknown>) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);
  if (!session?.access_token) throw new Error("Not authenticated.");

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: {
      ...body,
      userJwt: session.access_token,
    },
  });

  if (error) {
    const message = (error as any)?.context?.json?.error || (error as any)?.message || "Request failed.";
    throw new Error(message);
  }

  return data;
}

export async function sendChatMessage(opts: SendMessageOptions): Promise<string> {
  const { apiItem, model, messages, systemPrompt, baseUrl, mode = "chat" } = opts;

  const action =
    mode === "image" ? "generate-image" : mode === "video" ? "generate-video" : "chat";

  const payload: Record<string, unknown> = {
    action,
    keyId: apiItem.id,
    provider: detectProvider(apiItem)?.id ?? apiItem.provider,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    model,
    systemPrompt,
    baseUrl: baseUrl || detectProvider(apiItem)?.baseUrl,
  };

  if (mode === "image") {
    payload.prompt = messages.map((message) => message.content).join("\n");
  }
  if (mode === "video") {
    payload.prompt = messages.map((message) => message.content).join("\n");
  }

  const data = await invokeAiProxy(payload);

  if (data?.error) {
    throw new Error(data.error || "Provider error.");
  }

  return data?.data || data?.url || data?.content || "(No response)";
}

export async function fetchOpenRouterModels(): Promise<{ label: string; value: string }[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();
    return json.data
      .filter((m: any) => m.id.includes(":free"))
      .map((m: any) => ({ label: m.name ?? m.id, value: m.id }));
  } catch {
    return [{ label: "OpenRouter Free", value: "openrouter/free" }];
  }
}
