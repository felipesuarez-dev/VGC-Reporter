import { Swords, Sparkles, Wrench } from "lucide-react";
import type { MoveCategory } from "../../lib/types";

interface Props {
  category: MoveCategory;
  className?: string;
}

export function MoveCategoryIcon({ category, className = "h-3 w-3" }: Props) {
  switch (category) {
    case "Physical":
      return <Swords className={className} aria-hidden />;
    case "Special":
      return <Sparkles className={className} aria-hidden />;
    case "Status":
      return <Wrench className={className} aria-hidden />;
  }
}
