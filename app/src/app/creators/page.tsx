"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, UserCheck, RefreshCw, Loader2, ExternalLink, MessageSquare, BadgeCheck } from "lucide-react";
import Link from "next/link";
import type { Creator } from "@/lib/types";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [form, setForm] = useState({ username: "", category: "", studyFocus: "" });
  const [filterCategory, setFilterCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadCreators = () => {
    fetch("/api/creators").then((r) => r.json()).then(setCreators);
  };

  useEffect(() => { loadCreators(); }, []);

  const uniqueCategories = [...new Set(creators.map((c) => c.category))].sort();

  const filtered = filterCategory === "all"
    ? creators
    : creators.filter((c) => c.category === filterCategory);

  const openNew = () => {
    setEditing(null);
    setForm({ username: "", category: "", studyFocus: "" });
    setDialogOpen(true);
  };

  const openEdit = (creator: Creator) => {
    setEditing(creator);
    setForm({ username: creator.username, category: creator.category, studyFocus: creator.studyFocus || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await fetch("/api/creators", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
      } else {
        await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      loadCreators();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/creators?id=${id}`, { method: "DELETE" });
    loadCreators();
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/creators/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.current) {
                const c = creators.find((cr) => cr.username === data.current);
                if (c) setRefreshingId(c.id);
              } else if (data.done) {
                setRefreshingId(null);
              }
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      setRefreshing(false);
      setRefreshingId(null);
      loadCreators();
    }
  };

  const handleRefreshOne = async (id: string) => {
    setRefreshingId(id);
    try {
      const response = await fetch("/api/creators/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      loadCreators();
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage X accounts to track and analyze
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="rounded-xl glass border-white/[0.08] gap-1.5 text-xs"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh All
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              onClick={openNew}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 text-white text-sm font-medium px-4 py-2 h-9 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Creator
            </DialogTrigger>
            <DialogContent className="glass-strong rounded-2xl border-white/[0.08]">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Creator" : "Add Creator"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">X Username (without @)</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. CarlWeische"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category (e.g. Reddit Operators, Reddit Process, etc.)</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Reddit Operators"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Specific Tag / Focus (e.g. Distribution Tactics, Reputation Control, etc.)</Label>
                  <Input
                    value={form.studyFocus}
                    onChange={(e) => setForm({ ...form, studyFocus: e.target.value })}
                    placeholder="e.g. Reddit Operator or Distribution Tactics"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                {!editing && (
                  <p className="text-[11px] text-muted-foreground">
                    Profile picture, followers, and stats will be scraped automatically from X.
                  </p>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.username || !form.category}
                  className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editing ? "Saving..." : "Adding & scraping..."}
                    </>
                  ) : (
                    editing ? "Save Changes" : "Add Creator"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterCategory} onValueChange={(v) => v && setFilterCategory(v)}>
          <SelectTrigger className="w-[220px] rounded-xl glass border-white/[0.08] h-10">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
          {filtered.length} creators
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((creator) => {
          const isRefreshing = refreshingId === creator.id;
          return (
            <div
              key={creator.id}
              className={`group glass rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.1] ${isRefreshing ? "animate-pulse" : ""}`}
            >
              <div className="flex items-start justify-between">
                <a
                  href={`https://x.com/${creator.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/[0.1]">
                    {creator.profilePicUrl ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(creator.profilePicUrl)}`}
                        alt={`@${creator.username}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground/50">
                        {creator.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold hover:text-purple-400 transition-colors">
                        {creator.displayName || `@${creator.username}`}
                      </p>
                      {creator.isBlueVerified && (
                        <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="secondary" className="rounded-md text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {creator.category}
                      </Badge>
                      {creator.studyFocus && (
                        <Badge variant="outline" className="rounded-md text-[10px] bg-white/[0.04] border-white/[0.08] text-cyan-300">
                          {creator.studyFocus}
                        </Badge>
                      )}
                    </div>
                  </div>
                </a>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRefreshOne(creator.id)}
                    disabled={isRefreshing}
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(creator)}
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(creator.id)}
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {creator.followers > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <UserCheck className="mx-auto h-3.5 w-3.5 text-blue-400 mb-1" />
                    <p className="text-sm font-bold">{formatNumber(creator.followers)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Followers</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <Users className="mx-auto h-3.5 w-3.5 text-cyan-400 mb-1" />
                    <p className="text-sm font-bold">{formatNumber(creator.following)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Following</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <MessageSquare className="mx-auto h-3.5 w-3.5 text-purple-400 mb-1" />
                    <p className="text-sm font-bold">{formatNumber(creator.totalPosts)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Posts</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-black/20 border border-white/[0.04] p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    No stats yet — click <RefreshCw className="inline h-3 w-3" /> to scrape
                  </p>
                </div>
              )}

              {creator.bio && (
                <p className="mt-3 text-[11px] text-muted-foreground/60 line-clamp-2">
                  {creator.bio}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                {creator.lastScrapedAt ? (
                  <p className="text-[10px] text-muted-foreground/60">
                    Scraped {new Date(creator.lastScrapedAt).toLocaleDateString()}
                  </p>
                ) : <span />}
                <Link
                  href={`/posts?creator=${creator.username}`}
                  className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  View posts <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full glass rounded-2xl p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No creators yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
