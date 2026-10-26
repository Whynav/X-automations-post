"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Search,
  Sparkles,
  Star,
  ArrowUpDown,
  ExternalLink,
  Copy,
  FileText,
  ImageIcon,
  ChevronDown,
  Play,
  Share,
  Check,
  BarChart3,
  Layers,
  HelpCircle,
  Cpu,
} from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import type { Post, Config, Creator } from "@/lib/types";

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 365) return `${Math.floor(days / 365)}y`;
  if (days > 30) return `${Math.floor(days / 30)}mo`;
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(diff / 60000);
  if (mins > 0) return `${mins}m`;
  return "now";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SortOption =
  | "viralScore"
  | "engagementRate"
  | "likes"
  | "views"
  | "retweets"
  | "bookmarks"
  | "datePosted"
  | "starred";

const sortLabels: Record<SortOption, string> = {
  viralScore: "⚡ Viral Score (X Algorithm)",
  engagementRate: "📈 Engagement Rate (%)",
  likes: "❤️ Most Likes",
  views: "👁️ Most Views",
  retweets: "🔁 Most Retweets",
  bookmarks: "🔖 Most Bookmarks",
  datePosted: "📅 Date Posted",
  starred: "⭐ Starred First",
};

// Twitter / X Algorithmic Weighted Engagement Score
// Heavy Ranker weights: Bookmarks: 20x, Retweets: 10x, Quotes: 8x, Replies: 5x, Likes: 1x
function getViralScore(p: Post): number {
  return (
    (p.bookmarks || 0) * 20 +
    (p.retweets || 0) * 10 +
    (p.quotes || 0) * 8 +
    (p.replies || 0) * 5 +
    (p.likes || 0) * 1
  );
}

// Engagements relative to Impressions (Views)
function getEngagementRate(p: Post): number {
  if (!p.views || p.views <= 0) return 0;
  const total = (p.likes || 0) + (p.retweets || 0) + (p.replies || 0) + (p.bookmarks || 0);
  return (total / p.views) * 100;
}

function VerifiedBadge({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className}>
      <path
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.893.143.636-.131 1.222-.437 1.69-.884.445-.47.749-1.055.878-1.691.13-.634.08-1.29-.144-1.896.587-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
        fill="#1d9bf0"
      />
    </svg>
  );
}

function XLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function getArchetypeBadge(rawStyle: string) {
  const s = (rawStyle || "").toLowerCase();
  if (s.includes("bar chart") || s.includes("comparison")) {
    return {
      label: "Bar Chart Comparison",
      className: "border-[#C8FF00]/40 text-[#C8FF00] bg-[#C8FF00]/10",
      dot: "bg-[#C8FF00]",
    };
  }
  if (s.includes("proportional") || s.includes("blocks")) {
    return {
      label: "Proportional Blocks",
      className: "border-[#3B82F6]/40 text-[#60a5fa] bg-[#3B82F6]/10",
      dot: "bg-[#3B82F6]",
    };
  }
  if (s.includes("ranked") || s.includes("horizontal") || s.includes("leaderboard")) {
    return {
      label: "Ranked Horizontal Bars",
      className: "border-amber-400/40 text-amber-300 bg-amber-400/10",
      dot: "bg-amber-400",
    };
  }
  if (s.includes("timeline")) {
    return {
      label: "Timeline",
      className: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
      dot: "bg-emerald-400",
    };
  }
  if (s.includes("pyramid") || s.includes("funnel")) {
    return {
      label: "Pyramid / Funnel",
      className: "border-purple-400/40 text-purple-300 bg-purple-400/10",
      dot: "bg-purple-400",
    };
  }
  return {
    label: "Text-Only",
    className: "border-white/10 text-muted-foreground bg-white/[0.04]",
    dot: "bg-slate-400",
  };
}

export default function PostsPage() {
  return (
    <Suspense>
      <PostsContent />
    </Suspense>
  );
}

function PostsContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filterConfig, setFilterConfig] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>(searchParams.get("creator") || "all");
  const [filterArchetype, setFilterArchetype] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("viralScore");
  const [modalPost, setModalPost] = useState<Post | null>(null);
  const [modalTab, setModalTab] = useState<"original" | "analysis" | "claude" | "image">("claude");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [personalAnswers, setPersonalAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/posts").then((r) => r.json()).then(setPosts);
    fetch("/api/configs").then((r) => r.json()).then(setConfigs);
    fetch("/api/creators").then((r) => r.json()).then(setCreators);
  }, []);

  const creatorMap = new Map(creators.map((c) => [c.username, c]));
  const uniqueCreators = [...new Set(posts.map((p) => p.creator))].sort();

  const filtered = posts
    .filter((p) => {
      if (filterConfig !== "all" && p.configName !== filterConfig) return false;
      if (filterCreator !== "all" && p.creator !== filterCreator) return false;
      if (filterArchetype !== "all") {
        const style = p.visualArchetype || p.infographicStyle || "Text-Only";
        if (filterArchetype === "Text-Only") {
          if (!style.toLowerCase().includes("text-only") && style !== "none" && style !== "") return false;
        } else if (!style.toLowerCase().includes(filterArchetype.toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "starred") {
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return getViralScore(b) - getViralScore(a) || (b.likes - a.likes);
      }
      if (sortBy === "viralScore") {
        const diff = getViralScore(b) - getViralScore(a);
        if (diff !== 0) return diff;
        return (b.views - a.views) || (b.likes - a.likes) || b.id.localeCompare(a.id);
      }
      if (sortBy === "engagementRate") {
        const diff = getEngagementRate(b) - getEngagementRate(a);
        if (diff !== 0) return diff;
        return (b.views - a.views) || (b.likes - a.likes) || b.id.localeCompare(a.id);
      }
      if (sortBy === "bookmarks") {
        const diff = (b.bookmarks || 0) - (a.bookmarks || 0);
        if (diff !== 0) return diff;
        return (b.likes - a.likes) || (b.views - a.views) || b.id.localeCompare(a.id);
      }
      if (sortBy === "views") {
        const diff = (b.views || 0) - (a.views || 0);
        if (diff !== 0) return diff;
        return (b.likes - a.likes) || (b.retweets - a.retweets) || b.id.localeCompare(a.id);
      }
      if (sortBy === "likes") {
        const diff = (b.likes || 0) - (a.likes || 0);
        if (diff !== 0) return diff;
        return (b.views - a.views) || (b.retweets - a.retweets) || b.id.localeCompare(a.id);
      }
      if (sortBy === "retweets") {
        const diff = (b.retweets || 0) - (a.retweets || 0);
        if (diff !== 0) return diff;
        return (b.likes - a.likes) || (b.views - a.views) || b.id.localeCompare(a.id);
      }
      if (sortBy === "datePosted") {
        const diff = (b.datePosted || "").localeCompare(a.datePosted || "");
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      }
      return 0;
    });

  const toggleStar = async (id: string, currentStarred: boolean) => {
    const newStarred = !currentStarred;
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, starred: newStarred } : p))
    );
    await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, starred: newStarred }),
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getEffectiveClaudePrompt = (post: Post) => {
    const rawPacket = post.claudePromptPacket || post.generatedPostText || "";
    const answer = personalAnswers[post.id]?.trim();
    if (!answer) return rawPacket;

    if (rawPacket.includes("[INSERT MY QUICK ANSWER HERE]")) {
      return rawPacket.replace("[INSERT MY QUICK ANSWER HERE]", answer);
    }
    if (rawPacket.includes("[TYPE YOUR 1-2 SENTENCE OBSERVATION OR SCRAPED STAT HERE]")) {
      return rawPacket.replace("[TYPE YOUR 1-2 SENTENCE OBSERVATION OR SCRAPED STAT HERE]", answer);
    }
    return `${rawPacket}\n\n### MY REAL OPERATOR OBSERVATION / DATA POINT:\n${answer}`;
  };

  const getOriginalMediaUrls = (post: Post): string[] => {
    try {
      const urls = JSON.parse(post.mediaUrls || "[]");
      return Array.isArray(urls) ? urls : [];
    } catch {
      return [];
    }
  };

  const proxyUrl = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;

  const getCreatorInfo = (username: string) => {
    const c = creatorMap.get(username);
    return {
      displayName: c?.displayName || username,
      profilePic: c?.profilePicUrl || null,
      isVerified: c?.isBlueVerified || false,
    };
  };

  const renderTweetHeader = (post: Post) => {
    const info = getCreatorInfo(post.creator);
    return (
      <div className="flex gap-3">
        {info.profilePic ? (
          <img
            src={proxyUrl(info.profilePic)}
            alt={post.creator}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
            {post.creator[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[15px] font-bold text-white truncate">{info.displayName}</span>
            {info.isVerified && <VerifiedBadge className="h-[18px] w-[18px] shrink-0" />}
            <span className="text-[15px] text-[#71767b] truncate">@{post.creator}</span>
            <span className="text-[#71767b]">·</span>
            <span className="text-[15px] text-[#71767b] hover:underline shrink-0">{timeAgo(post.datePosted)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTweetActions = (post: Post) => (
    <div className="flex items-center justify-between mt-3 max-w-[425px] -ml-2">
      <button className="group flex items-center gap-1 text-[#71767b] hover:text-[#1d9bf0] transition-colors">
        <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
          <MessageCircle className="h-[18px] w-[18px]" />
        </div>
        <span className="text-[13px]">{post.replies > 0 ? formatCount(post.replies) : ""}</span>
      </button>
      <button className="group flex items-center gap-1 text-[#71767b] hover:text-[#00ba7c] transition-colors">
        <div className="p-2 rounded-full group-hover:bg-[#00ba7c]/10 transition-colors">
          <Repeat2 className="h-[18px] w-[18px]" />
        </div>
        <span className="text-[13px]">{post.retweets > 0 ? formatCount(post.retweets) : ""}</span>
      </button>
      <button className="group flex items-center gap-1 text-[#71767b] hover:text-[#f91880] transition-colors">
        <div className="p-2 rounded-full group-hover:bg-[#f91880]/10 transition-colors">
          <Heart className="h-[18px] w-[18px]" />
        </div>
        <span className="text-[13px]">{post.likes > 0 ? formatCount(post.likes) : ""}</span>
      </button>
      <button className="group flex items-center gap-1 text-[#71767b] hover:text-[#1d9bf0] transition-colors">
        <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
          <BarChart3 className="h-[18px] w-[18px]" />
        </div>
        <span className="text-[13px]">{post.views > 0 ? formatCount(post.views) : ""}</span>
      </button>
      <div className="flex items-center gap-0">
        <button className="group flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors">
          <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
            <Bookmark className="h-[18px] w-[18px]" />
          </div>
          <span className="text-[13px]">{post.bookmarks > 0 ? formatCount(post.bookmarks) : ""}</span>
        </button>
      </div>
    </div>
  );

  const renderMediaGrid = (urls: string[], mediaType: string) => {
    if (urls.length === 0) return null;
    const isVideo = mediaType === "video" || mediaType === "gif";

    if (isVideo) {
      return (
        <div className="relative rounded-2xl overflow-hidden border border-[#2f3336] aspect-video">
          <img src={proxyUrl(urls[0])} alt="Video" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[68px] h-[68px] rounded-full bg-[#1d9bf0] flex items-center justify-center shadow-lg">
              <Play className="h-8 w-8 text-white ml-1" fill="white" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/70 backdrop-blur-sm text-white text-[13px] font-medium px-2 py-0.5 rounded">
              {mediaType === "gif" ? "GIF" : "Video"}
            </span>
          </div>
        </div>
      );
    }

    if (urls.length === 1) {
      return (
        <div className="rounded-2xl overflow-hidden border border-[#2f3336]">
          <img src={proxyUrl(urls[0])} alt="Post media" className="w-full object-cover max-h-[350px]" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-[#2f3336]">
        {urls.slice(0, 4).map((url, i) => (
          <img key={i} src={proxyUrl(url)} alt={`Media ${i + 1}`} className="w-full h-full object-cover aspect-square" />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Posts & Prompt Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reverse-engineered viral blueprints with direct Claude & Visual generation prompts
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterConfig} onValueChange={(v) => v && setFilterConfig(v)}>
          <SelectTrigger className="w-[220px] rounded-xl glass border-white/[0.08] h-10">
            <SelectValue placeholder="Filter by config" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Configs</SelectItem>
            {configs.map((c) => (
              <SelectItem key={c.id} value={c.configName}>{c.configName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCreator} onValueChange={(v) => v && setFilterCreator(v)}>
          <SelectTrigger className="w-[200px] rounded-xl glass border-white/[0.08] h-10">
            <SelectValue placeholder="Filter by creator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Creators</SelectItem>
            {uniqueCreators.map((c) => (
              <SelectItem key={c} value={c}>@{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterArchetype} onValueChange={(v) => v && setFilterArchetype(v)}>
          <SelectTrigger className="w-[220px] rounded-xl glass border-white/[0.08] h-10">
            <ImageIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filter by visual style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visual Styles</SelectItem>
            <SelectItem value="Bar Chart Comparison">📊 Bar Chart Comparison</SelectItem>
            <SelectItem value="Proportional Blocks">🧱 Proportional Blocks</SelectItem>
            <SelectItem value="Ranked Horizontal Bars">📋 Ranked Horizontal Bars</SelectItem>
            <SelectItem value="Timeline">📈 Timeline</SelectItem>
            <SelectItem value="Pyramid / Funnel">🔺 Pyramid / Funnel</SelectItem>
            <SelectItem value="Text-Only">✍️ Text-Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[245px] rounded-xl glass border-white/[0.08] h-10">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue>{sortLabels[sortBy]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viralScore">⚡ Viral Score (X Algorithm)</SelectItem>
            <SelectItem value="engagementRate">📈 Engagement Rate (%)</SelectItem>
            <SelectItem value="likes">❤️ Most Likes</SelectItem>
            <SelectItem value="views">👁️ Most Views</SelectItem>
            <SelectItem value="retweets">🔁 Most Retweets</SelectItem>
            <SelectItem value="bookmarks">🔖 Most Bookmarks</SelectItem>
            <SelectItem value="datePosted">📅 Date Posted</SelectItem>
            <SelectItem value="starred">⭐ Starred First</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
          {filtered.length} analyzed posts
        </Badge>
      </div>

      {/* Post cards */}
      <div className="space-y-6">
        {filtered.map((post, index) => {
          const originalMedia = getOriginalMediaUrls(post);
          const hasOriginalMedia = originalMedia.length > 0 && post.mediaType !== "none";
          const effectiveClaudePrompt = getEffectiveClaudePrompt(post);
          const hasVisualPrompt = Boolean(post.chatgptImagePrompt || post.generatedImagePrompt);
          const visualStyle = post.visualArchetype || post.infographicStyle || "Text-Only";
          const viralScore = getViralScore(post);
          const er = getEngagementRate(post);

          return (
            <div key={post.id} className="rounded-2xl border border-[#2f3336] bg-black/40 overflow-hidden transition-all duration-200 hover:border-purple-500/30">
              {/* Card Action Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2f3336] bg-white/[0.02]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Rank Badge */}
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-tight shrink-0 ${
                      index === 0
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                        : index === 1
                        ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                        : index === 2
                        ? "bg-amber-700/20 text-amber-400 border border-amber-700/40"
                        : "bg-white/[0.05] text-muted-foreground border border-white/[0.08]"
                    }`}
                  >
                    #{index + 1}
                  </span>

                  {/* Viral Score Pill */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    <span>Score: <strong>{formatCount(viralScore)}</strong></span>
                    {er > 0 && <span className="text-purple-300/60 ml-0.5">· ER: {er.toFixed(1)}%</span>}
                  </div>

                  <div className="h-3.5 w-px bg-white/10 mx-0.5 hidden sm:block" />

                  <button
                    onClick={() => { setModalPost(post); setModalTab("original"); }}
                    className="text-[12px] text-[#71767b] hover:text-[#1d9bf0] transition-colors flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Original Tweet
                  </button>
                  <button
                    onClick={() => { setModalPost(post); setModalTab("analysis"); }}
                    className="text-[12px] text-[#71767b] hover:text-purple-400 transition-colors flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Deep Analysis
                  </button>
                  <button
                    onClick={() => { setModalPost(post); setModalTab("claude"); }}
                    className="text-[12px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    Claude Prompt
                  </button>
                  {hasVisualPrompt && (
                    <button
                      onClick={() => { setModalPost(post); setModalTab("image"); }}
                      className="text-[12px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Visual Prompt
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#71767b] hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/[0.06]"
                    title="View original on X"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => toggleStar(post.id, post.starred)}
                    className="p-1.5 rounded-full hover:bg-yellow-500/10 transition-colors"
                  >
                    <Star className={`h-4 w-4 transition-colors ${post.starred ? "fill-yellow-400 text-yellow-400" : "text-[#71767b] hover:text-yellow-400/60"}`} />
                  </button>
                </div>
              </div>

              {/* Two-Column Studio Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* LEFT: Original Scraped Post */}
                <div className="p-5 lg:border-r border-[#2f3336] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold tracking-widest uppercase text-[#1d9bf0]/80">
                          Scraped Winner
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/80">
                          #{index + 1}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-white/[0.04] border-white/[0.06]">
                        {post.configName}
                      </Badge>
                    </div>

                    {renderTweetHeader(post)}

                    <div className="pl-[52px] -mt-1">
                      <p className="text-[15px] leading-[22px] text-[#e7e9ea] whitespace-pre-wrap break-words">
                        {post.text}
                      </p>
                      {hasOriginalMedia && (
                        <div className="mt-3">
                          {renderMediaGrid(originalMedia, post.mediaType)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pl-[52px]">
                    {renderTweetActions(post)}
                  </div>
                </div>

                {/* RIGHT: Reverse-Engineered Blueprint & Studio Prompts */}
                <div className="p-5 bg-gradient-to-b from-purple-500/[0.02] to-transparent space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-purple-400 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Reverse-Engineered Blueprint & Prompts
                    </span>
                    {(() => {
                      const badge = getArchetypeBadge(visualStyle);
                      return (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Why it worked */}
                  {post.whyItWorked && (
                    <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
                        <Layers className="h-3 w-3" />
                        Why It Worked (Viral Psychology)
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {post.whyItWorked}
                      </p>
                    </div>
                  )}

                  {/* Hook Formula */}
                  {post.hookFormula && (
                    <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-1">
                      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Extracted Hook Formula
                      </div>
                      <p className="text-xs font-mono text-cyan-300/90 leading-relaxed bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                        {post.hookFormula}
                      </p>
                    </div>
                  )}

                  {/* Visual / Image Prompt Box */}
                  {hasVisualPrompt ? (
                    <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                          <ImageIcon className="h-3 w-3" />
                          <span>Branded Infographic Prompt ({getArchetypeBadge(visualStyle).label})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(post.chatgptImagePrompt || post.generatedImagePrompt, `img-${post.id}`)}
                          className="h-7 px-2.5 text-[11px] gap-1 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        >
                          {copiedKey === `img-${post.id}` ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Prompt
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground/90 font-mono leading-relaxed line-clamp-2 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                        {post.chatgptImagePrompt || post.generatedImagePrompt}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Text-Only format (no infographic needed)
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">Copy-driven viral hook</span>
                    </div>
                  )}

                  {/* Interactive Personalization Input */}
                  {post.personalizeQuestion && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3 text-purple-400" />
                        {post.personalizeQuestion}
                      </label>
                      <Input
                        value={personalAnswers[post.id] || ""}
                        onChange={(e) => setPersonalAnswers({ ...personalAnswers, [post.id]: e.target.value })}
                        placeholder="Add your observation or data point (dynamically injected into Claude prompt)..."
                        className="rounded-xl glass border-white/[0.08] text-xs h-9 bg-black/40"
                      />
                    </div>
                  )}

                  {/* Claude Master Prompt Box + Big Copy Button */}
                  <div className="pt-2">
                    <Button
                      onClick={() => copyToClipboard(effectiveClaudePrompt, `claude-${post.id}`)}
                      className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 text-white font-medium text-xs gap-2 glow-sm transition-all"
                    >
                      {copiedKey === `claude-${post.id}` ? (
                        <>
                          <Check className="h-4 w-4 text-white" />
                          Claude Prompt Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Complete Claude Master Prompt
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60 text-center mt-1.5">
                      Paste directly into Claude (or any LLM) to draft your viral post/thread in your voice
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#2f3336] bg-black/40 p-16 text-center">
          <div className="relative inline-block">
            <XLogo className="mx-auto h-12 w-12 text-[#71767b]/30" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-white">No posts analyzed yet</h3>
          <p className="mt-2 text-[15px] text-[#71767b] max-w-sm mx-auto">
            Head over to Run Pipeline to scrape top performing X posts and generate your reverse-engineered prompts.
          </p>
          <div className="mt-6">
            <Button
              render={<a href="/run" />}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0"
            >
              Go to Run Pipeline
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!modalPost} onOpenChange={(open) => { if (!open) setModalPost(null); }}>
        <DialogContent className="!flex !flex-col max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#2f3336] bg-black/95 backdrop-blur-2xl p-0 gap-0">
          <DialogTitle className="sr-only">Post Details</DialogTitle>
          {modalPost && (() => {
            const info = getCreatorInfo(modalPost.creator);
            const originalMedia = getOriginalMediaUrls(modalPost);
            const effectiveClaudePrompt = getEffectiveClaudePrompt(modalPost);

            return (
              <>
                {/* Modal Header Tabs */}
                <div className="shrink-0 border-b border-[#2f3336] px-4 pt-3 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(["claude", "image", "analysis", "original"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setModalTab(tab)}
                        className={`relative px-3 pb-3 pt-1 text-[13px] font-bold transition-colors ${
                          modalTab === tab ? "text-white" : "text-[#71767b] hover:text-[#d6d9db]"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {tab === "claude" && <Cpu className="h-3.5 w-3.5" />}
                          {tab === "image" && <ImageIcon className="h-3.5 w-3.5" />}
                          {tab === "analysis" && <Search className="h-3.5 w-3.5" />}
                          {tab === "original" && <FileText className="h-3.5 w-3.5" />}
                          {tab === "claude" && "Claude Prompt"}
                          {tab === "image" && "Visual Prompt"}
                          {tab === "analysis" && "Deep Analysis"}
                          {tab === "original" && "Original Tweet"}
                        </span>
                        {modalTab === tab && (
                          <span className="absolute bottom-0 left-0 right-0 h-[4px] rounded-full bg-purple-500" />
                        )}
                      </button>
                    ))}
                  </div>
                  <a
                    href={modalPost.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#71767b] hover:text-white p-2 rounded-full hover:bg-white/[0.06] transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto min-h-0 flex-1 p-6">
                  {modalTab === "claude" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Claude Pro Master Writing Prompt</h3>
                          <p className="text-xs text-muted-foreground">Pre-loaded with reverse-engineered hook, formula, and writing constraints</p>
                        </div>
                        <Button
                          onClick={() => copyToClipboard(effectiveClaudePrompt, "modal-claude")}
                          className="rounded-xl h-9 bg-purple-600 hover:bg-purple-700 gap-1.5 text-xs text-white"
                        >
                          {copiedKey === "modal-claude" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === "modal-claude" ? "Copied!" : "Copy Prompt"}
                        </Button>
                      </div>

                      <div className="rounded-xl bg-black/60 border border-white/[0.08] p-4">
                        <pre className="text-xs font-mono text-purple-200/90 whitespace-pre-wrap leading-relaxed">
                          {effectiveClaudePrompt}
                        </pre>
                      </div>
                    </div>
                  )}

                  {modalTab === "image" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Branded Infographic Prompt</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Archetype:</span>
                            {(() => {
                              const b = getArchetypeBadge(modalPost.visualArchetype || modalPost.infographicStyle || "");
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${b.className}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                                  <span>{b.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <Button
                          onClick={() => copyToClipboard(modalPost.chatgptImagePrompt || modalPost.generatedImagePrompt, "modal-img")}
                          className="rounded-xl h-9 bg-cyan-600 hover:bg-cyan-700 gap-1.5 text-xs text-white"
                        >
                          {copiedKey === "modal-img" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === "modal-img" ? "Copied!" : "Copy Visual Prompt"}
                        </Button>
                      </div>

                      <div className="rounded-xl bg-black/60 border border-white/[0.08] p-4">
                        <pre className="text-xs font-mono text-cyan-200/90 whitespace-pre-wrap leading-relaxed">
                          {modalPost.chatgptImagePrompt || modalPost.generatedImagePrompt || "No specific image prompt required for this post."}
                        </pre>
                      </div>
                    </div>
                  )}

                  {modalTab === "analysis" && (
                    <div>
                      <MarkdownContent content={modalPost.analysis} />
                    </div>
                  )}

                  {modalTab === "original" && (
                    <div className="space-y-4">
                      {renderTweetHeader(modalPost)}
                      <p className="text-[17px] leading-[24px] text-[#e7e9ea] whitespace-pre-wrap break-words pl-[52px]">
                        {modalPost.text}
                      </p>
                      {originalMedia.length > 0 && (
                        <div className="pl-[52px]">
                          {renderMediaGrid(originalMedia, modalPost.mediaType)}
                        </div>
                      )}
                      <div className="pl-[52px] text-xs text-muted-foreground">
                        Posted {formatDate(modalPost.datePosted)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
