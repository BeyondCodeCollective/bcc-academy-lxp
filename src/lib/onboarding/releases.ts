/**
 * The BCC Release of Liability and Media Release, acknowledged inside the
 * participation agreement (see AgreementConfig.requireReleases).
 *
 * Verbatim from "Beyond Code Collective Liability_MEDIA Form 2026" — the same
 * document the team collected on paper. The signature blocks are dropped: the
 * acknowledgment checkbox plus the typed name on the agreement IS the
 * signature, and the parent/guardian blocks don't apply to an 18+ cohort.
 * Capitalised passages are capitalised in the source and stay that way — they
 * are the conspicuous-notice paragraphs.
 */
export type ReleaseDocument = {
  id: "liability" | "media";
  title: string;
  /** Rendered above the body, in the same voice as the source's preamble. */
  lede: string;
  paragraphs: string[];
  /** The checkbox label. */
  confirmLabel: string;
};

const LIABILITY_RELEASE: ReleaseDocument = {
  id: "liability",
  title: "Release of Liability and Assumption of Risk",
  lede: "This is a release. Read it carefully before you acknowledge it.",
  paragraphs: [
    "Beyond Code Collective (“BCC”) offers a range of programs (in person and virtual) to provide education, community, and workforce acceleration. This includes workshops, training, camps, events, activities with corporate sponsors, networking opportunities, and any associated or incidental outings, activities, or experiences, including the use of facilities, vehicles, and equipment owned, rented, or used by BCC (collectively, the “BCC Activities”).",
    "In consideration of the opportunity to participate in BCC Activities and the intangible value gained from participating in the BCC Activities, I, the individual identified below, (the “Participant”), on behalf of myself, my heirs, and my personal representatives, voluntarily sign this Release of Liability Agreement (“Release”) and agree to all the terms and conditions set forth herein.",
    "I understand that BCC works to create a safe and secure environment for all participants engaged in the BCC Activities. However, I also understand that BCC cannot anticipate every possible hazard or risk that may occur in connection with the BCC Activities and that there are certain risks inherent in participation in the BCC Activities. I am aware and understand that the BCC Activities could be potentially dangerous and may involve the risk of personal or psychological injury, pain, suffering, disability, death, and/or property damage. I ACKNOWLEDGE THAT ANY INJURIES THAT I SUSTAIN MAY RESULT FROM OR BE COMPOUNDED BY THE ACTIONS, OMISSIONS, OR NEGLIGENCE OF THE COMPANY, INCLUDING NEGLIGENT EMERGENCY RESPONSE OR RESCUE OPERATIONS OF THE COMPANY. NOTWITHSTANDING THE RISK, I ACKNOWLEDGE THAT I AM KNOWINGLY AND VOLUNTARILY PARTICIPATING IN THE BCC ACTIVITIES WITH AN EXPRESS UNDERSTANDING OF THE DANGER INVOLVED AND HEREBY AGREE TO ACCEPT AND ASSUME ALL RISKS OF INJURY, DISABILITY, OR DEATH, WHETHER CAUSED BY THE ORDINARY NEGLIGENCE OF BCC OR OTHERWISE.",
    "I hereby expressly waive and release any and all claims, now known or hereafter known, against BCC, and its directors, manager(s), employees, agents, affiliates, successors, and assigns (collectively, “Releasees”), arising out of or attributable to the BCC Activities, whether arising out of the ordinary negligence of BCC or any Releasees or otherwise. I covenant not to make or bring any such claim against BCC or any other Releasee, and forever release and discharge BCC and all other Releasees from liability under such claims. This waiver is intended to be construed as broadly as legally permissible. This Release does not extend to claims for gross negligence, willful misconduct, or any other liabilities if applicable law does not permit to be released by agreement.",
    "I further agree to defend, indemnify, and hold harmless BCC and the Releasees against any and all losses, damages, liabilities, deficiencies, claims, actions, judgments, settlements, interest, awards, penalties, fines, costs, or expenses of whatever kind, including attorney fees and costs, arising out of or resulting from any claim of a third party related to my participation in the BCC Activities, including any claim related to my own negligence or the ordinary negligence of the Company.",
    "I understand that by signing this release, I am waiving any and all claims, of any kind arising out of or attributable to the BCC Activities, including those claims that may be unknown to me, or which I do not suspect to exist at this time. WITH THE INTENTION OF WAIVING ALL UNKNOWN AND UNSUSPECTED CLAIMS, I HEREBY EXPRESSLY WAIVE ALL RIGHTS, BENEFITS, AND PROTECTIONS I MAY HAVE UNDER CALIFORNIA CIVIL CODE SECTION 1542, WHICH READS AS FOLLOWS:",
    "A general release does not extend to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release and that, if known by him or her, would have materially affected his or her settlement with the debtor or released party.",
    "This Release constitutes the sole and entire agreement of BCC and me with respect to the subject matter contained herein and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter. If any term or provision of this Release is invalid, illegal, or unenforceable in any jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other term or provision of this Release or invalidate or render unenforceable such term or provision in any other jurisdiction. This Release is binding on and shall inure to the benefit of the Company and me and our respective heirs, successors, and assigns.",
    "I fully assume the risks involved as acceptable to me and I agree to use my best judgment in undertaking these activities and follow all safety instructions.",
    "BY ACKNOWLEDGING BELOW, I ACKNOWLEDGE THAT I HAVE READ AND FULLY UNDERSTOOD ALL OF THE TERMS OF THIS RELEASE AND THAT I AM VOLUNTARILY GIVING UP SUBSTANTIAL LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE BCC FOR CLAIMS, WHETHER KNOWN OR UNKNOWN, ARISING OUT OF THE BCC ACTIVITIES. I ACKNOWLEDGE THAT PRIOR TO SIGNING THIS AGREEMENT, I HAD THE OPPORTUNITY TO CONSULT WITH AN ATTORNEY TO REVIEW THIS AGREEMENT.",
  ],
  confirmLabel:
    "I have read and agree to the Release of Liability and Assumption of Risk Agreement.",
};

