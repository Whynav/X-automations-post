"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, Play, Users, Settings2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Posts", href: "/posts", icon: MessageSquare },
  { title: "Run Pipeline", href: "/run", icon: Play },
  { title: "Creators", href: "/creators", icon: Users },
  { title: "Configs", href: "/configs", icon: Settings2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((posts: { dateAdded: string }[]) => {
        if (posts.length > 0 && posts[0].dateAdded) {
          setLastRun(posts[0].dateAdded);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Sidebar className="border-r border-white/[0.06]">
      <SidebarHeader className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 glow-sm">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">X AI</h1>
            <p className="text-[11px] text-muted-foreground">Viral Content Generator</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className="h-10 rounded-xl px-3 transition-all duration-200"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-[13px]">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {lastRun && (
        <SidebarFooter className="px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            Last pipeline: <span className="text-foreground/70">{lastRun}</span>
          </p>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
