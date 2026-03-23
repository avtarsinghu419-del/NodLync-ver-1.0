import { useCallback, useEffect, useRef, useState } from "react";
import { getApiVaultItems, type ApiVaultItem } from "../../api/apiVaultApi";
import {
  detectProvider,
  getDefaultModel,
  getModelOptions,
  isAiProvider,
  sendChatMessage,
  type ChatMessage,
} from "../../api/aiPlaygroundApi";
import {
  deleteLikedIdea,
  getLikedIdeas,
  saveLikedIdea,
  type LikedIdea,
} from "../../api/likedIdeasApi";
import InlineSpinner from "../../components/InlineSpinner";
import ModuleHeader from "../../components/ModuleHeader";
import useAppStore from "../../store/useAppStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

interface IdeaItem {
  id: string;
  title: string;
  description: string;
}

// ─── Shared Sub-Components ────────────────────────────────────────────────────

const NoApiConfigured = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
    <div className="text-5xl opacity-25">🔑</div>
    <p className="text-slate-300 font-semibold">No AI API configured</p>
    <p className="text-slate-500 text-sm max-w-xs">
      Add an AI provider key in <strong className="text-slate-400">API Vault</strong> to unlock the playground.
    </p>
    <a href="/api-vault" className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-lg text-sm font-bold hover:brightness-110 transition">
      Open API Vault →
    </a>
  </div>
);

/** Dropdown: pick an API key from the vault */
const ApiSelector = ({
  aiItems,
  value,
  onChange,
  label = "API Key",
  compact = false,
}: {
  aiItems: ApiVaultItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  compact?: boolean;
}) => {
  const selected = aiItems.find((i) => i.id === value);
  const cfg = selected ? detectProvider(selected) : undefined;
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      {label && <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest whitespace-nowrap">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary min-w-0 max-w-[170px] truncate"
      >
        {aiItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.key_name} ({item.provider})
          </option>
        ))}
      </select>
      {cfg && (
        <span className="text-[10px] px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold whitespace-nowrap">
          {cfg.label}
        </span>
      )}
    </div>
  );
};

