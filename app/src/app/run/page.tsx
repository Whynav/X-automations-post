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
import { Play, Loader2, CheckCircle2, XCircle, Terminal, Zap, ChevronDown, ArrowRight, MessageSquare, AlertTriangle } from "lucide-react";
import { usePipeline } from "@/context/pipeline-context";
import type { Config, PipelineProgress } from "@/lib/types";

export default function RunPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [maxPosts, setMaxPosts] = useState(20);
  const [topK, setTopK] = useState(3);
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
  }, [selectedConfig]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progress?.log.length]);

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
          Analyze X posts and generate ready-to-publish content
        </p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold">Pipeline Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Config</Label>
            <Select value={selectedConfig} onValueChange={(v) => v && setSelectedConfig(v)}>
              <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                <SelectValue placeholder="Select a config..." />
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.configName}>{c.configName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
            Advanced settings
          </button>

          {showAdvanced && (
            <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <Label className="text-xs text-muted-foreground">Max Posts per Creator</Label>
                <Input
                  type="number"
                  value={maxPosts}
                  onChange={(e) => setMaxPosts(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Top K to Analyze</Label>
                <Input
                  type="number"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Days Lookback</Label>
                <Input
                  type="number"
                  value={daysLookback}
                  onChange={(e) => setDaysLookback(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                />
              </div>
            </div>
          )}

          <Button
            onClick={startPipeline}
            disabled={isRunning || !selectedConfig}
            size="lg"
            className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 glow-sm transition-all duration-300 hover:glow text-sm font-semibold"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Pipeline...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Pipeline
              </>
            )}
          </Button>
        </div>
      </div>

      {progress && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progress.phase !== "done" && progress.phase !== "error" && <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />}
                {progress.phase === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {progress.phase === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                <h2 className="text-sm font-semibold">
                  {progress.phase === "scraping" && "Scraping creators..."}
                  {progress.phase === "analyzing" && "Analyzing posts..."}
                  {progress.phase === "generating" && "Generating content..."}
                  {progress.phase === "done" && "Pipeline complete"}
                  {progress.phase === "error" && "Pipeline failed"}
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
                View New Posts
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
              <span className="font-medium">Log</span>
              <Badge variant="secondary" className="ml-auto rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
                {progress.log.length} entries
              </Badge>
            </summary>
            <div className="border-t border-white/[0.06]">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-0.5 font-mono text-[11px]">
                  {progress.log.map((line, i) => {
                    const isPhaseHeader = line.startsWith("──");
                    const isError = line.includes("Error") || line.includes("FAILED");
                    const isSuccess = line.includes("Done —") || line.includes("complete") || line.includes("COMPLETE") || line.includes("Saved");
                    const isStats = line.startsWith("  Found") || line.includes("chars)");
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
                            : isStats
                            ? "text-blue-400/70"
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
