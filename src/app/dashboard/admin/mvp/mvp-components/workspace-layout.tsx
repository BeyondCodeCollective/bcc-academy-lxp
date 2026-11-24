import type { ReactNode } from "react";

// The workspace sections sit in a row above the content so the content gets
// the full page width instead of sharing it with a side column.
export function WorkspaceLayout({ navigation, children }: { navigation: ReactNode; children?: ReactNode }) {
  return <div className="mt-6 min-w-0">
    <div className="mb-8 min-w-0 overflow-x-auto">{navigation}</div>
    <div className="min-w-0">{children}</div>
  </div>;
}
