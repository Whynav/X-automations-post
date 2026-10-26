"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Sparkles,
  Search,
  Users,
  MessageSquare,
  BookOpen,
  FileText,
  Save,
  Check,
  Loader2,
  Cpu,
} from "lucide-react";
import type { Config, Creator, Post } from "@/lib/types";

const emptyConfig = {
  configName: "",
  creatorsCategory: "",
  analysisInstruction: "",
  newConceptsInstruction: "",
};

interface KnowledgeFile {
  filename: string;
  title: string;
  content: string;
  lastModified: string;
}

export default function ConfigsPage() {
  const [activeTab, setActiveTab] = useState<"configs" | "knowledge">("configs");

  // Configs state
  const [configs, setConfigs] = useState<Config[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Config | null>(null);
  const [form, setForm] = useState(emptyConfig);

  // Knowledge base state
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [fileSavedMessage, setFileSavedMessage] = useState(false);

  const loadConfigs = () => {
    fetch("/api/configs").then((r) => r.json()).then(setConfigs);
  };

  const loadKnowledge = () => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data) => {
        if (data.files && Array.isArray(data.files)) {
          setKnowledgeFiles(data.files);
          if (data.files.length > 0 && !selectedFile) {
            setSelectedFile(data.files[0]);
            setFileContent(data.files[0].content);
          }
        }
      });
  };

  useEffect(() => {
    loadConfigs();
    loadKnowledge();
    fetch("/api/creators").then((r) => r.json()).then(setCreators);
    fetch("/api/posts").then((r) => r.json()).then(setPosts);
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyConfig);
    setDialogOpen(true);
  };

  const openEdit = (config: Config) => {
    setEditing(config);
    setForm({
      configName: config.configName,
      creatorsCategory: config.creatorsCategory,
      analysisInstruction: config.analysisInstruction,
      newConceptsInstruction: config.newConceptsInstruction,
    });
    setDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (editing) {
      await fetch("/api/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
    } else {
      await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setDialogOpen(false);
    loadConfigs();
  };

  const handleDeleteConfig = async (id: string) => {
    await fetch(`/api/configs?id=${id}`, { method: "DELETE" });
    loadConfigs();
  };

  const handleSelectKnowledgeFile = (file: KnowledgeFile) => {
    setSelectedFile(file);
    setFileContent(file.content);
    setFileSavedMessage(false);
  };

  const handleSaveKnowledgeFile = async () => {
    if (!selectedFile) return;
    setIsSavingFile(true);
    setFileSavedMessage(false);

    try {
      await fetch("/api/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.filename,
          content: fileContent,
        }),
      });

      setFileSavedMessage(true);
      setTimeout(() => setFileSavedMessage(false), 2500);
      loadKnowledge();
    } finally {
      setIsSavingFile(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts & Knowledge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View, customize, and edit the AI prompts and knowledge files that power your pipeline
          </p>
        </div>

        {activeTab === "configs" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              onClick={openNew}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 text-white text-sm font-medium px-4 py-2 h-9 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Config
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Config" : "New Config"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Config Name</Label>
                  <Input
                    value={form.configName}
                    onChange={(e) => setForm({ ...form, configName: e.target.value })}
                    placeholder="e.g. Growth Marketing or AI Tech Breakdowns"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Creators Tag / Category</Label>
                  <Input
                    value={form.creatorsCategory}
                    onChange={(e) => setForm({ ...form, creatorsCategory: e.target.value })}
                    placeholder="e.g. marketing-cro, ai-tech, or founders"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Search className="h-3 w-3 text-purple-400" />
                    Analysis Instruction (Gemini Multimodal Reverse-Engineering Prompt)
                  </Label>
                  <Textarea
                    value={form.analysisInstruction}
                    onChange={(e) => setForm({ ...form, analysisInstruction: e.target.value })}
                    placeholder="Prompt instructing Gemini how to analyze the post and visuals..."
                    rows={10}
                    className="mt-1.5 rounded-xl glass border-white/[0.08] font-mono text-xs leading-relaxed"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Generation & Prompt Packet Template (Claude Master Writing Prompt)
                  </Label>
                  <Textarea
                    value={form.newConceptsInstruction}
                    onChange={(e) => setForm({ ...form, newConceptsInstruction: e.target.value })}
                    placeholder="Prompt template for creating the Claude prompt packet..."
                    rows={10}
                    className="mt-1.5 rounded-xl glass border-white/[0.08] font-mono text-xs leading-relaxed"
                  />
                </div>
                <Button
                  onClick={handleSaveConfig}
                  className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0"
                >
                  {editing ? "Save Changes" : "Create Config"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab("configs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === "configs"
              ? "border-purple-500 text-white bg-white/[0.04]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="h-4 w-4" />
          Pipeline Prompts (Configs)
          <Badge variant="secondary" className="text-[10px] bg-white/[0.06] ml-1">
            {configs.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === "knowledge"
              ? "border-purple-500 text-white bg-white/[0.04]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          System Knowledge & Voice Rules
          <Badge variant="secondary" className="text-[10px] bg-white/[0.06] ml-1">
            {knowledgeFiles.length}
          </Badge>
        </button>
      </div>

      {/* TAB 1: Configs & Prompts */}
      {activeTab === "configs" && (
        <div className="grid gap-5">
          {configs.map((config) => {
            const creatorCount = creators.filter((c) => c.category === config.creatorsCategory).length;
            const postCount = posts.filter((p) => p.configName === config.configName).length;

            return (
              <div key={config.id} className="glass rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.04] border border-white/[0.06]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
                      <Settings2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{config.configName}</h3>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">Account Tag:</span>
                        <Badge variant="secondary" className="rounded-md text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {config.creatorsCategory}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
                          <Users className="h-3 w-3" />
                          {creatorCount} creator{creatorCount !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
                          <MessageSquare className="h-3 w-3" />
                          {postCount} post{postCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(config)}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfig(config.id)}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-black/40 border border-white/[0.04] p-4 space-y-2">
                    <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="h-3 w-3" />
                      Analysis Instruction (Gemini)
                    </p>
                    <p className="text-xs font-mono text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {config.analysisInstruction}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/[0.04] p-4 space-y-2">
                    <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Prompt Packet Instruction (Claude)
                    </p>
                    <p className="text-xs font-mono text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {config.newConceptsInstruction}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {configs.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <Settings2 className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-4 font-semibold">No configs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Knowledge Base & Voice Rules */}
      {activeTab === "knowledge" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* File List */}
          <div className="md:col-span-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Context & Rules Files
            </h3>
            <div className="space-y-1">
              {knowledgeFiles.map((file) => {
                const isSelected = selectedFile?.filename === file.filename;
                return (
                  <button
                    key={file.filename}
                    onClick={() => handleSelectKnowledgeFile(file)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-purple-500/10 border-purple-500/30 text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={`h-4 w-4 ${isSelected ? "text-purple-400" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium truncate">{file.title}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground/60 pl-6">
                      <span>{file.filename}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor */}
          <div className="md:col-span-8 space-y-3">
            {selectedFile ? (
              <div className="glass rounded-2xl p-5 border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{selectedFile.title}</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      context/{selectedFile.filename}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {fileSavedMessage && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Saved!
                      </span>
                    )}
                    <Button
                      onClick={handleSaveKnowledgeFile}
                      disabled={isSavingFile}
                      size="sm"
                      className="rounded-xl h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                    >
                      {isSavingFile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save File
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  rows={20}
                  className="rounded-xl glass border-white/[0.08] font-mono text-xs leading-relaxed bg-black/40 p-4"
                  placeholder="File content..."
                />

                <p className="text-[11px] text-muted-foreground/60">
                  Changes saved here immediately update the ground-truth rules used by your AI prompts.
                </p>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
                Select a file to view and edit its rules
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
