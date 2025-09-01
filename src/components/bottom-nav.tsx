"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Screen = "home" | "wallet" | "tournaments" | "profile";

interface NavItem {
  name: Screen;
  icon: LucideIcon;
  label: string;
}

interface BottomNavProps {
  items: NavItem[];
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

export default function BottomNav({ items, activeScreen, setActiveScreen }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveScreen(item.name)}
            className={cn(
              "group inline-flex flex-col items-center justify-center px-5 font-medium",
              activeScreen === item.name
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className="mb-1 h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