/** Dropdown: pick a model for a given API item */
const ModelSelector = ({
  apiId,
  aiItems,
  value,
  onChange,
  compact = false,
}: {
  apiId: string;
  aiItems: ApiVaultItem[];
  value: string;
  onChange: (m: string) => void;
  compact?: boolean;
}) => {
  const selected = aiItems.find((i) => i.id === apiId);
  const cfg = selected ? detectProvider(selected) : undefined;
  const opts = getModelOptions(cfg?.id ?? "openai");
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest whitespace-nowrap">Model</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary min-w-0 max-w-[200px] truncate"
      >
        {opts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// ─── Provider-aware default model hook ────────────────────────────────────────

function useDefaultModel(apiId: string, aiItems: ApiVaultItem[]): [string, (m: string) => void] {
  const [model, setModel] = useState<string>(() => {
    const item = aiItems.find((i) => i.id === apiId);
    const cfg = item ? detectProvider(item) : undefined;
    return cfg?.defaultModel ?? getDefaultModel(cfg?.id ?? "openai");
  });

  useEffect(() => {
    const item = aiItems.find((i) => i.id === apiId);
    const cfg = item ? detectProvider(item) : undefined;
    setModel(cfg?.defaultModel ?? getDefaultModel(cfg?.id ?? "openai"));
  }, [apiId, aiItems]);

  return [model, setModel];
}

// ─── TAB 1: AI CHAT ──────────────────────────────────────────────────────────

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-primary font-bold mt-0.5">AI</div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? "bg-primary text-slate-900 font-medium rounded-tr-sm"
          : "bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-sm"
      }`}>
        {msg.content}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs text-slate-300 font-bold mt-0.5">U</div>
      )}
    </div>
  );
};

const TypingDots = () => (
  <div className="flex justify-start gap-2">
    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs text-primary font-bold">AI</div>
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  </div>
);

const AiChatTab = ({ aiItems, defaultProvider }: { aiItems: ApiVaultItem[]; defaultProvider: string }) => {
  const defaultItem = aiItems.find((i) => i.provider.toLowerCase().includes(defaultProvider.toLowerCase())) ?? aiItems[0];
  const [apiId, setApiId] = useState(defaultItem?.id ?? "");
  const [model, setModel] = useDefaultModel(apiId, aiItems);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectedApi = aiItems.find((i) => i.id === apiId) ?? null;
  const cfg = selectedApi ? detectProvider(selectedApi) : undefined;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || !selectedApi || loading) return;
    setError(null);
    const userMsg: ChatMessage = { id: genId(), role: "user", content: input.trim(), timestamp: new Date() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendChatMessage({
        apiItem: selectedApi,
        model,
        messages: next,
        systemPrompt: "You are a helpful AI assistant. Be concise and accurate.",
      });
      setMessages((p) => [...p, { id: genId(), role: "assistant", content: reply, timestamp: new Date() }]);
    } catch (e: any) {
      setError(e?.message ?? "Request failed. Check your API key.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 240px)" }}>
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-900/30 flex-shrink-0 flex-wrap gap-y-2">
        <ApiSelector aiItems={aiItems} value={apiId} onChange={setApiId} />
        <ModelSelector apiId={apiId} aiItems={aiItems} value={model} onChange={setModel} />
        {cfg?.baseUrl && (
          <span className="text-[10px] text-slate-600 font-mono hidden lg:block truncate max-w-[200px]" title={cfg.baseUrl}>
            → {cfg.baseUrl.replace("https://", "")}
          </span>
        )}
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setError(null); }} className="ml-auto text-xs text-slate-500 hover:text-rose-400 transition-colors">
            ✕ Clear
          </button>
        )}
      </div>

      {/* error */}
      {error && (
        <div className="mx-4 mt-3 flex-shrink-0 bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-3 text-sm text-rose-300 flex items-start gap-3">
          <span className="flex-shrink-0">⚠</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-400 flex-shrink-0">✕</button>
        </div>
      )}

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 select-none">
            <div className="text-5xl">💬</div>
            <p className="text-slate-400 text-sm font-medium">Start a conversation</p>
            <p className="text-slate-600 text-xs">Enter ↵ to send · Shift+Enter for newline</p>
          </div>
        )}
        {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/40 px-4 py-3">
        <div className="flex items-end gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-primary/60 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-slate-100 resize-none focus:outline-none placeholder:text-slate-600 min-h-[24px] max-h-[160px] leading-relaxed"
            onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 bg-primary disabled:opacity-30 rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
          >
            {loading ? <InlineSpinner /> : (
              <svg className="w-4 h-4 text-slate-900 fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-700 mt-1 text-right">
          {messages.filter((m) => m.role === "user").length} turns · {model}
        </p>
      </div>
    </div>
  );
};

// ─── TAB 2: IDEA GENERATOR ────────────────────────────────────────────────────

function parseIdeas(raw: string): IdeaItem[] {
  const items: IdeaItem[] = [];
  const numbered = raw.match(/\d+[\.\)]\s+\*{0,2}([^\n*:]+)\*{0,2}\s*[:\-–]\s*([^\n]+(?:\n(?!\d+[\.\)])[^\n]+)*)/g);
  if (numbered && numbered.length >= 2) {
    for (const block of numbered) {
      const withoutNum = block.replace(/^\d+[\.\)]\s+/, "");
      const sepIdx = withoutNum.search(/[:\-–]\s*/);
      if (sepIdx === -1) continue;
      const title = withoutNum.slice(0, sepIdx).replace(/\*\*/g, "").trim();
      const desc = withoutNum.slice(sepIdx + 1).replace(/\*\*/g, "").trim();
      if (title) items.push({ id: genId(), title, description: desc || "No description." });
    }
    if (items.length >= 2) return items;
  }
  // fallback: split by blank lines
  const blocks = raw.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.trim().split("\n").filter(Boolean);
    if (!lines.length) continue;
    const title = lines[0].replace(/^[\d\.\)\-\*#]+\s*/, "").replace(/\*\*/g, "").replace(/[:\-–].*/, "").trim();
    const desc = lines.slice(1).join(" ").replace(/\*\*/g, "").replace(/^[\-:\s]+/, "").trim();
    if (title.length > 3) items.push({ id: genId(), title, description: desc || "No description." });
  }
  return items.slice(0, 8);
}

const IdeaGeneratorTab = ({
  aiItems,
  defaultProvider,
  userId,
}: {
  aiItems: ApiVaultItem[];
  defaultProvider: string;
  userId: string;
}) => {
  const defaultItem = aiItems.find((i) => i.provider.toLowerCase().includes(defaultProvider.toLowerCase())) ?? aiItems[0];
  const [apiId, setApiId] = useState(defaultItem?.id ?? "");
  const [model, setModel] = useDefaultModel(apiId, aiItems);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [likedIdeas, setLikedIdeas] = useState<LikedIdea[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [viewingLiked, setViewingLiked] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedApi = aiItems.find((i) => i.id === apiId) ?? null;

  // Load liked ideas on mount
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingLiked(true);
      const { data } = await getLikedIdeas(userId);
      setLikedIdeas(data ?? []);
      setLoadingLiked(false);
    };
    load();
  }, [userId]);

  const generate = useCallback(async () => {
    if (!selectedApi || loading) return;
    setError(null);
    setIdeas([]);
    setLikedIds(new Set());
    setLoading(true);

    const apiList = [...new Set(aiItems.map((i) => `${i.key_name} (${i.provider})`))].join(", ");
    const contextNote = context.trim() ? `\n\nFocus area from user: ${context.trim()}` : "";

    const prompt = `You have access to these AI capabilities:\n${apiList}\n\nGenerate 5 UNIQUE and PRACTICAL product/tool ideas that a developer could realistically build using these AI capabilities.${contextNote}\n\nStrict rules:\n- No repetition between ideas\n- Each idea must combine or use at least one of the listed AI capabilities\n- Ideas must be realistic to build in 1-3 weeks\n- Be specific, not generic\n\nOutput format (EXACTLY):\n1. [Title]: [1-2 sentence description]\n2. [Title]: [1-2 sentence description]\n3. [Title]: [1-2 sentence description]\n4. [Title]: [1-2 sentence description]\n5. [Title]: [1-2 sentence description]`;

    try {
      const reply = await sendChatMessage({
        apiItem: selectedApi,
        model,
        messages: [{ id: genId(), role: "user", content: prompt, timestamp: new Date() }],
      });
      const parsed = parseIdeas(reply);
      setIdeas(parsed.length ? parsed : [{ id: genId(), title: "Raw Output", description: reply }]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate ideas.");
    } finally {
      setLoading(false);
    }
  }, [selectedApi, model, aiItems, loading, context]);

  const handleLike = async (idea: IdeaItem) => {
    if (likedIds.has(idea.id) || savingId) return;
    setSavingId(idea.id);
    const { data, error: err } = await saveLikedIdea({ userId, title: idea.title, description: idea.description });
    if (!err && data) {
      setLikedIds((prev) => new Set([...prev, idea.id]));
      setLikedIdeas((prev) => [data, ...prev]);
    }
    setSavingId(null);
  };

  const handleDeleteLiked = async (id: string) => {
    setDeletingId(id);
    await deleteLikedIdea(id);
    setLikedIdeas((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-4 p-0 sm:p-4 max-w-4xl mx-auto w-full">
      {/* Config */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thinking Model</h3>
          <span className="text-[10px] text-slate-600">{aiItems.length} API key{aiItems.length !== 1 ? "s" : ""} as context</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <ApiSelector aiItems={aiItems} value={apiId} onChange={setApiId} label="Use" />
          <ModelSelector apiId={apiId} aiItems={aiItems} value={model} onChange={setModel} />
        </div>
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Optional focus (e.g. healthcare, developer tools, B2B SaaS...)"
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary placeholder:text-slate-600"
        />
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={loading || !selectedApi}
            className="btn-primary flex-1 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {loading ? <span className="flex items-center justify-center gap-2"><InlineSpinner /> Generating...</span> : "✨ Generate Ideas"}
          </button>
          <button
            onClick={() => setViewingLiked(!viewingLiked)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${viewingLiked ? "border-primary text-primary bg-primary/10" : "border-slate-700 text-slate-400 hover:text-slate-200 bg-slate-800"}`}
          >
            ❤️ {likedIdeas.length > 0 ? likedIdeas.length : ""} Saved
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel border-l-4 border-rose-600 bg-rose-950/30 px-4 py-3 text-sm text-rose-300 flex items-start gap-3">
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      {/* Generated ideas */}
      {ideas.length > 0 && !viewingLiked && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{ideas.length} ideas generated</span>
            <button onClick={generate} className="text-xs text-slate-500 hover:text-primary transition-colors">↻ Regenerate</button>
          </div>
          {ideas.map((idea) => {
            const isLiked = likedIds.has(idea.id);
            const isSaving = savingId === idea.id;
            return (
              <div key={idea.id} className="glass-panel p-4 flex gap-4 hover:border-slate-600 transition-colors group">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary">
                  {ideas.indexOf(idea) + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 text-sm mb-1 group-hover:text-primary transition-colors">{idea.title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{idea.description}</p>
                </div>
                <button
                  onClick={() => handleLike(idea)}
                  disabled={isLiked || isSaving}
                  title={isLiked ? "Saved!" : "Save idea"}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                    isLiked
                      ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 scale-110"
                      : "text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent"
                  } disabled:opacity-50`}
                >
                  {isSaving ? <span className="text-xs"><InlineSpinner /></span> : isLiked ? "❤️" : "🤍"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && ideas.length === 0 && !viewingLiked && (
        <div className="glass-panel p-10 text-center opacity-30">
          <div className="text-4xl mb-3">💡</div>
          <p className="text-slate-400 text-sm">Click "Generate Ideas" to get AI-powered project suggestions</p>
        </div>
      )}

      {/* Liked ideas panel */}
      {viewingLiked && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saved Ideas</span>
            <button onClick={() => setViewingLiked(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Back to Generator</button>
          </div>
          {loadingLiked && <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center"><InlineSpinner /> Loading...</div>}
          {!loadingLiked && likedIdeas.length === 0 && (
            <div className="glass-panel p-10 text-center opacity-30">
              <div className="text-4xl mb-3">🤍</div>
              <p className="text-slate-400 text-sm">No saved ideas yet. Generate some and like the ones you love!</p>
            </div>
          )}
          {likedIdeas.map((idea) => (
            <div key={idea.id} className="glass-panel p-4 flex gap-4 hover:border-slate-600 transition-colors group">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-base">❤️</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-200 text-sm mb-1">{idea.title}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{idea.description}</p>
                <p className="text-[10px] text-slate-700 mt-2 font-mono">{new Date(idea.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleDeleteLiked(idea.id)}
                disabled={deletingId === idea.id}
                className="flex-shrink-0 w-8 h-8 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center text-sm transition-all opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                {deletingId === idea.id ? <InlineSpinner /> : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── TAB 3: RESEARCH WITH AI ─────────────────────────────────────────────────

interface ResearchColumn {
  id: string;
  apiId: string;
  model: string;
  response: string;
  loading: boolean;
  error: string | null;
}

const ResearchColumnCard = ({
  col,
  index,
  aiItems,
  totalCols,
  onChangeApi,
  onChangeModel,
  onRemove,
}: {
  col: ResearchColumn;
  index: number;
  aiItems: ApiVaultItem[];
  totalCols: number;
  onChangeApi: (id: string) => void;
  onChangeModel: (m: string) => void;
  onRemove: () => void;
}) => {
  const selectedApi = aiItems.find((i) => i.id === col.apiId);
  const cfg = selectedApi ? detectProvider(selectedApi) : undefined;

  return (
    <div className="flex flex-col gap-3 min-w-0 flex-1" style={{ minWidth: totalCols > 2 ? 280 : 0 }}>
      {/* Column header */}
      <div className="glass-panel p-3 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI {index + 1}</span>
          {totalCols > 1 && (
            <button onClick={onRemove} className="text-slate-700 hover:text-rose-400 text-xs transition-colors" title="Remove column">✕</button>
          )}
        </div>
        <ApiSelector aiItems={aiItems} value={col.apiId} onChange={onChangeApi} label="" compact />
        <ModelSelector apiId={col.apiId} aiItems={aiItems} value={col.model} onChange={onChangeModel} compact />
        {cfg && (
          <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-bold">
            {cfg.label}
          </span>
        )}
      </div>

      {/* Response box */}
      <div className="glass-panel flex-1 overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
        {col.loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <InlineSpinner />
            <p className="text-xs">Asking {cfg?.label ?? "AI"}...</p>
          </div>
        ) : col.error ? (
          <div className="p-4 flex-1">
            <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-4 text-sm text-rose-300">
              <p className="font-bold mb-1">Error</p>
              <p className="text-xs leading-relaxed">{col.error}</p>
            </div>
          </div>
        ) : col.response ? (
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{col.response}</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-20 select-none">
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-slate-500 text-xs">Response will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ResearchTab = ({ aiItems, defaultProvider }: { aiItems: ApiVaultItem[]; defaultProvider: string }) => {
  const defaultItem = aiItems.find((i) => i.provider.toLowerCase().includes(defaultProvider.toLowerCase())) ?? aiItems[0];

  const makeCol = (overrideApiId?: string): ResearchColumn => {
    const apiId = overrideApiId ?? defaultItem?.id ?? aiItems[0]?.id ?? "";
    const item = aiItems.find((i) => i.id === apiId);
    const cfg = item ? detectProvider(item) : undefined;
    return { id: genId(), apiId, model: cfg?.defaultModel ?? getDefaultModel(cfg?.id ?? "openai"), response: "", loading: false, error: null };
  };

  const [columns, setColumns] = useState<ResearchColumn[]>(() => {
    // Try to give 2 different providers as defaults
    const ids = [...new Set(aiItems.map((i) => i.id))];
    if (ids.length >= 2) return [makeCol(ids[0]), makeCol(ids[1])];
    return [makeCol(), makeCol()];
  });

  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryApiId, setSummaryApiId] = useState(defaultItem?.id ?? "");
  const [summaryModel, setSummaryModel] = useDefaultModel(summaryApiId, aiItems);

  const updateCol = (id: string, patch: Partial<ResearchColumn>) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addCol = () => {
    if (columns.length >= 4) return;
    // Pick an AI key not already in a column if possible
    const usedIds = new Set(columns.map((c) => c.apiId));
    const unused = aiItems.find((i) => !usedIds.has(i.id));
    setColumns((prev) => [...prev, makeCol(unused?.id)]);
  };

  const removeCol = (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const runResearch = async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setSummary("");
    setSummaryError(null);

    // Mark all loading
    setColumns((prev) => prev.map((c) => ({ ...c, loading: true, response: "", error: null })));

    await Promise.all(
      columns.map(async (col) => {
        const apiItem = aiItems.find((i) => i.id === col.apiId);
        if (!apiItem) {
          updateCol(col.id, { loading: false, error: "API key not found." });
          return;
        }
        try {
          const response = await sendChatMessage({
            apiItem,
            model: col.model,
            messages: [{ id: genId(), role: "user", content: prompt.trim(), timestamp: new Date() }],
            systemPrompt: "You are a research assistant. Provide a clear, well-structured response.",
          });
          updateCol(col.id, { loading: false, response });
        } catch (e: any) {
          updateCol(col.id, { loading: false, error: e?.message ?? "Request failed." });
        }
      })
    );
    setRunning(false);
  };

  const generateSummary = async () => {
    const responses = columns.filter((c) => c.response).map((c, i) => {
      const item = aiItems.find((a) => a.id === c.apiId);
      return `[AI ${i + 1} – ${item?.key_name ?? "Unknown"}]\n${c.response}`;
    });
    if (!responses.length) return;

    const summaryApiItem = aiItems.find((i) => i.id === summaryApiId);
    if (!summaryApiItem) return;

    setSummaryLoading(true);
    setSummary("");
    setSummaryError(null);

    const summaryPrompt = `You received the following responses from multiple AI models to the same research question:\n\n${responses.join("\n\n---\n\n")}\n\nSynthesize these into ONE clear, comprehensive summary:\n- Avoid repeating the same point multiple times\n- Highlight the most insightful or unique perspectives from each response\n- Resolve any contradictions if present\n- Keep the summary factual and well-structured`;

    try {
      const result = await sendChatMessage({
        apiItem: summaryApiItem,
        model: summaryModel,
        messages: [{ id: genId(), role: "user", content: summaryPrompt, timestamp: new Date() }],
      });
      setSummary(result);
    } catch (e: any) {
      setSummaryError(e?.message ?? "Summary generation failed.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const anyResponse = columns.some((c) => c.response);
  const anyLoading = columns.some((c) => c.loading);
  const promptRows = Math.min(5, Math.max(2, prompt.split("\n").length));

  return (
    <div className="flex flex-col gap-4 p-0 sm:p-4" style={{ minHeight: "calc(100vh - 240px)" }}>
      {/* Prompt input */}
      <div className="glass-panel p-4 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Research Prompt</h3>
          <span className="text-[10px] text-slate-600">{columns.length} AI model{columns.length !== 1 ? "s" : ""} will respond</span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your research question or topic... All AI columns will respond simultaneously."
          rows={promptRows}
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary resize-none placeholder:text-slate-600 leading-relaxed"
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); runResearch(); } }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={runResearch}
            disabled={!prompt.trim() || running}
            className="btn-primary flex-1 py-2.5 font-bold text-sm disabled:opacity-50"
          >
            {running
              ? <span className="flex items-center justify-center gap-2"><InlineSpinner /> Running...</span>
              : `▶ Run Research across ${columns.length} AIs`}
          </button>
          <button
            onClick={addCol}
            disabled={columns.length >= 4}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors whitespace-nowrap"
          >
            + Add AI
          </button>
        </div>
        <p className="text-[10px] text-slate-700">Ctrl+Enter to run · Max 4 columns</p>
      </div>

      {/* Columns */}
      <div className={`flex flex-col lg:flex-row gap-4 flex-1 pb-1 lg:overflow-x-auto`} style={{ minHeight: 380 }}>
        {columns.map((col, i) => (
          <ResearchColumnCard
            key={col.id}
            col={col}
            index={i}
            aiItems={aiItems}
            totalCols={columns.length}
            onChangeApi={(apiId) => {
              const item = aiItems.find((a) => a.id === apiId);
              const cfg = item ? detectProvider(item) : undefined;
              updateCol(col.id, { apiId, model: cfg?.defaultModel ?? getDefaultModel(cfg?.id ?? "openai") });
            }}
            onChangeModel={(model) => updateCol(col.id, { model })}
            onRemove={() => removeCol(col.id)}
          />
        ))}
      </div>

      {/* Summary section */}
      {anyResponse && !anyLoading && (
        <div className="glass-panel p-4 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">🧠 AI Summary</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <ApiSelector aiItems={aiItems} value={summaryApiId} onChange={setSummaryApiId} label="Summarise with" />
              <ModelSelector apiId={summaryApiId} aiItems={aiItems} value={summaryModel} onChange={setSummaryModel} />
              <button
                onClick={generateSummary}
                disabled={summaryLoading}
                className="btn-primary text-sm py-2 px-5 font-bold disabled:opacity-50"
              >
                {summaryLoading
                  ? <span className="flex items-center gap-2"><InlineSpinner /> Summarising...</span>
                  : "Generate Summary"}
              </button>
            </div>
          </div>

          {summaryError && (
            <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl px-4 py-3 text-sm text-rose-300">
              <span className="font-bold">Error:</span> {summaryError}
            </div>
          )}

          {summary && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {!summary && !summaryLoading && !summaryError && (
            <p className="text-xs text-slate-600 text-center py-3">Click "Generate Summary" to synthesise all responses above into one clear answer.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── MAIN PANEL ───────────────────────────────────────────────────────────────

type TabId = "chat" | "ideas" | "research";

const TABS: { id: TabId; label: string; icon: string; description: string }[] = [
  { id: "chat", label: "AI Chat", icon: "💬", description: "Conversational chat" },
  { id: "ideas", label: "Idea Generator", icon: "💡", description: "Generate & save ideas" },
  { id: "research", label: "Research", icon: "🔬", description: "Multi-model comparison" },
];

const AiPlaygroundPanel = () => {
  const user = useAppStore((s) => s.user);
  const appSettings = useAppStore((s) => s.appSettings);

  const [apiItems, setApiItems] = useState<ApiVaultItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  const aiItems = apiItems.filter(isAiProvider);
  const defaultProvider: string = appSettings?.default_ai_provider ?? "openai";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingKeys(true);
      const { data } = await getApiVaultItems(user.id);
      setApiItems(data ?? []);
      setLoadingKeys(false);
    };
    load();
  }, [user]);

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* Header */}
      <ModuleHeader
        title="AI Playground"
        description="POWERED BY YOUR API VAULT"
        icon="🧪"
      >
        <div className="flex items-center gap-2">
          {loadingKeys ? (
            <span className="flex items-center gap-2 text-xs text-slate-500"><InlineSpinner /> Loading keys...</span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
              {aiItems.length} AI key{aiItems.length !== 1 ? "s" : ""} available
            </span>
          )}
        </div>
      </ModuleHeader>

      {/* Tab container */}
      <div className="glass-panel flex flex-col flex-1 overflow-hidden border border-slate-800/50">
        {/* Tab Bar */}
        <div className="flex items-center gap-0 border-b border-slate-800 px-4 pt-3 flex-shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {activeTab !== tab.id && (
                <span className="hidden sm:block text-[10px] text-slate-700 font-normal">{tab.description}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingKeys ? (
            <div className="flex items-center justify-center py-24 gap-3">
              <InlineSpinner /><span className="text-slate-500 text-sm">Loading API keys...</span>
            </div>
          ) : aiItems.length === 0 ? (
            <NoApiConfigured />
          ) : (
            <>
              {activeTab === "chat" && <AiChatTab aiItems={aiItems} defaultProvider={defaultProvider} />}
              {activeTab === "ideas" && <IdeaGeneratorTab aiItems={aiItems} defaultProvider={defaultProvider} userId={user?.id ?? ""} />}
              {activeTab === "research" && <ResearchTab aiItems={aiItems} defaultProvider={defaultProvider} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiPlaygroundPanel;
