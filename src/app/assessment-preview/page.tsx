import { rootFontSizeFor, type TextScale } from "@/lib/accessibility/scale";
import { AssessmentPreviewWizard } from "./wizard";

// The preview opens at the middle text size. Shipped as a stylesheet rule so
// the first paint is already at size; a saved preference still wins, because
// TextScaleProvider writes that one inline.
const PREVIEW_TEXT_SCALE: TextScale = 125;

export default function AssessmentPreviewPage() {
  return (
    <div className="min-h-screen bg-paper">
      <style>{`:root{font-size:${rootFontSizeFor(PREVIEW_TEXT_SCALE)}}`}</style>
      <div className="bg-accent/10 border-b border-accent/20 px-5 py-2.5 text-center">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest">
          Preview mode · responses are not saved
        </p>
      </div>
      <AssessmentPreviewWizard defaultTextScale={PREVIEW_TEXT_SCALE} />
    </div>
  );
}
