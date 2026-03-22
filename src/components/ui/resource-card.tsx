import { ExternalLink } from "lucide-react";
import { formatDate, CATEGORY_LABELS } from "@/lib/utils";
import type { Resource } from "@/lib/types";

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">{resource.title}</p>
          {resource.description && (
            <p className="mt-0.5 text-sm text-muted">{resource.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-sm text-muted">
            <span>{CATEGORY_LABELS[resource.category]}</span>
            <span>{formatDate(resource.created_at)}</span>
          </div>
        </div>
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-primary hover:text-primary-hover"
            aria-label={`Open ${resource.title}`}
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>
    </div>
  );
}
