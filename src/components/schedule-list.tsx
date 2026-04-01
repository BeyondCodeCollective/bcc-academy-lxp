"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Video, Check, ChevronDown, ChevronRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { Session } from "@/lib/types";

const WEEKS: { week: number; topic: string; icon: string }[] = [
  { week: 1, topic: "IT Fundamentals", icon: "💻" },
  { week: 2, topic: "Devices & OS", icon: "🖥️" },
  { week: 3, topic: "Networking", icon: "🌐" },
  { week: 4, topic: "Cybersecurity", icon: "🔒" },
  { week: 5, topic: "Software & Data", icon: "🗄️" },
  { week: 6, topic: "Cloud & Support", icon: "☁️" },
  { week: 7, topic: "Cert Review", icon: "🏆" },
];

export function ScheduleList({
  sessionsByWeek,
  currentWeek,
}: {
  sessionsByWeek: Record<number, Session[]>;
  currentWeek: number;
  totalWeeks: number;
}) {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const scrolledRef = useRef(false);

  // Default: expand current week + the week from URL
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    initial.add(currentWeek);
    if (weekParam) initial.add(Number(weekParam));
    return initial;
  });

  // Scroll to the target week from URL
  useEffect(() => {
    if (weekParam && !scrolledRef.current) {
      scrolledRef.current = true;
      // Also expand it
      setExpanded((prev) => new Set([...prev, Number(weekParam)]));
      const el = document.getElementById(`week-${weekParam}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [weekParam]);

  function toggleWeek(week: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {WEEKS.map(({ week, topic, icon }) => {
        const weekSessions = sessionsByWeek[week] || [];
        const isCurrent = week === currentWeek;
        const isCompleted = week < currentWeek;
        const isFuture = week > currentWeek;
        const isOpen = expanded.has(week);
        const completedSessions = weekSessions.filter(
          (s) => s.status === "completed"
        ).length;
        const isHighlighted = weekParam === String(week);

        return (
          <div
            key={week}
            id={`week-${week}`}
            className={`overflow-hidden rounded-xl border transition-all ${
              isHighlighted
                ? "border-neutral-400 bg-white shadow-sm"
                : isCurrent
                  ? "border-neutral-900 bg-white shadow-sm"
                  : isCompleted
                    ? "border-neutral-200 bg-white"
                    : "border-neutral-200 bg-white"
            }`}
          >
            {/* Week header — always clickable */}
            <button
              onClick={() => toggleWeek(week)}
              className="flex w-full items-center gap-4 p-4 sm:p-5 text-left cursor-pointer hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
            >
              {/* Badge */}
              <div
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-lg sm:text-xl ${
                  isCompleted
                    ? "bg-green-50"
                    : isCurrent
                      ? "bg-neutral-900"
                      : "bg-neutral-100"
                }`}
              >
                {isFuture ? (
                  <span className="grayscale opacity-40">{icon}</span>
                ) : (
                  <span>{icon}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`font-semibold text-sm sm:text-base ${
                      isFuture ? "text-neutral-400" : "text-neutral-900"
                    }`}
                  >
                    Week {week}: {topic}
                  </p>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                      This Week
                    </span>
                  )}
                  {isCompleted && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                      <Check
                        size={12}
                        className="text-white"
                        strokeWidth={3}
                      />
                    </div>
                  )}
                  {isFuture && (
                    <span className="text-[10px] font-medium text-neutral-300 uppercase tracking-wide">
                      Upcoming
                    </span>
                  )}
                </div>
                <p className={`mt-0.5 text-xs ${isFuture ? "text-neutral-300" : "text-neutral-400"}`}>
                  {weekSessions.length} sessions
                  {completedSessions > 0 &&
                    ` · ${completedSessions}/${weekSessions.length} done`}
                </p>
              </div>

              {/* Chevron */}
              <ChevronDown
                size={18}
                className={`shrink-0 text-neutral-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Sessions — expandable for all weeks */}
            {isOpen && weekSessions.length > 0 && (
              <div className="border-t border-neutral-100">
                {weekSessions.map((session, i) => {
                  const isSessionCompleted = session.status === "completed";
                  const showJoin =
                    isCurrent && session.status === "upcoming";

                  return (
                    <Link
                      key={session.id}
                      href={`/dashboard/schedule/${session.id}`}
                      className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-neutral-50 transition-colors ${
                        i > 0 ? "border-t border-neutral-50" : ""
                      }`}
                    >
                      {/* Session status */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isSessionCompleted
                            ? "bg-green-100"
                            : "border border-neutral-200 bg-white"
                        }`}
                      >
                        {isSessionCompleted ? (
                          <Check
                            size={14}
                            className="text-green-600"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-400">
                            {session.session_number}
                          </span>
                        )}
                      </div>

                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isSessionCompleted
                              ? "text-neutral-500"
                              : isFuture
                                ? "text-neutral-400"
                                : "text-neutral-900"
                          }`}
                        >
                          {session.title}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {session.session_date &&
                            formatDate(session.session_date)}
                          {session.start_time &&
                            ` · ${formatTime(session.start_time)}`}
                        </p>
                      </div>

                      {/* Action */}
                      {showJoin && session.meeting_link && session.meeting_link !== "#" && (
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(session.meeting_link!, "_blank");
                          }}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                        >
                          <Video size={13} />
                          Join
                        </span>
                      )}
                      {isSessionCompleted && (
                        <span className="shrink-0 text-[10px] font-medium text-green-600 uppercase tracking-wide">
                          Done
                        </span>
                      )}
                      {!showJoin && !isSessionCompleted && (
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-neutral-300"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
