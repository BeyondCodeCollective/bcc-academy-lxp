import { notFound } from "next/navigation";
import { loadCertificate } from "@/lib/certificates/data";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await loadCertificate(id);
  if (!cert) notFound();
  const {
    studentName, trackName, programLine, programName, orgName, primaryColor, completedDate, completedYear,
  } = cert;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 print:p-0 print:bg-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg print:shadow-none overflow-hidden">
        {/* Header bar — relative so the seal can sit on the seam below it */}
        <div
          className="relative px-8 py-6 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-white/70">
            Certificate of Completion
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {programName}
          </h1>

          {/* Official seal — stamped over the header/body seam */}
          <div
            className="absolute -bottom-12 right-6 h-24 w-24 -rotate-6"
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-sm">
              {/* Scalloped rosette edge */}
              <circle
                cx="60" cy="60" r="54"
                fill="#ffffff"
                stroke={primaryColor}
                strokeWidth="7"
                strokeDasharray="2.4 4.1"
                strokeLinecap="round"
              />
              {/* Solid outer ring */}
              <circle cx="60" cy="60" r="48" fill={primaryColor} />
              {/* Inner hairline ring framing the circular text */}
              <circle
                cx="60" cy="60" r="41"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.75"
              />
              <circle
                cx="60" cy="60" r="27"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.75"
              />
              {/* Circular text between the rings */}
              <path
                id="sealArc"
                d="M 60,60 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0"
                fill="none"
              />
              <text
                fill="#ffffff"
                fontSize="7.8"
                fontWeight="700"
                style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
              >
                {/* textLength pins the text to the arc's exact circumference
                    so it distributes evenly instead of overlapping itself */}
                <textPath href="#sealArc" startOffset="0" textLength="211" lengthAdjust="spacing">
                  OFFICIAL CERTIFICATE ★ VERIFIED ★
                </textPath>
              </text>
              {/* Center: star + year */}
              <path
                d="M 60 40 L 63.5 50.5 L 74.5 50.5 L 65.7 57 L 69 67.5 L 60 61 L 51 67.5 L 54.3 57 L 45.5 50.5 L 56.5 50.5 Z"
                fill="#ffffff"
              />
              <text
                x="60" y="80"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="700"
                letterSpacing="1"
                style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
              >
                {completedYear}
              </text>
            </svg>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-10 text-center space-y-6">
          <div>
            <p className="text-sm text-neutral-500">
              This certifies that
            </p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">
              {studentName}
            </p>
          </div>

          <div>
            <p className="text-sm text-neutral-500">
              has successfully completed
            </p>
            <p className="mt-2 text-xl font-semibold text-neutral-800">
              {trackName}
            </p>
            {programLine && (
              <p className="mt-1 text-sm text-neutral-500">{programLine}</p>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-600">{completedDate}</p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-neutral-400">{orgName}</p>
            <p className="mt-1 text-[10px] text-neutral-300 font-mono">
              Verify at bccacademy.io/certificate/{id}
            </p>
          </div>
        </div>

        {/* Print button (hidden in print) */}
        <div className="px-8 pb-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
