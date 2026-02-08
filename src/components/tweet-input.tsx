"use client";

import { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowUp, ArrowDown } from "lucide-react";

interface TweetInputProps {
  value: string;
  onChange: (value: string) => void;
  index: number;
  total: number;
  showNumber: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  autoFocus?: boolean;
}

const MAX_CHARS = 280;

export function TweetInput({
  value,
  onChange,
  index,
  total,
  showNumber,
  onRemove,
  onMoveUp,
  onMoveDown,
  autoFocus,
}: TweetInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const length = value.length;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
  }, [value]);

  // Auto-focus when added
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const counterColor =
    length > MAX_CHARS
      ? "text-red-500"
      : length >= 260
        ? "text-yellow-500"
        : "text-muted-foreground";

  return (
    <div className="relative group">
      {/* Tweet number badge */}
      {showNumber && (
        <div className="flex items-center gap-1 mb-1.5">
          <Badge variant="secondary" className="text-xs">
            {index + 1}
          </Badge>
          {/* Reorder + remove controls */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onMoveUp}
                title="Move up"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
            )}
            {onMoveDown && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onMoveDown}
                title="Move down"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            )}
            {onRemove && total > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                title="Remove tweet"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          showNumber
            ? `Tweet ${index + 1}...`
            : "What's happening?"
        }
        className="resize-none min-h-[80px] pr-16"
      />

      {/* Character counter */}
      <span
        className={`absolute bottom-2 right-3 text-xs font-mono ${counterColor}`}
      >
        {length}/{MAX_CHARS}
      </span>
    </div>
  );
}