const MEDIA_RELEASE: ReleaseDocument = {
  id: "media",
  title: "Media and Publicity Release",
  lede: "How BCC may use photos, video, and your story from the program.",
  paragraphs: [
    "In order to document, communicate, and advertise Beyond Code Collective operations and success with prospective parents, staff members, participants, volunteers, contributors to the organization, current parents, staff members, contributors to the organization, and the general public, Beyond Code Collective produces public relations, educational, instructional and fundraising materials, such as, without limitation, brochures, annual reports, a website, newsletters, press releases, curricular materials, instructional video, social media and other items. Reporters from television news, newspapers, and other media and education-related institutions, both nonprofit and commercial, sometimes express interest in Beyond Code Collective and visit events and activities to take photos, film video, or interview members of the Beyond Code Collective community.",
    "In consideration for the opportunity to participate in the BCC Activities, I hereby grant to Beyond Code Collective (“BCC”) and its designees, licensees, successors, affiliated companies, and each of their assigns (herein collectively called the “Licensed Parties”), the royalty-free, transferable, irrevocable right in perpetuity, worldwide, and throughout the universe to use, retain, publish, broadcast, edit, modify, adapt, distribute, and exploit my name, biographical information, voice, dialogue, sounds, image, statements, likeness, personal characteristics and any and all attributes of my personality, in, on or in connection with any film, audio tape, video tape, audio-visual work, photograph, illustration, animation, or broadcast, and in any media, material, or embodiment, now, hereafter known, or later developed, including without limitation on https://wearebcc.org/, and in social media, and including without limitation all formats of electronic or computer readable media (collectively referred to herein as “Material”), produced by or for the benefit of the Licensed Parties, or for any other commercial, promotional, publicity, advertising, educational, research, or lawful purpose whatsoever, without limitation.",
    "I agree that any Material of me used and taken by the Licensed Parties is owned by them and that they may copyright material containing same, and that I have no right, title, interest, claim of ownership or any other rights whatsoever in or to the Material, or any other materials derived therefrom.",
    "I acknowledge and agree that BCC shall have the sole and exclusive right in perpetuity and throughout the universe to use, print, produce, publish, copy, display, perform, exhibit, transmit, broadcast, promote, reproduce, distribute, disseminate, market, advertise, sell, lease, license, transfer, edit, modify, adapt, dub, create, copyright and otherwise exploit, the Material in whole or in part, in any format, version or language, and in any and all media, whether now known or hereafter devised, including for any other commercial, promotional, educational, research, or lawful purpose whatsoever, without limitation.",
    "I agree that no Material need be submitted to me for approval. I hereby waive any right to review, inspect or approve the Material and any of its content, including any written or spoken copy as may be used in connection therewith. The Licensed Parties shall be without liability to me for any distortion or illusionary effect resulting from the publication of my picture, portrait or likeness. I hereby acknowledge that the Licensed Parties have no obligation to create or use the Material and that I am not entitled to any fees, royalties or compensation in connection with any rights granted to and exercised by the Licensed Parties, pursuant to this Release.",
    "I warrant and represent that this license does not in any way conflict with any existing commitment on my part, and that I am authorized to grant it. Nothing herein will constitute any obligation on the Licensed Parties to make any use of the rights set forth herein.",
    "I hereby expressly release, and agree to indemnify and hold harmless, the Licensed Parties from, and covenant not to sue any of the Licensed Parties for, any claim, demand, liability, or cause of action, whether known or unknown, for libel, slander, invasion of right of privacy, publicity or personality, or any other claim, demand, liability, or cause of action, based upon or relating to the exercise of any of the rights referred to in this Release. I grant such rights to BCC with the knowledge that BCC will rely thereon at substantial cost.",
    "This Release does not constitute a contract of employment nor create any type of express or implied contractual promise or obligation.",
    "I agree that this Release shall be construed and shall take effect in accordance with the law of the State of California, without giving effect to any conflict of laws rules which may result in the application of the laws of any other jurisdiction, and irrevocably consent to the exclusive jurisdiction of the federal, state, and local courts located in Alameda County, California, in connection with any action or proceeding arising out of or relating to this Release and/or any breach thereof, and/or any document or instrument delivered pursuant to this agreement. This agreement represents the entire understanding between BCC and myself, and supersedes any and all prior agreements regarding the matters covered in this agreement. No waiver, modification, or addition to this agreement shall be valid unless in writing and signed by BCC and me. In the event any provision of this agreement is determined to be invalid by a court of competent jurisdiction, such determination shall in no way affect the validity or enforceability of any other provision herein.",
    "By acknowledging below, I confirm my consent to be bound by all of the terms of this Release.",
  ],
  confirmLabel: "I have read and agree to the Media and Publicity Release.",
};

/** Both releases, in the order the source document presents them. */
export const RELEASE_DOCUMENTS: ReleaseDocument[] = [LIABILITY_RELEASE, MEDIA_RELEASE];

/** Version stamped on a signed row alongside the agreement's own version. */
export const RELEASES_VERSION = "bcc-liability-media-2026";
