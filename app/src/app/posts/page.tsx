"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Eye,
  Quote,
  Bookmark,
  Search,
  Sparkles,
  Star,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Download,
  FileText,
  ImageIcon,
  ChevronDown,
  MessageSquare,
  Play,
  Images,
  Share,
  Check,
  BarChart3,
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

type SortOption = "views" | "likes" | "retweets" | "datePosted" | "dateAdded" | "starred";

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
  const [sortBy, setSortBy] = useState<SortOption>("likes");
  const [modalPost, setModalPost] = useState<Post | null>(null);
  const [modalTab, setModalTab] = useState<"original" | "analysis" | "generated">("generated");
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [copied, setCopied] = useState(false);

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
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "starred") {
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return b.likes - a.likes;
      }
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "likes") return b.likes - a.likes;
      if (sortBy === "retweets") return b.retweets - a.retweets;
      if (sortBy === "datePosted") return (b.datePosted || "").localeCompare(a.datePosted || "");
      if (sortBy === "dateAdded") return (b.dateAdded || "").localeCompare(a.dateAdded || "");
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

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getImageUrl = (post: Post) => {
    if (!post.generatedImageUrl) return null;
    const url = post.generatedImageUrl;
    if (url.startsWith("http")) return url;
    const filename = url.split("/").pop();
    if (!filename) return null;
    return `/api/proxy-image?url=data/generated-images/${filename}`;
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

  const renderTweetHeader = (post: Post, size: "sm" | "lg" = "sm") => {
    const info = getCreatorInfo(post.creator);
    const avatarSize = size === "lg" ? "w-10 h-10" : "w-10 h-10";
    const nameSize = size === "lg" ? "text-[15px]" : "text-[15px]";

    return (
      <div className="flex gap-3">
        {info.profilePic ? (
          <img
            src={proxyUrl(info.profilePic)}
            alt={post.creator}
            className={`${avatarSize} rounded-full object-cover shrink-0`}
          />
        ) : (
          <div className={`${avatarSize} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold shrink-0`}>
            {post.creator[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`${nameSize} font-bold text-white truncate`}>{info.displayName}</span>
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
        </button>
        <button className="group flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors">
          <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
            <Share className="h-[18px] w-[18px]" />
          </div>
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
          <img src={proxyUrl(urls[0])} alt="Post media" className="w-full" />
        </div>
      );
    }

    if (urls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-[#2f3336]">
          {urls.map((url, i) => (
            <img key={i} src={proxyUrl(url)} alt={`Media ${i + 1}`} className="w-full h-full object-cover aspect-[4/5]" />
          ))}
        </div>
      );
    }

    if (urls.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-[#2f3336]">
          <img src={proxyUrl(urls[0])} alt="Media 1" className="w-full h-full object-cover row-span-2" />
          <img src={proxyUrl(urls[1])} alt="Media 2" className="w-full h-full object-cover aspect-square" />
          <img src={proxyUrl(urls[2])} alt="Media 3" className="w-full h-full object-cover aspect-square" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl overflow-hidden border border-[#2f3336]">
        {urls.slice(0, 4).map((url, i) => (
          <img key={i} src={proxyUrl(url)} alt={`Media ${i + 1}`} className="w-full h-full object-cover aspect-square" />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse analyzed X posts with AI-generated content
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

        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px] rounded-xl glass border-white/[0.08] h-10">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="likes">Most Likes</SelectItem>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="retweets">Most Retweets</SelectItem>
            <SelectItem value="datePosted">Date Posted</SelectItem>
            <SelectItem value="dateAdded">Date Added</SelectItem>
            <SelectItem value="starred">Starred First</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
          {filtered.length} posts
        </Badge>
      </div>

      {/* Post cards */}
      <div className="space-y-4">
        {filtered.map((post) => {
          const genImageUrl = getImageUrl(post);
          const originalMedia = getOriginalMediaUrls(post);
          const hasOriginalMedia = originalMedia.length > 0 && post.mediaType !== "none";

          return (
            <div key={post.id} className="rounded-2xl border border-[#2f3336] bg-black/40 overflow-hidden transition-all duration-200 hover:bg-[#080808]/60">
              {/* Top bar with star + actions */}
              <div className="flex items-center justify-between px-4 pt-3 pb-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setModalPost(post); setModalTab("original"); }}
                    className="text-[13px] text-[#71767b] hover:text-[#1d9bf0] transition-colors flex items-center gap-1.5 hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Original
                  </button>
                  <button
                    onClick={() => { setModalPost(post); setModalTab("analysis"); }}
                    className="text-[13px] text-[#71767b] hover:text-[#7856ff] transition-colors flex items-center gap-1.5 hover:underline"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Analysis
                  </button>
                  <button
                    onClick={() => { setModalPost(post); setModalTab("generated"); }}
                    className="text-[13px] text-[#71767b] hover:text-[#00ba7c] transition-colors flex items-center gap-1.5 hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generated
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {post.generatedPostText && (
                    <button
                      onClick={() => copyText(post.generatedPostText)}
                      className="text-[#71767b] hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/[0.06]"
                      title="Copy generated text"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-[#00ba7c]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#71767b] hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/[0.06]"
                    title="View on X"
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

              {/* Two-column tweet layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* LEFT: Original tweet */}
                <div className="p-4 lg:border-r border-[#2f3336]">
                  <div className="mb-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#1d9bf0]/70">Original</span>
                  </div>
                  {/* Tweet */}
                  <div>
                    {renderTweetHeader(post)}
                    <div className="pl-[52px] -mt-1">
                      <p className="text-[15px] leading-[20px] text-[#e7e9ea] whitespace-pre-wrap break-words">
                        {post.text}
                      </p>
                      {hasOriginalMedia && (
                        <div className="mt-3">
                          {renderMediaGrid(originalMedia, post.mediaType)}
                        </div>
                      )}
                      {renderTweetActions(post)}
                    </div>
                  </div>
                </div>

                {/* RIGHT: AI Generated tweet */}
                <div className="p-4 border-t lg:border-t-0 border-[#2f3336]">
                  <div className="mb-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#00ba7c]/70">AI Generated</span>
                  </div>
                  {post.generatedPostText ? (
                    <div>
                      {/* Simulated tweet from @olegrows */}
                      <div className="flex gap-3">
                        <img src="/profile-picture.png" alt="Oleg" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[15px] font-bold text-white">Oleg</span>
                            <span className="text-[15px] text-[#71767b]">@olegrows</span>
                            <span className="text-[#71767b]">·</span>
                            <span className="text-[15px] text-[#71767b]">Draft</span>
                          </div>
                        </div>
                      </div>
                      <div className="pl-[52px] -mt-1">
                        <p className="text-[15px] leading-[20px] text-[#e7e9ea] whitespace-pre-wrap break-words">
                          {post.generatedPostText}
                        </p>
                        {genImageUrl && (
                          <div className="mt-3">
                            <div className="rounded-2xl overflow-hidden border border-[#2f3336]">
                              <img
                                src={genImageUrl}
                                alt="Generated infographic"
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                        {post.infographicStyle && (
                          <div className="mt-2">
                            <span className="text-[12px] text-[#71767b] bg-[#1d1f23] px-2 py-0.5 rounded-full border border-[#2f3336]">
                              {post.infographicStyle}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-[#71767b]">
                      <Sparkles className="h-8 w-8 mb-3 opacity-30" />
                      <p className="text-[13px]">Not yet generated</p>
                      <p className="text-[12px] mt-1 opacity-60">Run the pipeline to generate content</p>
                    </div>
                  )}
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
          <h3 className="mt-5 text-xl font-bold text-white">No posts yet</h3>
          <p className="mt-2 text-[15px] text-[#71767b] max-w-sm mx-auto">
            Run the pipeline to scrape viral posts, analyze them with AI, and generate ready-to-publish content.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!modalPost} onOpenChange={(open) => { if (!open) { setModalPost(null); setShowImagePrompt(false); } }}>
        <DialogContent className="!flex !flex-col max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#2f3336] bg-black/95 backdrop-blur-2xl p-0 gap-0">
          <DialogTitle className="sr-only">
            {modalTab === "original" ? "Original Post" : modalTab === "analysis" ? "Post Analysis" : "Generated Content"}
          </DialogTitle>
          {modalPost && (() => {
            const info = getCreatorInfo(modalPost.creator);
            return (
              <>
                {/* Modal header */}
                <div className="shrink-0 border-b border-[#2f3336]">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-3">
                      {(["original", "analysis", "generated"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setModalTab(tab)}
                          className={`relative px-3 pb-3 pt-1 text-[13px] font-bold transition-colors ${
                            modalTab === tab
                              ? "text-white"
                              : "text-[#71767b] hover:text-[#d6d9db]"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {tab === "original" && <FileText className="h-3.5 w-3.5" />}
                            {tab === "analysis" && <Search className="h-3.5 w-3.5" />}
                            {tab === "generated" && <Sparkles className="h-3.5 w-3.5" />}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </span>
                          {modalTab === tab && (
                            <span className={`absolute bottom-0 left-0 right-0 h-[4px] rounded-full ${
                              tab === "original" ? "bg-[#1d9bf0]" : tab === "analysis" ? "bg-[#7856ff]" : "bg-[#00ba7c]"
                            }`} />
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
                </div>

                {/* Modal body */}
                <div className="overflow-y-auto min-h-0 flex-1">
                  {modalTab === "original" && (
                    <div className="p-4">
                      {/* Full tweet layout */}
                      <div className="flex gap-3">
                        {info.profilePic ? (
                          <img src={proxyUrl(info.profilePic)} alt={modalPost.creator} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                            {modalPost.creator[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[15px] font-bold text-white">{info.displayName}</span>
                            {info.isVerified && <VerifiedBadge />}
                          </div>
                          <span className="text-[15px] text-[#71767b]">@{modalPost.creator}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-[17px] leading-[24px] text-[#e7e9ea] whitespace-pre-wrap break-words">
                          {modalPost.text}
                        </p>

                        {/* Media */}
                        {(() => {
                          const urls = getOriginalMediaUrls(modalPost);
                          if (urls.length === 0 || modalPost.mediaType === "none") return null;
                          return (
                            <div className="mt-3">
                              {renderMediaGrid(urls, modalPost.mediaType)}
                            </div>
                          );
                        })()}

                        {/* Timestamp */}
                        <div className="mt-4 text-[15px] text-[#71767b]">
                          {formatDate(modalPost.datePosted)}
                        </div>

                        {/* Engagement stats */}
                        <div className="mt-3 pt-3 border-t border-[#2f3336] flex flex-wrap gap-4">
                          {modalPost.retweets > 0 && (
                            <div><span className="text-[14px] font-bold text-white">{formatCount(modalPost.retweets)}</span><span className="text-[14px] text-[#71767b] ml-1">Reposts</span></div>
                          )}
                          {modalPost.quotes > 0 && (
                            <div><span className="text-[14px] font-bold text-white">{formatCount(modalPost.quotes)}</span><span className="text-[14px] text-[#71767b] ml-1">Quotes</span></div>
                          )}
                          {modalPost.likes > 0 && (
                            <div><span className="text-[14px] font-bold text-white">{formatCount(modalPost.likes)}</span><span className="text-[14px] text-[#71767b] ml-1">Likes</span></div>
                          )}
                          {modalPost.bookmarks > 0 && (
                            <div><span className="text-[14px] font-bold text-white">{formatCount(modalPost.bookmarks)}</span><span className="text-[14px] text-[#71767b] ml-1">Bookmarks</span></div>
                          )}
                          {modalPost.views > 0 && (
                            <div><span className="text-[14px] font-bold text-white">{formatCount(modalPost.views)}</span><span className="text-[14px] text-[#71767b] ml-1">Views</span></div>
                          )}
                        </div>

                        {/* Action bar */}
                        <div className="mt-1 pt-3 border-t border-[#2f3336]">
                          <div className="flex items-center justify-around">
                            <button className="text-[#71767b] hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                              <MessageCircle className="h-5 w-5" />
                            </button>
                            <button className="text-[#71767b] hover:text-[#00ba7c] p-2 rounded-full hover:bg-[#00ba7c]/10 transition-colors">
                              <Repeat2 className="h-5 w-5" />
                            </button>
                            <button className="text-[#71767b] hover:text-[#f91880] p-2 rounded-full hover:bg-[#f91880]/10 transition-colors">
                              <Heart className="h-5 w-5" />
                            </button>
                            <button className="text-[#71767b] hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                              <BarChart3 className="h-5 w-5" />
                            </button>
                            <button className="text-[#71767b] hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                              <Bookmark className="h-5 w-5" />
                            </button>
                            <button className="text-[#71767b] hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                              <Share className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalTab === "analysis" && (
                    <div className="px-6 py-5">
                      <MarkdownContent content={modalPost.analysis} />
                    </div>
                  )}

                  {modalTab === "generated" && (
                    <div className="p-4">
                      {modalPost.generatedPostText ? (
                        <>
                          {/* Generated tweet preview */}
                          <div className="flex gap-3">
                            <img src="/profile-picture.png" alt="Oleg" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[15px] font-bold text-white">Oleg</span>
                                <span className="text-[15px] text-[#71767b]">@olegrows</span>
                                <span className="text-[#71767b]">·</span>
                                <span className="text-[15px] text-[#71767b]">Draft</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyText(modalPost.generatedPostText)}
                              className="h-8 rounded-full text-[13px] gap-1.5 text-[#71767b] hover:text-white hover:bg-white/[0.06]"
                            >
                              {copied ? <Check className="h-3.5 w-3.5 text-[#00ba7c]" /> : <Copy className="h-3.5 w-3.5" />}
                              {copied ? "Copied" : "Copy"}
                            </Button>
                          </div>

                          <div className="mt-3">
                            <p className="text-[17px] leading-[24px] text-[#e7e9ea] whitespace-pre-wrap break-words">
                              {modalPost.generatedPostText}
                            </p>

                            {/* Generated infographic */}
                            {(() => {
                              const imgUrl = getImageUrl(modalPost);
                              if (!imgUrl) return null;
                              return (
                                <div className="mt-3">
                                  <div className="rounded-2xl overflow-hidden border border-[#2f3336]">
                                    <img src={imgUrl} alt="Generated infographic" className="w-full" />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    {modalPost.infographicStyle && (
                                      <span className="text-[12px] text-[#71767b] bg-[#1d1f23] px-2.5 py-1 rounded-full border border-[#2f3336]">
                                        {modalPost.infographicStyle}
                                      </span>
                                    )}
                                    <a
                                      href={imgUrl}
                                      download={`infographic-${modalPost.id}.png`}
                                      className="inline-flex items-center gap-1.5 text-[13px] text-[#1d9bf0] hover:underline"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Download
                                    </a>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Collapsible image prompt */}
                            {modalPost.generatedImagePrompt && (
                              <div className="mt-4 pt-3 border-t border-[#2f3336]">
                                <button
                                  onClick={() => setShowImagePrompt(!showImagePrompt)}
                                  className="flex items-center gap-1.5 text-[13px] text-[#71767b] hover:text-[#d6d9db] transition-colors"
                                >
                                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showImagePrompt ? "rotate-180" : ""}`} />
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  Image Prompt
                                </button>
                                {showImagePrompt && (
                                  <div className="mt-2 rounded-xl bg-[#16181c] border border-[#2f3336] p-4">
                                    <p className="text-[13px] text-[#71767b] leading-relaxed whitespace-pre-wrap">
                                      {modalPost.generatedImagePrompt}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-16">
                          <Sparkles className="mx-auto h-10 w-10 text-[#71767b]/20" />
                          <p className="mt-3 text-[15px] text-[#71767b]">No generated content</p>
                          <p className="mt-1 text-[13px] text-[#71767b]/60">Run the pipeline to generate content for this post</p>
                        </div>
                      )}
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
