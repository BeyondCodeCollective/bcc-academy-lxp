import "server-only";

import {
  Circle,
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CertificateData } from "./data";

// The public certificate page as a one-page PDF, for the copies filed to a
// partner's Drive folder. Same text and order as /certificate/[id]; built-in
// Helvetica so nothing is fetched at render time.

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  card: { width: 432, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 14, overflow: "hidden" },
  header: { paddingVertical: 22, paddingHorizontal: 30, alignItems: "center" },
  eyebrow: { fontSize: 8, letterSpacing: 2, color: "#ffffffb3", fontFamily: "Helvetica-Bold" },
  program: { marginTop: 6, fontSize: 18, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  seal: { position: "absolute", right: 22, bottom: -36, width: 72, height: 72, transform: "rotate(-6deg)" },
  body: { paddingTop: 40, paddingBottom: 30, paddingHorizontal: 30, alignItems: "center" },
  muted: { fontSize: 10, color: "#737373" },
  name: { marginTop: 6, fontSize: 24, color: "#171717", fontFamily: "Helvetica-Bold" },
  track: { marginTop: 6, fontSize: 15, color: "#262626", fontFamily: "Helvetica-Bold", textAlign: "center" },
  line: { marginTop: 4, fontSize: 10, color: "#737373" },
  rule: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f5f5f5", width: "100%", alignItems: "center" },
  date: { fontSize: 10, color: "#525252" },
  org: { marginTop: 14, fontSize: 8, color: "#a3a3a3" },
  verify: { marginTop: 3, fontSize: 6.5, color: "#d4d4d4", fontFamily: "Courier" },
});

function CertificateDoc({ c }: { c: CertificateData }) {
  return (
    <Document title={`${c.studentName}: ${c.trackName}`} author={c.orgName}>
      <Page size="LETTER" style={s.page}>
        <View style={s.card}>
          <View style={[s.header, { backgroundColor: c.primaryColor }]}>
            <Text style={s.eyebrow}>CERTIFICATE OF COMPLETION</Text>
            <Text style={s.program}>{c.programName}</Text>
            <Svg viewBox="0 0 120 120" style={s.seal}>
              <Circle cx="60" cy="60" r="54" fill="#ffffff" stroke={c.primaryColor} strokeWidth={7} strokeDasharray="2.4 4.1" />
              <Circle cx="60" cy="60" r="48" fill={c.primaryColor} />
              <Circle cx="60" cy="60" r="41" fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={0.75} />
              <Path
                d="M 60 40 L 63.5 50.5 L 74.5 50.5 L 65.7 57 L 69 67.5 L 60 61 L 51 67.5 L 54.3 57 L 45.5 50.5 L 56.5 50.5 Z"
                fill="#ffffff"
              />
              <Text x="60" y="84" textAnchor="middle" fill="#ffffff" style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>
                {c.completedYear}
              </Text>
            </Svg>
          </View>
          <View style={s.body}>
            <Text style={s.muted}>This certifies that</Text>
            <Text style={s.name}>{c.studentName}</Text>
            <Text style={[s.muted, { marginTop: 18 }]}>has successfully completed</Text>
            <Text style={s.track}>{c.trackName}</Text>
            {c.programLine && <Text style={s.line}>{c.programLine}</Text>}
            <View style={s.rule}>
              <Text style={s.date}>{c.completedDate}</Text>
            </View>
            <Text style={s.org}>{c.orgName}</Text>
            <Text style={s.verify}>Verify at bccacademy.io/certificate/{c.id}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(c: CertificateData): Promise<Buffer> {
  return renderToBuffer(<CertificateDoc c={c} />);
}

/** "Travis Kemp - Foundations of AI & Digital Skills (da90f975).pdf". The id
 *  fragment keeps two learners with one name apart and lets a sweep tell
 *  which certificates are already filed. */
export function certificateFileName(c: CertificateData): string {
  const clean = (t: string) => t.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${clean(c.studentName)} - ${clean(c.trackName)} (${c.id.slice(0, 8)}).pdf`;
}
