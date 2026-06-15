import { ComingSoon } from "@/components/coming-soon";

// TEMP: AI Tutor is discoverable (nav + search) but not live yet. The real
// chat is preserved in ./ai-tutor-chat.tsx — to restore, render <AiTutorChat />
// here (it's a default export).
export default function TutorPage() {
  return (
    <ComingSoon
      title="AI Tutor"
      message="Your AI study buddy is almost ready — soon you'll be able to ask questions about your coursework anytime."
    />
  );
}
