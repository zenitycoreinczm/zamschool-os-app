"use client";

import { ShellNavItem } from "@/components/workspace/ShellNavItem";
import type { WorkspaceNavSection } from "@/lib/workspace-nav";
import { ws } from "@/lib/workspace-design";
import { cn } from "@/lib/utils";

type WorkspaceNavMenuProps = {
  sections: WorkspaceNavSection[];
  activePaths: Set<string>;
  onNavigate?: () => void;
  accent?: "neutral" | "teal" | "indigo";
};

export function WorkspaceNavMenu({
  sections,
  activePaths,
  onNavigate,
  accent = "neutral",
}: WorkspaceNavMenuProps) {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <div key={`${section.label}-${index}`}>
          <p className={cn("px-3 pb-2", index === 0 ? "pt-0" : "pt-1", ws.eyebrow)}>{section.label}</p>
          <div className="space-y-1">
            {section.items.map((item) => (
              <ShellNavItem
                key={item.href}
                {...item}
                active={activePaths.has(item.href)}
                onNavigate={onNavigate}
                accent={accent}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}