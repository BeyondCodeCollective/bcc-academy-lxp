// GENERATED — CompTIA Security+ SY0-701 practice exam (75 questions).
// Source: Kobie Joyner instructor doc (Pages); options are seeded-shuffled here
// because the source key was position-biased (52 of 75 answers were A). The
// `correct` indices are the ANSWER KEY: this module must NEVER be imported
// from client code. import "server-only" makes the build fail if anyone tries.
import "server-only";
import type { ExamQuestion } from "./network-plus-post";

export const SECURITY_PLUS_PRACTICE = {
  id: "security-plus-practice",
  title: "CompTIA Security+ SY0-701 Practice Exam",
  description:
    "75 multiple-choice questions across the five SY0-701 domains. 90 minutes. Choose the BEST answer for each question. CompTIA uses scaled scoring, so a raw percentage here is not the same as the official 100 to 900 scale.",
  minutes: 90,
  /** Tracks whose enrolled students may take this exam. */
  appliesToTracks: ["comptia-security"],
  /** Learner access switch; see NETWORK_PLUS_POST.enabled. */
  enabled: true,
  questions: [
 {
  "n": 1,
  "domain": "1.0 General Security Concepts",
  "prompt": "A security manager requires employees to wear ID badges while in restricted office areas. Which type of security control is this?",
  "options": [
   "Detective technical control",
   "Directive physical control",
   "Preventive logical control",
   "Corrective managerial control"
  ],
  "correct": 1
 },
 {
  "n": 2,
  "domain": "1.0 General Security Concepts",
  "prompt": "A company wants to ensure that data cannot be altered without detection while it is being transferred between systems. Which security objective is MOST directly addressed?",
  "options": [
   "Availability",
   "Non-repudiation",
   "Integrity",
   "Confidentiality"
  ],
  "correct": 2
 },
 {
  "n": 3,
  "domain": "1.0 General Security Concepts",
  "prompt": "An organization is implementing a Zero Trust architecture. Which action BEST reflects the Zero Trust principle of least privilege?",
  "options": [
   "Place all trusted users on the same VLAN",
   "Grant access based on verified identity, device posture, and resource need",
   "Disable logging for authenticated users",
   "Allow all internal traffic after a user connects to the VPN"
  ],
  "correct": 1
 },
 {
  "n": 4,
  "domain": "1.0 General Security Concepts",
  "prompt": "A change to a production firewall causes a major outage. Which element of change management would have MOST directly reduced recovery time?",
  "options": [
   "A clean desk policy",
   "A nondisclosure agreement",
   "A rollback plan",
   "A data classification policy"
  ],
  "correct": 2
 },
 {
  "n": 5,
  "domain": "1.0 General Security Concepts",
  "prompt": "Which cryptographic process provides assurance that a message came from the claimed sender and was not modified?",
  "options": [
   "Symmetric encryption",
   "Tokenization",
   "Digital signature",
   "Hashing only"
  ],
  "correct": 2
 },
 {
  "n": 6,
  "domain": "1.0 General Security Concepts",
  "prompt": "A company installs bollards around the front entrance to prevent vehicles from reaching the building. Which control category is represented?",
  "options": [
   "Operational",
   "Physical",
   "Managerial",
   "Technical"
  ],
  "correct": 1
 },
 {
  "n": 7,
  "domain": "1.0 General Security Concepts",
  "prompt": "A security analyst compares the organization's current controls to a target framework and documents missing safeguards. What is the analyst performing?",
  "options": [
   "Threat hunting",
   "Gap analysis",
   "Risk transference",
   "Tokenization"
  ],
  "correct": 1
 },
 {
  "n": 8,
  "domain": "1.0 General Security Concepts",
  "prompt": "Which technology BEST supports non-repudiation for electronically signed business documents?",
  "options": [
   "Network segmentation",
   "Full-disk encryption",
   "Password hashing",
   "Digital signatures using asymmetric cryptography"
  ],
  "correct": 3
 },
 {
  "n": 9,
  "domain": "1.0 General Security Concepts",
  "prompt": "An organization cannot immediately replace an unsupported legacy application, so it isolates the application on a restricted network segment and tightly limits access. What type of control is the segmentation serving as?",
  "options": [
   "Directive",
   "Detective",
   "Deterrent",
   "Compensating"
  ],
  "correct": 3
 },
 {
  "n": 10,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A user receives an email that appears to come from the CEO and requests an urgent wire transfer. The sender address differs by one character from the real domain. Which attack is being attempted?",
  "options": [
   "Tailgating",
   "Watering-hole attack",
   "Credential stuffing",
   "Business email compromise"
  ],
  "correct": 3
 },
 {
  "n": 11,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A web application inserts untrusted user input directly into a database query. Which vulnerability is MOST likely present?",
  "options": [
   "Race condition",
   "Directory traversal",
   "SQL injection",
   "Cross-site request forgery"
  ],
  "correct": 2
 },
 {
  "n": 12,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "An attacker uses usernames and passwords leaked from one website to attempt logins on other websites. Which attack is this?",
  "options": [
   "Password spraying",
   "Pass-the-hash",
   "Brute force",
   "Credential stuffing"
  ],
  "correct": 3
 },
 {
  "n": 13,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A threat actor encrypts a company's files and demands payment for the decryption key. Which type of malware is MOST likely involved?",
  "options": [
   "Rootkit",
   "Logic bomb",
   "Spyware",
   "Ransomware"
  ],
  "correct": 3
 },
 {
  "n": 14,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A vulnerability scanner reports a critical flaw on a server, but manual testing confirms the vulnerable software is not installed. How should the result be classified?",
  "options": [
   "False positive",
   "True positive",
   "True negative",
   "False negative"
  ],
  "correct": 0
 },
 {
  "n": 15,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A public-facing server is overwhelmed by traffic originating from thousands of compromised devices. Which attack is occurring?",
  "options": [
   "Distributed denial-of-service",
   "DNS poisoning",
   "Replay attack",
   "On-path attack"
  ],
  "correct": 0
 },
 {
  "n": 16,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A developer hard-codes a cloud access key in a public source-code repository. What is the MOST immediate security risk?",
  "options": [
   "Certificate pinning failure",
   "Memory leak",
   "Integer overflow",
   "Credential exposure"
  ],
  "correct": 3
 },
 {
  "n": 17,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "An attacker places a malicious charging station in a public area to access data from connected mobile devices. Which attack vector is being used?",
  "options": [
   "Smishing",
   "Juice jacking",
   "Bluejacking",
   "Wardriving"
  ],
  "correct": 1
 },
 {
  "n": 18,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A user is tricked into entering credentials on a fraudulent login page reached through a text message. Which social-engineering technique was used?",
  "options": [
   "Smishing",
   "Vishing",
   "Shoulder surfing",
   "Pretexting"
  ],
  "correct": 0
 },
 {
  "n": 19,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A company discovers malicious code was inserted into a trusted software update distributed by a vendor. Which type of compromise is this?",
  "options": [
   "Evil twin",
   "Supply-chain attack",
   "Buffer overflow",
   "Birthday attack"
  ],
  "correct": 1
 },
 {
  "n": 20,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "Which mitigation is BEST for reducing the risk of successful password-spraying attacks?",
  "options": [
   "Disable account lockout",
   "Implement multifactor authentication",
   "Use HTTP instead of HTTPS",
   "Require longer usernames"
  ],
  "correct": 1
 },
 {
  "n": 21,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "An attacker sends a victim to a malicious website even though the victim typed the correct domain name. The local DNS cache was modified. What attack occurred?",
  "options": [
   "DNS poisoning",
   "Domain hijacking",
   "ARP inspection",
   "Session fixation"
  ],
  "correct": 0
 },
 {
  "n": 22,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A security team finds that a web server exposes files outside the intended web directory when users submit strings such as ../../. Which vulnerability is present?",
  "options": [
   "Directory traversal",
   "Request smuggling",
   "Cross-site scripting",
   "LDAP injection"
  ],
  "correct": 0
 },
 {
  "n": 23,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A newly disclosed vulnerability is being actively exploited, and no vendor patch is available. What type of vulnerability is this?",
  "options": [
   "Zero-day vulnerability",
   "False positive",
   "Misconfiguration baseline",
   "Legacy vulnerability"
  ],
  "correct": 0
 },
 {
  "n": 24,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "A malicious employee with authorized database access exports customer records for personal gain. Which threat actor characteristic BEST applies?",
  "options": [
   "Script kiddie",
   "Hacktivist",
   "Nation-state actor",
   "Insider threat"
  ],
  "correct": 3
 },
 {
  "n": 25,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "Which action BEST mitigates the risk of cross-site scripting in a web application?",
  "options": [
   "Use a flat network",
   "Increase password length",
   "Disable database logging",
   "Validate and encode untrusted input and output"
  ],
  "correct": 3
 },
 {
  "n": 26,
  "domain": "2.0 Threats, Vulnerabilities, and Mitigations",
  "prompt": "An attacker captures a valid authentication exchange and retransmits it later to impersonate the user. Which attack is this?",
  "options": [
   "Downgrade attack",
   "Privilege escalation",
   "Collision attack",
   "Replay attack"
  ],
  "correct": 3
 },
 {
  "n": 27,
  "domain": "3.0 Security Architecture",
  "prompt": "A company wants to protect sensitive data stored on employee laptops if the devices are stolen. Which control is BEST?",
  "options": [
   "Full-disk encryption",
   "Load balancing",
   "Network IDS",
   "DNSSEC"
  ],
  "correct": 0
 },
 {
  "n": 28,
  "domain": "3.0 Security Architecture",
  "prompt": "An organization wants to minimize the impact of a compromised web server by preventing it from directly communicating with the internal database network. Which architecture choice BEST supports this goal?",
  "options": [
   "Network segmentation",
   "Flat network",
   "Split tunneling",
   "Shared administrator accounts"
  ],
  "correct": 0
 },
 {
  "n": 29,
  "domain": "3.0 Security Architecture",
  "prompt": "A cloud administrator needs to ensure data remains encrypted while being transferred between a browser and a web application. Which protocol should be used?",
  "options": [
   "TFTP",
   "Telnet",
   "TLS",
   "SNMPv1"
  ],
  "correct": 2
 },
 {
  "n": 30,
  "domain": "3.0 Security Architecture",
  "prompt": "Which recovery site provides preinstalled hardware and connectivity but may require restoration of applications and data before operations can resume?",
  "options": [
   "Warm site",
   "Mobile site",
   "Cold site",
   "Hot site"
  ],
  "correct": 0
 },
 {
  "n": 31,
  "domain": "3.0 Security Architecture",
  "prompt": "A business requires a system to be restored within four hours after an outage. Which metric expresses this requirement?",
  "options": [
   "MTBF",
   "ALE",
   "RPO",
   "RTO"
  ],
  "correct": 3
 },
 {
  "n": 32,
  "domain": "3.0 Security Architecture",
  "prompt": "A company can tolerate losing no more than 30 minutes of transaction data after a disruption. Which metric describes this requirement?",
  "options": [
   "MTTR",
   "RPO",
   "RTO",
   "ARO"
  ],
  "correct": 1
 },
 {
  "n": 33,
  "domain": "3.0 Security Architecture",
  "prompt": "Which cloud service model gives customers control over deployed applications and data while the provider manages the operating system, runtime, and underlying infrastructure?",
  "options": [
   "SaaS",
   "IaaS",
   "On-premises",
   "PaaS"
  ],
  "correct": 3
 },
 {
  "n": 34,
  "domain": "3.0 Security Architecture",
  "prompt": "A security architect recommends placing externally accessible servers in a separate screened subnet. What is the PRIMARY purpose of this design?",
  "options": [
   "Improve wireless coverage",
   "Eliminate the need for access controls",
   "Reduce direct exposure of the internal network",
   "Increase password complexity"
  ],
  "correct": 2
 },
 {
  "n": 35,
  "domain": "3.0 Security Architecture",
  "prompt": "Which technology is BEST for protecting a single sensitive database field while allowing an application to use a substitute value?",
  "options": [
   "Port mirroring",
   "RAID",
   "Tokenization",
   "Load balancing"
  ],
  "correct": 2
 },
 {
  "n": 36,
  "domain": "3.0 Security Architecture",
  "prompt": "A highly available application is deployed across multiple geographically separate data centers. Which security design principle is MOST directly supported?",
  "options": [
   "Confidentiality through hashing",
   "Availability through redundancy",
   "Non-repudiation through logging",
   "Integrity through tokenization"
  ],
  "correct": 1
 },
 {
  "n": 37,
  "domain": "3.0 Security Architecture",
  "prompt": "An organization wants branch-office users to access cloud applications directly rather than routing all traffic through headquarters, while still applying consistent security controls. Which architecture is MOST appropriate?",
  "options": [
   "Cold site",
   "Air gap",
   "VLAN hopping",
   "SASE"
  ],
  "correct": 3
 },
 {
  "n": 38,
  "domain": "3.0 Security Architecture",
  "prompt": "Which approach BEST protects cryptographic keys used by a server that performs high-value digital signing operations?",
  "options": [
   "Place the keys in a public code repository",
   "Save the keys in a shared spreadsheet",
   "Email the keys to administrators",
   "Store the keys in a hardware security module"
  ],
  "correct": 3
 },
 {
  "n": 39,
  "domain": "3.0 Security Architecture",
  "prompt": "A company needs a backup strategy that allows restoration even if production systems and online backups are encrypted by ransomware. Which option is BEST?",
  "options": [
   "Port security",
   "RAID 0",
   "Offline immutable backups",
   "Browser cache"
  ],
  "correct": 2
 },
 {
  "n": 40,
  "domain": "4.0 Security Operations",
  "prompt": "A SOC analyst receives an alert showing a user successfully logged in from the United States and five minutes later from another continent. Which indicator should the analyst investigate FIRST?",
  "options": [
   "Routine backup completion",
   "Successful patch installation",
   "Normal DNS resolution",
   "Impossible travel"
  ],
  "correct": 3
 },
 {
  "n": 41,
  "domain": "4.0 Security Operations",
  "prompt": "Which log source would BEST help determine whether a user authenticated successfully to a Windows domain?",
  "options": [
   "Application source-code comments",
   "HVAC logs",
   "Authentication/security logs",
   "Printer logs"
  ],
  "correct": 2
 },
 {
  "n": 42,
  "domain": "4.0 Security Operations",
  "prompt": "A vulnerability management team must prioritize remediation. Which issue should generally be addressed FIRST?",
  "options": [
   "An informational finding on an offline workstation",
   "A critical remotely exploitable flaw on an internet-facing production server",
   "A medium finding on a decommissioned server",
   "A low-severity flaw on an isolated test system"
  ],
  "correct": 1
 },
 {
  "n": 43,
  "domain": "4.0 Security Operations",
  "prompt": "A company wants to ensure that local administrator passwords are unique and automatically rotated on Windows endpoints. Which type of solution BEST meets this requirement?",
  "options": [
   "Privileged access/password management",
   "DNS filtering",
   "Data loss prevention",
   "Network load balancing"
  ],
  "correct": 0
 },
 {
  "n": 44,
  "domain": "4.0 Security Operations",
  "prompt": "An administrator is configuring wireless authentication for enterprise users with individual credentials and centralized authentication. Which configuration is MOST appropriate?",
  "options": [
   "Open Wi-Fi with a captive portal",
   "WPA3-Enterprise with 802.1X",
   "WEP with a shared key",
   "WPA2-Personal with one common password"
  ],
  "correct": 1
 },
 {
  "n": 45,
  "domain": "4.0 Security Operations",
  "prompt": "Which tool is MOST appropriate for centrally collecting and correlating logs from firewalls, servers, endpoints, and cloud services?",
  "options": [
   "HSM",
   "RAID controller",
   "SIEM",
   "KVM"
  ],
  "correct": 2
 },
 {
  "n": 46,
  "domain": "4.0 Security Operations",
  "prompt": "A security analyst detects malware communicating with a known command-and-control domain. What should be done FIRST according to standard incident response practice after the incident has been confirmed?",
  "options": [
   "Contain the affected system",
   "Reimage every device in the company",
   "Publish a lessons-learned report",
   "Destroy all evidence"
  ],
  "correct": 0
 },
 {
  "n": 47,
  "domain": "4.0 Security Operations",
  "prompt": "Which endpoint technology focuses on detecting suspicious behavior and enabling investigation and response on individual hosts?",
  "options": [
   "UPS",
   "Load balancer",
   "EDR",
   "DLP printer policy"
  ],
  "correct": 2
 },
 {
  "n": 48,
  "domain": "4.0 Security Operations",
  "prompt": "A company wants to block employees from copying sensitive customer data to unauthorized USB drives. Which control is MOST appropriate?",
  "options": [
   "Load balancing",
   "Port forwarding",
   "DLP with removable-media controls",
   "DNSSEC"
  ],
  "correct": 2
 },
 {
  "n": 49,
  "domain": "4.0 Security Operations",
  "prompt": "Which command-line utility would a security analyst MOST likely use to display active network connections and listening ports on a host?",
  "options": [
   "mkdir",
   "echo",
   "whoami",
   "netstat"
  ],
  "correct": 3
 },
 {
  "n": 50,
  "domain": "4.0 Security Operations",
  "prompt": "A user reports repeated MFA prompts they did not initiate and eventually approved one to stop the notifications. Which attack MOST likely succeeded?",
  "options": [
   "SQL injection",
   "ARP spoofing",
   "Directory traversal",
   "MFA fatigue"
  ],
  "correct": 3
 },
 {
  "n": 51,
  "domain": "4.0 Security Operations",
  "prompt": "A company uses a certificate to authenticate a web server to clients. Which mechanism allows clients to check whether the certificate has been revoked in near real time?",
  "options": [
   "NAT",
   "OCSP",
   "SFTP",
   "RAID"
  ],
  "correct": 1
 },
 {
  "n": 52,
  "domain": "4.0 Security Operations",
  "prompt": "A security engineer wants to restrict switch ports so that only approved device MAC addresses can connect. Which control should be configured?",
  "options": [
   "Reverse proxy",
   "Port security",
   "DNS sinkhole",
   "Tokenization"
  ],
  "correct": 1
 },
 {
  "n": 53,
  "domain": "4.0 Security Operations",
  "prompt": "A workstation is suspected of compromise. Which action BEST preserves volatile evidence before powering down the system?",
  "options": [
   "Defragment the drive",
   "Capture memory",
   "Reset all user passwords first",
   "Delete temporary files"
  ],
  "correct": 1
 },
 {
  "n": 54,
  "domain": "4.0 Security Operations",
  "prompt": "Which practice MOST directly reduces the attack surface of a newly deployed server?",
  "options": [
   "Share the administrator password with the team",
   "Install unused software for future needs",
   "Disable unnecessary services and ports",
   "Enable anonymous access"
  ],
  "correct": 2
 },
 {
  "n": 55,
  "domain": "4.0 Security Operations",
  "prompt": "A SOC analyst sees hundreds of failed login attempts against many accounts, with only one or two password attempts per account. Which attack pattern is MOST likely?",
  "options": [
   "Credential stuffing",
   "Session replay",
   "Password spraying",
   "Birthday attack"
  ],
  "correct": 2
 },
 {
  "n": 56,
  "domain": "4.0 Security Operations",
  "prompt": "A company wants users to access several approved cloud applications after authenticating once to a central identity provider. Which technology BEST meets this requirement?",
  "options": [
   "RAID",
   "NAC",
   "SSO",
   "NAT"
  ],
  "correct": 2
 },
 {
  "n": 57,
  "domain": "4.0 Security Operations",
  "prompt": "Which security technology can automatically isolate an endpoint that fails device-health checks before allowing normal network access?",
  "options": [
   "NAC",
   "HSM",
   "WAF",
   "CDN"
  ],
  "correct": 0
 },
 {
  "n": 58,
  "domain": "4.0 Security Operations",
  "prompt": "An analyst is investigating a phishing incident. Which email header field is MOST useful for tracing the servers that handled the message?",
  "options": [
   "Received",
   "Reply-To display name only",
   "Message body font",
   "Subject"
  ],
  "correct": 0
 },
 {
  "n": 59,
  "domain": "4.0 Security Operations",
  "prompt": "A security team wants to proactively search for signs of compromise that were not detected by existing alerts. What activity is this?",
  "options": [
   "Threat hunting",
   "Data normalization",
   "Capacity planning",
   "Load testing"
  ],
  "correct": 0
 },
 {
  "n": 60,
  "domain": "4.0 Security Operations",
  "prompt": "After eradicating malware and restoring systems, the incident response team meets to identify process improvements. Which phase is this?",
  "options": [
   "Preparation",
   "Lessons learned",
   "Detection",
   "Containment"
  ],
  "correct": 1
 },
 {
  "n": 61,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A risk assessment determines that a threat has a high likelihood but very low business impact. Which concept is being evaluated by combining these factors?",
  "options": [
   "Tokenization",
   "Risk",
   "Availability",
   "Hashing"
  ],
  "correct": 1
 },
 {
  "n": 62,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A company purchases cyber insurance to reduce the financial impact of a potential breach. Which risk response strategy is this?",
  "options": [
   "Exploit",
   "Transfer",
   "Accept",
   "Avoid"
  ],
  "correct": 1
 },
 {
  "n": 63,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "Management decides not to deploy a vulnerable application because the business benefit does not justify the exposure. Which risk response is being used?",
  "options": [
   "Acceptance",
   "Transference",
   "Mitigation",
   "Avoidance"
  ],
  "correct": 3
 },
 {
  "n": 64,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A policy states that employees must not share passwords. Which document would MOST likely describe the detailed steps for resetting a forgotten password?",
  "options": [
   "Procedure",
   "Regulation",
   "Contract",
   "Policy"
  ],
  "correct": 0
 },
 {
  "n": 65,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A company is evaluating a vendor that will process confidential customer information. Which activity should occur BEFORE signing the contract?",
  "options": [
   "Disable logging",
   "Remove the incident response plan",
   "Third-party risk assessment",
   "Destroy all vendor records"
  ],
  "correct": 2
 },
 {
  "n": 66,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "Which agreement MOST commonly defines uptime targets, response times, and service expectations between a provider and customer?",
  "options": [
   "AUP",
   "MOU",
   "SLA",
   "NDA"
  ],
  "correct": 2
 },
 {
  "n": 67,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "An employee must acknowledge rules governing acceptable use of company systems. Which document should the employee review?",
  "options": [
   "CSR",
   "AUP",
   "CRL",
   "BIA"
  ],
  "correct": 1
 },
 {
  "n": 68,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A business impact analysis identifies which processes are most critical and how outages would affect the organization. What is the PRIMARY purpose of this analysis?",
  "options": [
   "Configure VLAN trunks",
   "Select password length",
   "Support continuity and recovery planning",
   "Generate encryption keys"
  ],
  "correct": 2
 },
 {
  "n": 69,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "Which data role is typically responsible for determining how and why a specific set of data is used and protected?",
  "options": [
   "Data owner",
   "Certificate authority",
   "External auditor",
   "Data processor"
  ],
  "correct": 0
 },
 {
  "n": 70,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "An organization wants evidence that a supplier's security controls have been independently assessed. Which item would provide the BEST assurance?",
  "options": [
   "Unverified social media post",
   "Verbal promise from a salesperson",
   "Vendor marketing brochure",
   "Independent audit or assessment report"
  ],
  "correct": 3
 },
 {
  "n": 71,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A company schedules annual cybersecurity training and periodic phishing simulations. Which risk-reduction area is being addressed MOST directly?",
  "options": [
   "RAID configuration",
   "Data deduplication",
   "Network address translation",
   "Security awareness"
  ],
  "correct": 3
 },
 {
  "n": 72,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "Which privacy principle requires an organization to collect only the personal data needed for a stated purpose?",
  "options": [
   "Open permissions",
   "Full replication",
   "Data minimization",
   "Maximum retention"
  ],
  "correct": 2
 },
 {
  "n": 73,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A security team documents who must be contacted, decision authority, communication methods, and escalation paths during a cyber incident. Which plan is being developed?",
  "options": [
   "Secure coding standard",
   "Incident response plan",
   "Password history policy",
   "Acceptable use policy"
  ],
  "correct": 1
 },
 {
  "n": 74,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "A company calculates that a single incident would cost $50,000 and is expected to occur once every five years. What is the annualized loss expectancy (ALE)?",
  "options": [
   "$100,000",
   "$10,000",
   "$50,000",
   "$250,000"
  ],
  "correct": 1
 },
 {
  "n": 75,
  "domain": "5.0 Security Program Management and Oversight",
  "prompt": "During an audit, a team finds that administrators are approving their own privileged-access requests. Which governance principle is MOST directly violated?",
  "options": [
   "Data compression",
   "Availability",
   "Separation of duties",
   "Non-repudiation"
  ],
  "correct": 2
 }
] as ExamQuestion[],
};
