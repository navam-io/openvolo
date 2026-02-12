/** Metadata for a single guide entry. */
export interface GuideMeta {
  slug: string;
  filename: string;
  order: number;
  title: string;
  description: string;
  /** Lucide icon name — resolved to component at render time. */
  icon: string;
}
