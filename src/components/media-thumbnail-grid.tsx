"use client";

import { X, Loader2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isVideoType } from "@/lib/media/constraints";

export interface MediaThumbnailItem {
  id: string;
  previewUrl: string;
  filename: string;
  mimeType: string;
  uploading?: boolean;
}

interface MediaThumbnailGridProps {
  media: MediaThumbnailItem[];
  onRemove: (id: string) => void;
}

export function MediaThumbnailGrid({ media, onRemove }: MediaThumbnailGridProps) {
  if (media.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {media.map((item) => (
        <div
          key={item.id}
          className="relative group aspect-video rounded-md overflow-hidden border bg-muted"
        >
          {isVideoType(item.mimeType) ? (
            <div className="flex items-center justify-center h-full">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl}
              alt={item.filename}
              className="w-full h-full object-cover"
            />
          )}

          {/* Upload spinner overlay */}
          {item.uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Remove button */}
          {!item.uploading && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(item.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
