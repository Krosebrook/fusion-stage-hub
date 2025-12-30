import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, AlertTriangle, X } from "lucide-react";

type CapabilityLevel = "native" | "workaround" | "unsupported";

interface CapabilityBadgeProps {
  level: CapabilityLevel;
  capability: string;
  description?: string;
}

const levelConfig = {
  native: {
    icon: Check,
    label: "Native",
    emoji: "🟢",
    tooltip: "Fully supported with native API integration",
  },
  workaround: {
    icon: AlertTriangle,
    label: "Workaround",
    emoji: "🟡",
    tooltip: "Available via alternative method or staged queue",
  },
  unsupported: {
    icon: X,
    label: "Unsupported",
    emoji: "🔴",
    tooltip: "Not available for this platform",
  },
};

export function CapabilityBadge({
  level,
  capability,
  description,
}: CapabilityBadgeProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Badge
          variant={level}
          className="cursor-help gap-1.5 font-normal"
        >
          <span>{config.emoji}</span>
          <span className="capitalize">{capability.replace(/_/g, " ")}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </div>
          <p className="text-xs text-muted-foreground">
            {description || config.tooltip}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
