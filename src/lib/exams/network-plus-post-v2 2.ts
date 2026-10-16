// GENERATED — CompTIA Network+ N10-009 post-assessment, Version 2 (80 questions).
// Source: Kobie Joyner's instructor PDF; options are seeded-shuffled here
// because the source key was position-biased (every correct answer was A). The
// `correct` indices are the ANSWER KEY: this module must NEVER be imported
// from client code. import "server-only" makes the build fail if anyone tries.
import "server-only";

import type { ExamQuestion } from "./network-plus-post";

export const NETWORK_PLUS_POST_V2 = {
  id: "network-plus-post-v2",
  title: "CompTIA Network+ N10-009 Practice Exam II",
  description:
    "80 multiple-choice questions aligned to the N10-009 exam domains. 90 minutes, certification-exam level. Choose the BEST answer for each question.",
  minutes: 90,
  /** Tracks whose enrolled students may take this exam. */
  appliesToTracks: ["exam-prep-network-study-group"],
  /** Learner access switch; false hides it from learners, staff can still preview. */
  enabled: true,
  questions: [
 {
  "n": 1,
  "domain": "1.0 Networking Concepts",
  "prompt": "A company is deploying a voice application that can tolerate an occasional lost packet but is highly sensitive to delay. Which transport protocol is MOST appropriate?",
  "options": [
   "ICMP",
   "TCP",
   "UDP",
   "SCTP"
  ],
  "correct": 2
 },
 {
  "n": 2,
  "domain": "1.0 Networking Concepts",
  "prompt": "A technician must identify the OSI layer that adds source and destination port numbers before data is passed to the network layer. Which layer performs this function?",
  "options": [
   "Network",
   "Data Link",
   "Application",
   "Transport"
  ],
  "correct": 3
 },
 {
  "n": 3,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which protocol is used by an email client to securely retrieve and synchronize messages while leaving the mailbox stored on the server?",
  "options": [
   "SMTP on TCP 25",
   "IMAPS on TCP 993",
   "SNMPv3 on UDP 161",
   "POP3 on TCP 110"
  ],
  "correct": 1
 },
 {
  "n": 4,
  "domain": "1.0 Networking Concepts",
  "prompt": "A network administrator wants clients to automatically receive an IP address, subnet mask, default gateway, and DNS server. Which service provides this information?",
  "options": [
   "LDAP",
   "NTP",
   "DHCP",
   "DNS"
  ],
  "correct": 2
 },
 {
  "n": 5,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which DNS record identifies the authoritative name server for a DNS zone?",
  "options": [
   "NS",
   "TXT",
   "SRV",
   "CNAME"
  ],
  "correct": 0
 },
 {
  "n": 6,
  "domain": "1.0 Networking Concepts",
  "prompt": "A server has the IPv4 address 192.168.40.130/26. Which address is the network address of its subnet?",
  "options": [
   "192.168.40.64",
   "192.168.40.192",
   "192.168.40.0",
   "192.168.40.128"
  ],
  "correct": 3
 },
 {
  "n": 7,
  "domain": "1.0 Networking Concepts",
  "prompt": "An administrator needs at least 12 usable IPv4 addresses in each new subnet. Which prefix length wastes the FEWEST addresses while meeting the requirement?",
  "options": [
   "/27",
   "/28",
   "/30",
   "/29"
  ],
  "correct": 1
 },
 {
  "n": 8,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which IPv6 address type is automatically created for local-link communication and begins with FE80::/10?",
  "options": [
   "Link-local",
   "Multicast",
   "Global unicast",
   "Unique local"
  ],
  "correct": 0
 },
 {
  "n": 9,
  "domain": "1.0 Networking Concepts",
  "prompt": "A router has learned the same destination through OSPF and a static route. Both routes use the same prefix length. Which route is normally preferred?",
  "options": [
   "The route with the highest metric",
   "OSPF because it is dynamic",
   "Static because it has a lower administrative distance",
   "Both are load balanced automatically"
  ],
  "correct": 2
 },
 {
  "n": 10,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which routing concept allows an administrator to advertise one route that represents several contiguous smaller networks?",
  "options": [
   "Route aggregation",
   "Split horizon",
   "Anycast",
   "Port forwarding"
  ],
  "correct": 0
 },
 {
  "n": 11,
  "domain": "1.0 Networking Concepts",
  "prompt": "A cloud application automatically adds or removes compute instances as demand changes. Which cloud characteristic is being demonstrated?",
  "options": [
   "Multitenancy",
   "Resource pooling",
   "Elasticity",
   "Measured service"
  ],
  "correct": 2
 },
 {
  "n": 12,
  "domain": "1.0 Networking Concepts",
  "prompt": "A company consumes a cloud-hosted CRM application entirely through a web browser and does not manage the servers or application platform. Which service model is this?",
  "options": [
   "IaaS",
   "Colocation",
   "SaaS",
   "PaaS"
  ],
  "correct": 2
 },
 {
  "n": 13,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which virtualization component creates and manages virtual machines on a physical host?",
  "options": [
   "Hypervisor",
   "Load balancer",
   "SD-WAN controller",
   "Reverse proxy"
  ],
  "correct": 0
 },
 {
  "n": 14,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which network architecture separates the control plane from the data plane and allows centralized programmable management?",
  "options": [
   "CSMA/CD",
   "FHRP",
   "SDN",
   "PPP"
  ],
  "correct": 2
 },
 {
  "n": 15,
  "domain": "1.0 Networking Concepts",
  "prompt": "A network engineer wants an encapsulation protocol that can carry multicast routing traffic between two routers across an IP network but does not provide encryption by itself. Which protocol is MOST appropriate?",
  "options": [
   "HTTPS",
   "IPsec",
   "GRE",
   "SFTP"
  ],
  "correct": 2
 },
 {
  "n": 16,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which traffic characteristic describes variation in packet arrival time and is especially important to voice and video quality?",
  "options": [
   "Attenuation",
   "Throughput",
   "Jitter",
   "MTBF"
  ],
  "correct": 2
 },
 {
  "n": 17,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which address is a valid IPv4 loopback address?",
  "options": [
   "127.10.20.30",
   "255.255.255.255",
   "224.0.0.5",
   "169.254.10.1"
  ],
  "correct": 0
 },
 {
  "n": 18,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which device primarily forwards Ethernet frames based on destination MAC addresses?",
  "options": [
   "DNS server",
   "Firewall",
   "Router",
   "Layer 2 switch"
  ],
  "correct": 3
 },
 {
  "n": 19,
  "domain": "2.0 Network Implementation",
  "prompt": "A switch port connects to a desktop computer that belongs only to VLAN 30. How should the port normally be configured?",
  "options": [
   "As an access port in VLAN 30",
   "As a routed port",
   "As a SPAN destination",
   "As a trunk with VLAN 30 native"
  ],
  "correct": 0
 },
 {
  "n": 20,
  "domain": "2.0 Network Implementation",
  "prompt": "A company needs IP phones and attached PCs to share one physical switch port while placing voice and data in separate VLANs. Which configuration is MOST appropriate?",
  "options": [
   "Configure the port as a routed interface",
   "Place both devices in the native VLAN only",
   "Disable 802.1Q tagging",
   "Configure a data access VLAN and a voice VLAN on the port"
  ],
  "correct": 3
 },
 {
  "n": 21,
  "domain": "2.0 Network Implementation",
  "prompt": "A network has redundant Layer 2 paths between switches. Which protocol prevents broadcast frames from circulating indefinitely?",
  "options": [
   "OSPF",
   "VRRP",
   "BGP",
   "STP"
  ],
  "correct": 3
 },
 {
  "n": 22,
  "domain": "2.0 Network Implementation",
  "prompt": "An engineer wants to ensure a specific distribution switch becomes the spanning-tree root bridge. Which setting should be adjusted?",
  "options": [
   "Bridge priority",
   "DNS TTL",
   "Interface MTU",
   "DHCP lease duration"
  ],
  "correct": 0
 },
 {
  "n": 23,
  "domain": "2.0 Network Implementation",
  "prompt": "Which wireless standard operates in the 6 GHz band and is associated with Wi-Fi 6E?",
  "options": [
   "802.11n",
   "802.11g",
   "802.11ac",
   "802.11ax"
  ],
  "correct": 3
 },
 {
  "n": 24,
  "domain": "2.0 Network Implementation",
  "prompt": "A wireless engineer is deploying 2.4 GHz Wi-Fi in North America. Which three 20-MHz channels are traditionally selected to minimize overlap?",
  "options": [
   "3, 8, and 13",
   "2, 7, and 12",
   "1, 6, and 11",
   "1, 5, and 9"
  ],
  "correct": 2
 },
 {
  "n": 25,
  "domain": "2.0 Network Implementation",
  "prompt": "A warehouse requires wireless connectivity over a broad open area from a centrally located access point. Which antenna pattern is MOST appropriate?",
  "options": [
   "Point-to-point panel only",
   "Highly directional Yagi",
   "Omnidirectional",
   "Parabolic dish"
  ],
  "correct": 2
 },
 {
  "n": 26,
  "domain": "2.0 Network Implementation",
  "prompt": "Which copper cabling category is rated for 10GBASE-T up to 100 meters and is designed for improved alien-crosstalk performance?",
  "options": [
   "Cat 3",
   "Cat 5e",
   "Cat 6a",
   "Cat 6"
  ],
  "correct": 2
 },
 {
  "n": 27,
  "domain": "2.0 Network Implementation",
  "prompt": "Which fiber type is commonly used for shorter high-speed links inside data centers and typically uses a larger core than single-mode fiber?",
  "options": [
   "Multimode fiber",
   "Single-mode fiber",
   "RG-6",
   "Twinax telephone cable"
  ],
  "correct": 0
 },
 {
  "n": 28,
  "domain": "2.0 Network Implementation",
  "prompt": "An administrator needs to connect a switch to a server at 10 Gbps over a very short distance within the same rack at low cost. Which medium is commonly used?",
  "options": [
   "RG-59 coaxial cable",
   "Cat 3 UTP",
   "Single-mode fiber across a WAN",
   "Direct-attach copper"
  ],
  "correct": 3
 },
 {
  "n": 29,
  "domain": "2.0 Network Implementation",
  "prompt": "Which WAN technology uses broadband cellular networks such as 4G LTE or 5G to provide connectivity?",
  "options": [
   "DOCSIS only",
   "MPLS label switching only",
   "Cellular WAN",
   "Metro Ethernet only"
  ],
  "correct": 2
 },
 {
  "n": 30,
  "domain": "2.0 Network Implementation",
  "prompt": "A branch router has no specific route for a destination. Which route is used if one is configured?",
  "options": [
   "Default route",
   "Discard route automatically",
   "Connected route only",
   "Host route with a different destination"
  ],
  "correct": 0
 },
 {
  "n": 31,
  "domain": "2.0 Network Implementation",
  "prompt": "Which configuration allows a router to forward DHCP client broadcasts from one subnet to a DHCP server located on another subnet?",
  "options": [
   "DNS recursion",
   "DHCP relay",
   "Port security",
   "BPDU guard"
  ],
  "correct": 1
 },
 {
  "n": 32,
  "domain": "2.0 Network Implementation",
  "prompt": "A network administrator needs to prioritize VoIP packets over bulk file-transfer traffic on a congested WAN interface. Which feature should be configured?",
  "options": [
   "NAT64",
   "DNSSEC",
   "Port mirroring",
   "QoS"
  ],
  "correct": 3
 },
 {
  "n": 33,
  "domain": "2.0 Network Implementation",
  "prompt": "Which high-availability design provides two independent power sources to critical network equipment?",
  "options": [
   "Dual power supplies connected to separate power circuits",
   "A single UPS with no bypass",
   "One internet circuit with a larger subnet",
   "One switch stack cable"
  ],
  "correct": 0
 },
 {
  "n": 34,
  "domain": "2.0 Network Implementation",
  "prompt": "A company wants two geographically separated data centers to provide continuous service if one site becomes unavailable. Which concept BEST describes this design goal?",
  "options": [
   "Port aggregation",
   "Address translation",
   "Broadcast containment",
   "Site redundancy"
  ],
  "correct": 3
 },
 {
  "n": 35,
  "domain": "3.0 Network Operations",
  "prompt": "A technician needs a diagram showing switch locations, patch panels, cable paths, and physical device connections. Which document should be consulted?",
  "options": [
   "SLA",
   "Logical network diagram",
   "Physical network diagram",
   "Acceptable use policy"
  ],
  "correct": 2
 },
 {
  "n": 36,
  "domain": "3.0 Network Operations",
  "prompt": "Which document identifies where equipment is installed within a rack by rack-unit position?",
  "options": [
   "IP address management table",
   "Packet capture",
   "Logical topology",
   "Rack diagram/elevation"
  ],
  "correct": 3
 },
 {
  "n": 37,
  "domain": "3.0 Network Operations",
  "prompt": "A network team wants a controlled repository that records current device configurations and allows administrators to compare them with prior versions. Which practice BEST supports this goal?",
  "options": [
   "Disabling logging",
   "Using unmanaged switches",
   "Increasing DHCP scope size",
   "Configuration management and version control"
  ],
  "correct": 3
 },
 {
  "n": 38,
  "domain": "3.0 Network Operations",
  "prompt": "Which change-management element describes the exact steps to return a system to its previous state if a change fails?",
  "options": [
   "Baseline",
   "Escalation matrix",
   "SLA",
   "Rollback plan"
  ],
  "correct": 3
 },
 {
  "n": 39,
  "domain": "3.0 Network Operations",
  "prompt": "A monitoring platform must receive immediate asynchronous notifications from a switch when a critical interface goes down. Which mechanism is MOST appropriate?",
  "options": [
   "DHCP reservation",
   "DNS zone transfer",
   "SNMP trap/inform",
   "Periodic ping only"
  ],
  "correct": 2
 },
 {
  "n": 40,
  "domain": "3.0 Network Operations",
  "prompt": "Which SNMP version provides authentication and encryption for management traffic?",
  "options": [
   "SNMPv3",
   "RMON1",
   "SNMPv2c",
   "SNMPv1"
  ],
  "correct": 0
 },
 {
  "n": 41,
  "domain": "3.0 Network Operations",
  "prompt": "An engineer wants to inspect the full headers and payloads of packets traversing a link during troubleshooting. Which data source is MOST appropriate?",
  "options": [
   "Asset inventory",
   "Flow record",
   "Rack elevation",
   "Packet capture"
  ],
  "correct": 3
 },
 {
  "n": 42,
  "domain": "3.0 Network Operations",
  "prompt": "Which metric represents the average time a repairable device operates before it fails?",
  "options": [
   "RPO",
   "MTTR",
   "RTO",
   "MTBF"
  ],
  "correct": 3
 },
 {
  "n": 43,
  "domain": "3.0 Network Operations",
  "prompt": "Which metric measures the average amount of time required to repair and restore a failed component?",
  "options": [
   "TTL",
   "MTTR",
   "MTBF",
   "RPO"
  ],
  "correct": 1
 },
 {
  "n": 44,
  "domain": "3.0 Network Operations",
  "prompt": "A business requires a secondary facility with hardware installed and data replicated so operations can resume rapidly after a disaster. Which recovery site is MOST appropriate?",
  "options": [
   "Archive-only site",
   "Hot site",
   "Cold site",
   "Empty colocation cage"
  ],
  "correct": 1
 },
 {
  "n": 45,
  "domain": "3.0 Network Operations",
  "prompt": "Which recovery site generally has facilities and utilities available but requires equipment installation and data restoration before use?",
  "options": [
   "Load-balanced cluster",
   "Cold site",
   "Active-active site",
   "Hot site"
  ],
  "correct": 1
 },
 {
  "n": 46,
  "domain": "3.0 Network Operations",
  "prompt": "A company wants to test disaster recovery procedures without interrupting the production environment. Which activity is MOST appropriate?",
  "options": [
   "Change all production IP addresses",
   "Tabletop or simulated recovery exercise",
   "Delete production backups",
   "Disable monitoring during business hours"
  ],
  "correct": 1
 },
 {
  "n": 47,
  "domain": "3.0 Network Operations",
  "prompt": "Which policy defines how long network logs and configuration backups must be preserved?",
  "options": [
   "Wireless channel plan",
   "Password complexity policy",
   "BYOD enrollment policy",
   "Data retention policy"
  ],
  "correct": 3
 },
 {
  "n": 48,
  "domain": "3.0 Network Operations",
  "prompt": "A network engineer wants to reserve a specific IPv4 address for a printer while continuing to manage the address centrally through DHCP. Which feature should be used?",
  "options": [
   "Static NAT",
   "APIPA",
   "DHCP reservation",
   "DNS round robin"
  ],
  "correct": 2
 },
 {
  "n": 49,
  "domain": "3.0 Network Operations",
  "prompt": "Which IP address management practice BEST reduces accidental duplicate static addresses across a large organization?",
  "options": [
   "Use one spreadsheet copy per technician with no synchronization",
   "Maintain a centralized IPAM system documenting allocations",
   "Disable DHCP logging",
   "Allow each technician to select addresses independently"
  ],
  "correct": 1
 },
 {
  "n": 50,
  "domain": "4.0 Network Security",
  "prompt": "A network administrator must authenticate VPN users against a centralized directory and apply authorization policies. Which protocol is commonly used between the VPN appliance and AAA server?",
  "options": [
   "TFTP",
   "ARP",
   "NTP",
   "RADIUS"
  ],
  "correct": 3
 },
 {
  "n": 51,
  "domain": "4.0 Network Security",
  "prompt": "Which multifactor authentication combination uses two different factor categories?",
  "options": [
   "Fingerprint and facial recognition",
   "Smart card and password",
   "Password and PIN",
   "Security question and password"
  ],
  "correct": 1
 },
 {
  "n": 52,
  "domain": "4.0 Network Security",
  "prompt": "A company divides servers, user devices, IoT devices, and guest systems into separate security zones. What security principle is being applied?",
  "options": [
   "Route poisoning",
   "Open federation",
   "Network segmentation",
   "Implicit trust"
  ],
  "correct": 2
 },
 {
  "n": 53,
  "domain": "4.0 Network Security",
  "prompt": "Which device is designed to inspect and allow or deny traffic according to security policy between network zones?",
  "options": [
   "Firewall",
   "Patch panel",
   "Repeater",
   "Media converter"
  ],
  "correct": 0
 },
 {
  "n": 54,
  "domain": "4.0 Network Security",
  "prompt": "A security team wants to detect suspicious network traffic and generate alerts without automatically blocking the traffic. Which technology BEST fits?",
  "options": [
   "NAT gateway",
   "IDS",
   "DHCP relay",
   "IPS in inline blocking mode"
  ],
  "correct": 1
 },
 {
  "n": 55,
  "domain": "4.0 Network Security",
  "prompt": "Which attack attempts to exhaust a switch's MAC address table so the switch begins flooding traffic?",
  "options": [
   "MAC flooding",
   "Evil twin",
   "DNS tunneling",
   "Password spraying"
  ],
  "correct": 0
 },
 {
  "n": 56,
  "domain": "4.0 Network Security",
  "prompt": "An attacker sets up a wireless access point using the same SSID as the corporate network to trick employees into connecting. Which attack is this?",
  "options": [
   "ARP inspection",
   "VLAN pruning",
   "Route summarization",
   "Evil twin"
  ],
  "correct": 3
 },
 {
  "n": 57,
  "domain": "4.0 Network Security",
  "prompt": "Which switch security feature can block unauthorized DHCP server messages on untrusted ports?",
  "options": [
   "DHCP snooping",
   "Port mirroring",
   "Jumbo frames",
   "LACP"
  ],
  "correct": 0
 },
 {
  "n": 58,
  "domain": "4.0 Network Security",
  "prompt": "Which switch feature can use the DHCP snooping binding table to help prevent forged ARP messages?",
  "options": [
   "LLDP",
   "Rapid STP",
   "Dynamic ARP Inspection",
   "Link aggregation"
  ],
  "correct": 2
 },
 {
  "n": 59,
  "domain": "4.0 Network Security",
  "prompt": "A company wants administrators to connect to routers using an encrypted remote CLI instead of sending credentials in cleartext. Which protocol should replace Telnet?",
  "options": [
   "TFTP",
   "SSH",
   "FTP",
   "HTTP"
  ],
  "correct": 1
 },
 {
  "n": 60,
  "domain": "4.0 Network Security",
  "prompt": "Which physical security control is designed to prevent two people from entering a secure area using one person's authorization?",
  "options": [
   "Patch panel",
   "Mantrap/access vestibule",
   "Cable management tray",
   "KVM switch"
  ],
  "correct": 1
 },
 {
  "n": 61,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A workstation receives a valid DHCP address and can ping its default gateway, but cannot reach any internet IP address. Other users on the same VLAN have internet access. Which action should the technician perform FIRST?",
  "options": [
   "Replace the core switch",
   "Reconfigure the DNS zone",
   "Compare the workstation's routing table and gateway settings with a working host",
   "Change the wireless channel"
  ],
  "correct": 2
 },
 {
  "n": 62,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A user can reach an internal web server by hostname but receives a certificate warning stating the certificate name does not match the site. Which issue is MOST likely?",
  "options": [
   "The switch has a duplex mismatch",
   "The certificate subject/SAN does not match the hostname",
   "The user's DHCP lease is too short",
   "The DNS server is unreachable"
  ],
  "correct": 1
 },
 {
  "n": 63,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A new switch uplink shows one side configured for 1 Gbps full duplex while the other side is forced to 100 Mbps full duplex. What symptom is MOST likely?",
  "options": [
   "DHCP will assign APIPA addresses to all VLANs",
   "The switch will become the STP root automatically",
   "The link may fail or operate incorrectly because speed settings do not match",
   "DNS lookups will return NXDOMAIN"
  ],
  "correct": 2
 },
 {
  "n": 64,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A cable tester reports pairs 1-2 and 3-6 are reversed at one end of a newly terminated copper cable. What type of problem is indicated?",
  "options": [
   "Incorrect pinout/termination",
   "DNS cache poisoning",
   "Excessive optical attenuation",
   "Routing asymmetry"
  ],
  "correct": 0
 },
 {
  "n": 65,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Users connected through a long copper run experience errors, and testing shows the cable length is 125 meters. What is the MOST likely cause?",
  "options": [
   "The router lacks an IPv6 link-local address",
   "The DNS TTL is too low",
   "The Ethernet channel exceeds the supported copper distance",
   "The VLAN ID is reserved"
  ],
  "correct": 2
 },
 {
  "n": 66,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A fiber link has low receive power after a maintenance window. Inspection shows dust on the connector end face. What should the technician do?",
  "options": [
   "Clean and properly reseat the fiber connectors",
   "Change the DHCP scope",
   "Increase the VLAN priority",
   "Disable spanning tree"
  ],
  "correct": 0
 },
 {
  "n": 67,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A wireless laptop has excellent signal strength but low throughput. A spectrum analyzer shows heavy non-Wi-Fi energy across the channel. What is the BEST next action?",
  "options": [
   "Change the subnet mask",
   "Increase the DHCP lease time",
   "Replace the DNS server",
   "Move the WLAN to a cleaner channel or band"
  ],
  "correct": 3
 },
 {
  "n": 68,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Users moving between access points lose voice calls for several seconds during each transition. Which wireless issue should be investigated?",
  "options": [
   "Roaming/handoff configuration",
   "NAT overload",
   "DNS zone transfer",
   "Fiber polarity"
  ],
  "correct": 0
 },
 {
  "n": 69,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "An access point was installed behind a metal wall, and users on the other side have weak signal. Which issue BEST explains the problem?",
  "options": [
   "Signal attenuation caused by the building material",
   "A duplicate default route",
   "Incorrect DNS MX record",
   "A routing loop"
  ],
  "correct": 0
 },
 {
  "n": 70,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A server can communicate with hosts in 10.20.0.0/16 but cannot reach 10.30.0.0/16. The router has no route to 10.30.0.0/16. What should be corrected?",
  "options": [
   "Cable pinout",
   "Routing information",
   "Wireless encryption",
   "DNS recursion"
  ],
  "correct": 1
 },
 {
  "n": 71,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A router learns two equal-cost routes to the same destination and traffic takes both paths. What behavior is occurring?",
  "options": [
   "STP convergence",
   "Equal-cost multipath load balancing",
   "Route poisoning",
   "NAT exhaustion"
  ],
  "correct": 1
 },
 {
  "n": 72,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A firewall change causes an application to fail. Packet captures show the client SYN reaches the server, the server SYN-ACK returns to the firewall, but the client never receives it. Which issue is MOST likely?",
  "options": [
   "The DNS server is authoritative",
   "The client has no MAC address",
   "A firewall rule is blocking the return traffic",
   "The switch is using PoE"
  ],
  "correct": 2
 },
 {
  "n": 73,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A NAT gateway has no available translation entries during peak usage, preventing new outbound connections. What condition is occurring?",
  "options": [
   "Split horizon",
   "STP root election",
   "NAT/PAT resource exhaustion",
   "Route aggregation"
  ],
  "correct": 2
 },
 {
  "n": 74,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician wants to determine whether a remote TCP service on port 443 is accepting connections from a client network. Which tool or command is MOST useful?",
  "options": [
   "ipconfig /release",
   "A TCP connection test such as Test-NetConnection or nc",
   "arp -a only",
   "A cable toner"
  ],
  "correct": 1
 },
 {
  "n": 75,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Which command is BEST for querying a DNS server for a hostname and reviewing the returned records?",
  "options": [
   "nslookup or dig",
   "arp -d",
   "route delete",
   "ping -t only"
  ],
  "correct": 0
 },
 {
  "n": 76,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A Linux administrator wants to display the system's current IP routes. Which command is MOST appropriate?",
  "options": [
   "pwd",
   "grep /etc/passwd",
   "chmod",
   "ip route"
  ],
  "correct": 3
 },
 {
  "n": 77,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician needs to identify which switch port corresponds to an unlabeled wall jack. Which tools should be used?",
  "options": [
   "OTDR and light meter",
   "Spectrum analyzer and antenna",
   "Tone generator and probe",
   "Loopback plug and Wi-Fi analyzer"
  ],
  "correct": 2
 },
 {
  "n": 78,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A network interface is suspected of failing. Which tool can be inserted into the port to verify that the interface can transmit and receive locally?",
  "options": [
   "Cable stripper",
   "Punchdown tool",
   "Loopback plug",
   "Crimper"
  ],
  "correct": 2
 },
 {
  "n": 79,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A network outage is restored after replacing a failed transceiver. According to standard troubleshooting methodology, what should the technician do NEXT?",
  "options": [
   "Immediately close the ticket without testing",
   "Erase all logs",
   "Change unrelated configurations",
   "Verify full functionality and implement preventive measures if appropriate"
  ],
  "correct": 3
 },
 {
  "n": 80,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician has verified a solution and confirmed users can access the service again. What is the FINAL troubleshooting step?",
  "options": [
   "Document findings, actions, outcomes, and lessons learned",
   "Escalate the incident automatically",
   "Create a new theory of probable cause",
   "Remove monitoring from the affected system"
  ],
  "correct": 0
 }
] as ExamQuestion[],
};
