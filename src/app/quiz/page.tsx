import QuizClient from "./QuizClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Career Quiz — BCC Academy",
  description:
    "Discover your tech career path. A quick personality quiz to point you to a pathway that fits.",
};

export default async function QuizPage() {
  return (
    // bg-black on the *inner* wrapper. .marketing-scope sets its own
    // background: #FFFDF7 in globals.css, so putting bg-black on the
    // same element loses on source order and the off-white bleeds
    // through every AnimatePresence transition (screen↔screen AND
    // question↔question). Nesting separates the two concerns:
    // marketing-scope still provides typography, and the inner div owns
    // the always-black backdrop the quiz crossfades against.
    <div className="marketing-scope">
      <div className="bg-black min-h-[100dvh]">
        <QuizClient />
      </div>
    </div>
  );
}
