"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Zap,
  ChevronDown,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Users,
  Sparkles,
} from "lucide-react";
import { usePipeline } from "@/context/pipeline-context";
import type { Config, Creator, PipelineProgress } from "@/lib/types";

const TIMEFRAME_OPTIONS = [
  { label: "Last 7 Days (1 week)", value: 7 },
  { label: "Last 30 Days (1 month)", value: 30 },
  { label: "Last 90 Days (3 months)", value: 90 },
  { label: "Last 180 Days (6 months)", value: 180 },
  { label: "Last 365 Days (1 year)", value: 365 },
];

export default function RunPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [maxPosts, setMaxPosts] = useState(5);
  const [topK, setTopK] = useState(2);
  const [daysLookback, setDaysLookback] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const { isRunning, progress, setIsRunning, setProgress } = usePipeline();

  useEffect(() => {
    fetch("/api/configs").then((r) => r.json()).then((data: Config[]) => {
      setConfigs(data);
      if (data.length > 0 && !selectedConfig) {
        setSelectedConfig(data[0].configName);
      }
    });
    fetch("/api/creators").then((r) => r.json()).then((data: Creator[]) => {
      setCreators(data);
    });
  }, [selectedConfig]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progress?.log.length]);

  const activeConfigObj = configs.find((c) => c.configName === selectedConfig);
  const matchingCreators = activeConfigObj
    ? creators.filter((c) => (activeConfigObj.creatorsCategory === "all" || c.category === activeConfigObj.creatorsCategory) && c.active !== false)
    : [];

  const startPipeline = async () => {
    if (!selectedConfig) return;
    setIsRunning(true);
    setProgress(null);

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configName: selectedConfig,
          creatorUsername: selectedCreator,
          maxPosts,
          topK,
          daysLookback,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: PipelineProgress = JSON.parse(line.slice(6));
              setProgress(data);
            } catch {
              // skip malformed events
            }
          }
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  const totalProgress = progress
    ? progress.phase === "scraping"
      ? progress.creatorsTotal > 0 ? (progress.creatorsProcessed / progress.creatorsTotal) * 30 : 0
      : progress.phase === "analyzing"
        ? progress.postsTotal > 0 ? 30 + (progress.postsProcessed / progress.postsTotal) * 35 : 30
        : progress.phase === "generating"
          ? progress.postsTotal > 0 ? 65 + (progress.postsProcessed / progress.postsTotal) * 35 : 65
          : progress.phase === "done"
            ? 100
            : 0
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Run Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scrape top-performing posts from tagged X accounts, reverse-engineer them with Gemini 2.5 Flash, and generate ready-to-use prompt packets
        </p>
      </div>

      {/* Main Execution Card */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold">Select Configuration & Target Accounts</h2>
          <Badge className="ml-auto text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            Gemini Multimodal Engine
          </Badge>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Post Type / Config</Label>
              <Select
                value={selectedConfig}
                onValueChange={(v) => {
                  if (v) {
                    setSelectedConfig(v);
                    setSelectedCreator("all");
                  }
                }}
              >
                <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                  <SelectValue placeholder="Select a post type config..." />
                </SelectTrigger>
                <SelectContent>
                  {configs.map((c) => (
                    <SelectItem key={c.id} value={c.configName}>{c.configName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3 text-purple-400" />
                Target Creator Scope
              </Label>
              <Select
                value={selectedCreator}
                onValueChange={(v) => v && setSelectedCreator(v)}
              >
                <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                  <SelectValue placeholder="All creators in category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All {matchingCreators.length} in category
                  </SelectItem>
                  {matchingCreators.map((c) => (
                    <SelectItem key={c.id} value={c.username}>
                      @{c.username} {c.displayName ? `(${c.displayName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-purple-400" />
                Timeframe (Lookback Window)
              </Label>
              <Select
                value={String(daysLookback)}
                onValueChange={(v) => v && setDaysLookback(Number(v))}
              >
                <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Creators linked to this tag/category preview */}
          {activeConfigObj && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-muted-foreground">Tagged category:</span>
                  <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.06] border border-white/[0.08]">
                    {activeConfigObj.creatorsCategory}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {matchingCreators.length} active account{matchingCreators.length !== 1 ? "s" : ""}
                </span>
              </div>

              {matchingCreators.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {matchingCreators.map((c) => {
                    const isFocus = selectedCreator === c.username;
                    const isFaded = selectedCreator !== "all" && !isFocus;
                    return (
                      <span
                        key={c.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                          isFocus
                            ? "bg-purple-500/20 border border-purple-500/50 text-purple-200 shadow-sm"
                            : isFaded
                            ? "bg-black/20 border border-white/[0.02] text-muted-foreground/40"
                            : "bg-black/40 border border-white/[0.05] text-[#e7e9ea]"
                        }`}
                      >
                        <span className={isFocus ? "text-purple-300" : "text-purple-400"}>@</span>
                        {c.username}
                        {isFocus && <span className="ml-1 text-[9px] text-purple-300 bg-purple-500/30 px-1 py-0.2 rounded">Target</span>}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-amber-400/80 pt-1">
                  No accounts found with tag &quot;{activeConfigObj.creatorsCategory}&quot;. Add or update creators in{" "}
                  <Link href="/creators" className="underline hover:text-amber-300">
                    Creators
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          {/* Advanced options toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced scrape limits
            </button>

            {showAdvanced && (
              <div className="grid gap-4 md:grid-cols-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <Label className="text-xs text-muted-foreground">Max Posts Scraped / Creator</Label>
                  <Input
                    type="number"
                    value={maxPosts}
                    onChange={(e) => setMaxPosts(Math.max(1, Math.min(Number(e.target.value), 20)))}
                    min={1}
                    max={20}
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Number of recent posts to evaluate per creator</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Top K Best-Performing to Analyze</Label>
                  <Input
                    type="number"
                    value={topK}
                    onChange={(e) => setTopK(Math.max(1, Math.min(Number(e.target.value), 10)))}
                    min={1}
                    max={10}
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Highest engagement posts selected for reverse engineering</p>
                </div>
              </div>
            )}
          </div>

          <Button
            id="run-pipeline-btn"
            onClick={startPipeline}
            disabled={isRunning || !selectedConfig || matchingCreators.length === 0}
            size="lg"
            className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 glow-sm transition-all duration-300 hover:glow text-sm font-semibold gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Pipeline (Scrape → Reverse Engineer → Prompts)...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                Run Pipeline (Scrape & Reverse Engineer)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress & Live Stream */}
      {progress && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progress.phase !== "done" && progress.phase !== "error" && <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />}
                {progress.phase === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {progress.phase === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                <h2 className="text-sm font-semibold">
                  {progress.phase === "scraping" && "Scraping creators via Apify..."}
                  {progress.phase === "analyzing" && "Multimodal Analysis with Gemini 2.5 Flash..."}
                  {progress.phase === "generating" && "Reverse-Engineering & Generating Studio Prompts..."}
                  {progress.phase === "done" && "Pipeline complete — Prompts Ready!"}
                  {progress.phase === "error" && "Pipeline encountered an issue"}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {progress.phase === "scraping" && (
                  <span>Creators: <span className="text-foreground">{progress.creatorsProcessed}/{progress.creatorsTotal}</span></span>
                )}
                {(progress.phase === "analyzing" || progress.phase === "generating" || progress.phase === "done") && (
                  <span>Posts: <span className="text-foreground">{progress.postsProcessed}/{progress.postsTotal}</span></span>
                )}
                {progress.errors.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    {progress.errors.length}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress.phase === "done"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : progress.phase === "error"
                      ? "bg-gradient-to-r from-red-500 to-orange-500"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500"
                  }`}
                  style={{ width: `${progress.phase === "done" ? 100 : totalProgress}%` }}
                />
              </div>
            </div>

            {progress.activeTasks.length > 0 && (
              <div className="space-y-2">
                {progress.activeTasks.map((task, i) => (
                  <div
                    key={`${task}-${i}`}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2"
                  >
                    <Loader2 className="h-3 w-3 text-purple-400 animate-spin shrink-0" />
                    <span className="text-xs font-medium text-foreground/80">{task}</span>
                  </div>
                ))}
              </div>
            )}

            {progress.phase === "done" && progress.postsProcessed > 0 && (
              <Link
                href="/posts"
                className="flex items-center justify-center w-full rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0 font-semibold gap-2 text-white text-sm transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                View Prompts & Reverse Engineering in Posts Studio
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {progress.errors.length > 0 && (
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 space-y-1">
                <p className="text-[11px] font-medium text-red-400">Errors ({progress.errors.length})</p>
                {progress.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-400/70 leading-relaxed">{err}</p>
                ))}
              </div>
            )}
          </div>

          <details open className="glass rounded-2xl overflow-hidden">
            <summary className="p-4 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Terminal className="h-4 w-4" />
              <span className="font-medium">Pipeline Live Execution Log</span>
              <Badge variant="secondary" className="ml-auto rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
                {progress.log.length} entries
              </Badge>
            </summary>
            <div className="border-t border-white/[0.06]">
              <ScrollArea className="h-[360px] p-4">
                <div className="space-y-0.5 font-mono text-[11px]">
                  {progress.log.map((line, i) => {
                    const isPhaseHeader = line.startsWith("──");
                    const isError = line.includes("Error") || line.includes("FAILED");
                    const isSuccess = line.includes("Done") || line.includes("complete") || line.includes("COMPLETE") || line.includes("Saved");
                    const isEmpty = line.trim() === "";

                    if (isEmpty) return <div key={i} className="h-2" />;

                    return (
                      <div
                        key={i}
                        className={`leading-5 ${
                          isPhaseHeader
                            ? "text-purple-400 font-semibold mt-1"
                            : isError
                            ? "text-red-400"
                            : isSuccess
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              </ScrollArea>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
