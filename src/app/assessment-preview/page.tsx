import { AssessmentPreviewWizard } from "./wizard";

export default function AssessmentPreviewPage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-accent/10 border-b border-accent/20 px-5 py-2.5 text-center">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest">
          Preview mode · responses are not saved
        </p>
      </div>
      <AssessmentPreviewWizard />
    </div>
  );
}
