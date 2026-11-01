import { cn } from "@/lib/utils";
import { avatarStyle } from "@/lib/blurbi";

const SIZES = {
  sm: "h-8 w-8 rounded-xl text-sm",
  md: "h-10 w-10 rounded-2xl text-lg",
  lg: "h-14 w-14 rounded-3xl text-2xl",
  xl: "h-24 w-24 rounded-[2rem] text-5xl",
};

export function BlurbiAvatar({
  emoji,
  color,
  size = "md",
  className,
}: {
  emoji: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 select-none items-center justify-center shadow-sm",
        SIZES[size],
        className,
      )}
      style={avatarStyle(color)}
      aria-hidden
    >
      {emoji}
    </div>
  );
}
