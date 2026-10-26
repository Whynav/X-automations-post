export interface ApifyTweetResult {
  id: string;
  url: string;
  text: string;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  createdAt: string;
  author: {
    userName: string;
    name: string;
    profilePicture: string;
    followers: number;
    following: number;
    statusesCount: number;
    isBlueVerified: boolean;
    description: string;
  };
  media?: Array<{
    type: "photo" | "video" | "animated_gif";
    url: string;
    videoUrl?: string;
    previewUrl?: string;
    duration?: number;
  }>;
  isRetweet: boolean;
  isReply: boolean;
  conversationId: string;
}


export interface Post {
  id: string;
  link: string;
  creator: string;
  text: string;
  mediaType: "none" | "image" | "video" | "gif" | "multi-image";
  mediaUrls: string;
  views: number;
  likes: number;
  replies: number;
  retweets: number;
  quotes: number;
  bookmarks: number;
  analysis: string;
  generatedPostText: string;
  generatedImagePrompt: string;
  generatedImageUrl: string;
  infographicStyle: string;
  datePosted: string;
  dateAdded: string;
  configName: string;
  starred: boolean;
  // ── Reddit/AEO Studio fields ──
  hookFormula: string;
  whyItWorked: string;
  visualArchetype: string;
  redditAeoAdaptation: string;
  personalizeQuestion: string;
  claudePromptPacket: string;
  chatgptImagePrompt: string;
}

export interface Creator {
  id: string;
  username: string;
  displayName: string;
  category: string;
  profilePicUrl: string;
  followers: number;
  following: number;
  totalPosts: number;
  isBlueVerified: boolean;
  bio: string;
  lastScrapedAt: string;
  studyFocus: string;
  active: boolean;
}

export interface Config {
  id: string;
  configName: string;
  creatorsCategory: string;
  analysisInstruction: string;
  newConceptsInstruction: string;
}

export interface PipelineProgress {
  phase: "scraping" | "analyzing" | "generating" | "done" | "error";
  creatorsProcessed: number;
  creatorsTotal: number;
  postsProcessed: number;
  postsTotal: number;
  activeTasks: string[];
  errors: string[];
  log: string[];
}
