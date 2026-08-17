// GENERATED — CompTIA Network+ N10-009 post-assessment (80 questions).
// Source: instructor PDF; options are seeded-shuffled here because the source
// key was position-biased. The `correct` indices are the ANSWER KEY: this
// module must NEVER be imported from client code. import "server-only" makes
// the build fail if anyone tries.
import "server-only";

export type ExamQuestion = {
  n: number;
  domain: string;
  prompt: string;
  options: string[];
  /** Index into options. SERVER ONLY. */
  correct: number;
};

export const NETWORK_PLUS_POST = {
  id: "network-plus-post",
  title: "CompTIA Network+ N10-009 Post-Assessment",
  description:
    "80 multiple-choice questions aligned to the N10-009 exam domains. 90 minutes, certification-exam level. Choose the BEST answer for each question.",
  minutes: 90,
  /** Tracks whose enrolled students may take this exam. */
  appliesToTracks: ["comptia-security"],
  /**
   * Learner access switch. false = the exam is off for learners (page and
   * grading actions both redirect/refuse); staff can still open it to
   * preview. Flip to true when the cohort should sit the post-assessment.
   */
  enabled: false,
  questions: [
 {
  "n": 1,
  "domain": "1.0 Networking Concepts",
  "prompt": "A network engineer needs to connect two IPv6-only networks across an IPv4-only service provider. Which technology BEST meets this requirement?",
  "options": [
   "VRRP",
   "6to4 tunneling",
   "PAT",
   "NAT64"
  ],
  "correct": 1
 },
 {
  "n": 2,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which OSI layer is primarily responsible for logical addressing and packet routing?",
  "options": [
   "Session",
   "Network",
   "Transport",
   "Data Link"
  ],
  "correct": 1
 },
 {
  "n": 3,
  "domain": "1.0 Networking Concepts",
  "prompt": "A switch receives an Ethernet frame with a destination MAC address that is not in its MAC address table. What will the switch do?",
  "options": [
   "Send it only to the default gateway",
   "Convert the frame to a broadcast",
   "Flood it out all ports in the VLAN except the receiving port",
   "Drop the frame"
  ],
  "correct": 2
 },
 {
  "n": 4,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which protocol and port combination is used by a client to securely browse a web server?",
  "options": [
   "SSH/UDP 22",
   "TLS/UDP 443",
   "HTTPS/TCP 443",
   "HTTP/TCP 80"
  ],
  "correct": 2
 },
 {
  "n": 5,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which IPv4 address is within an RFC 1918 private address range?",
  "options": [
   "172.20.15.10",
   "198.51.100.10",
   "172.40.15.10",
   "192.0.2.25"
  ],
  "correct": 0
 },
 {
  "n": 6,
  "domain": "1.0 Networking Concepts",
  "prompt": "A subnet must support 50 usable IPv4 host addresses. Which prefix provides the SMALLEST suitable subnet?",
  "options": [
   "/26",
   "/28",
   "/25",
   "/27"
  ],
  "correct": 0
 },
 {
  "n": 7,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which routing protocol is a link-state interior gateway protocol commonly used in enterprise networks?",
  "options": [
   "RIP",
   "BGP",
   "OSPF",
   "ARP"
  ],
  "correct": 2
 },
 {
  "n": 8,
  "domain": "1.0 Networking Concepts",
  "prompt": "A company wants to distribute incoming application requests among several servers. Which device or service is MOST appropriate?",
  "options": [
   "Proxy ARP",
   "Load balancer",
   "Layer 2 bridge",
   "DNS resolver"
  ],
  "correct": 1
 },
 {
  "n": 9,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which DNS record maps a hostname to an IPv6 address?",
  "options": [
   "AAAA",
   "PTR",
   "MX",
   "A"
  ],
  "correct": 0
 },
 {
  "n": 10,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which technology allows many private IPv4 hosts to share one public IPv4 address by using different transport-layer port numbers?",
  "options": [
   "VXLAN",
   "PAT",
   "Static NAT",
   "NAT64"
  ],
  "correct": 1
 },
 {
  "n": 11,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which cloud model gives a customer the MOST control over virtual machines, operating systems, and installed applications?",
  "options": [
   "SaaS",
   "DaaS",
   "IaaS",
   "PaaS"
  ],
  "correct": 2
 },
 {
  "n": 12,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which characteristic BEST describes east-west traffic in a data center?",
  "options": [
   "Traffic from users to SaaS providers only",
   "Traffic between internal systems or workloads",
   "Traffic entering from the public internet",
   "Traffic sent exclusively through a WAN edge"
  ],
  "correct": 1
 },
 {
  "n": 13,
  "domain": "1.0 Networking Concepts",
  "prompt": "What is the primary purpose of an MTU setting?",
  "options": [
   "Set the maximum number of switch MAC entries",
   "Determine the number of VLANs supported",
   "Specify the TTL of a routing update",
   "Define the maximum frame or packet size that can be transmitted without fragmentation"
  ],
  "correct": 3
 },
 {
  "n": 14,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which traffic type sends a packet from one source to the nearest member of a group of receivers?",
  "options": [
   "Anycast",
   "Unicast",
   "Multicast",
   "Broadcast"
  ],
  "correct": 0
 },
 {
  "n": 15,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which protocol dynamically maps an IPv4 address to a MAC address on a local network?",
  "options": [
   "DNS",
   "ARP",
   "SNMP",
   "NTP"
  ],
  "correct": 1
 },
 {
  "n": 16,
  "domain": "1.0 Networking Concepts",
  "prompt": "A network uses 10.10.8.0/23. Which address is in the same subnet?",
  "options": [
   "10.10.8.255",
   "10.10.6.200",
   "10.10.7.254",
   "10.10.10.1"
  ],
  "correct": 0
 },
 {
  "n": 17,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which technology creates an overlay network by encapsulating Layer 2 Ethernet frames inside UDP packets?",
  "options": [
   "STP",
   "VXLAN",
   "PPP",
   "MPLS"
  ],
  "correct": 1
 },
 {
  "n": 18,
  "domain": "1.0 Networking Concepts",
  "prompt": "Which statement BEST distinguishes TCP from UDP?",
  "options": [
   "TCP is connection-oriented and provides sequencing and acknowledgments",
   "TCP cannot perform flow control",
   "UDP provides guaranteed delivery using acknowledgments",
   "UDP requires a three-way handshake"
  ],
  "correct": 0
 },
 {
  "n": 19,
  "domain": "2.0 Network Implementation",
  "prompt": "A network administrator wants to logically separate Finance and Sales users while using the same physical switches. What should be configured?",
  "options": [
   "Jumbo frames",
   "LACP",
   "Port mirroring",
   "VLANs"
  ],
  "correct": 3
 },
 {
  "n": 20,
  "domain": "2.0 Network Implementation",
  "prompt": "Which switch port configuration is typically used between two switches that must carry traffic for multiple VLANs?",
  "options": [
   "SPAN destination",
   "Routed access port",
   "Access port",
   "Trunk port"
  ],
  "correct": 3
 },
 {
  "n": 21,
  "domain": "2.0 Network Implementation",
  "prompt": "Two physical switch links should operate as one logical connection for additional bandwidth and redundancy. Which protocol is appropriate?",
  "options": [
   "LACP",
   "VRRP",
   "LLDP",
   "RADIUS"
  ],
  "correct": 0
 },
 {
  "n": 22,
  "domain": "2.0 Network Implementation",
  "prompt": "Which spanning-tree feature allows an edge access port to transition quickly to forwarding while still protecting against accidental switch connections?",
  "options": [
   "PortFast with BPDU guard",
   "Storm control only",
   "Root guard only",
   "Loopback detection"
  ],
  "correct": 0
 },
 {
  "n": 23,
  "domain": "2.0 Network Implementation",
  "prompt": "A router must forward traffic between VLAN 10 and VLAN 20 using one physical interface connected to a Layer 2 switch. Which configuration is required?",
  "options": [
   "Router-on-a-stick with 802.1Q subinterfaces",
   "A GRE tunnel",
   "Port mirroring",
   "Static ARP on all hosts"
  ],
  "correct": 0
 },
 {
  "n": 24,
  "domain": "2.0 Network Implementation",
  "prompt": "Which first-hop redundancy protocol is an open standard?",
  "options": [
   "VRRP",
   "HSRP",
   "EIGRP",
   "GLBP"
  ],
  "correct": 0
 },
 {
  "n": 25,
  "domain": "2.0 Network Implementation",
  "prompt": "Which wireless frequency band generally offers greater range and wall penetration but more interference than 5 GHz?",
  "options": [
   "2.4 GHz",
   "6 GHz",
   "24 GHz",
   "60 GHz"
  ],
  "correct": 0
 },
 {
  "n": 26,
  "domain": "2.0 Network Implementation",
  "prompt": "A wireless deployment requires high throughput in a dense office. Which design choice is MOST appropriate?",
  "options": [
   "Place all APs on the same channel",
   "Use only 2.4 GHz channels at maximum power",
   "Use 5/6 GHz with careful channel planning and appropriately sized cells",
   "Disable band steering and roaming features"
  ],
  "correct": 2
 },
 {
  "n": 27,
  "domain": "2.0 Network Implementation",
  "prompt": "Which antenna type is BEST suited to create a focused point-to-point wireless bridge between two buildings?",
  "options": [
   "Dipole",
   "Directional",
   "Omnidirectional",
   "Internal diversity"
  ],
  "correct": 1
 },
 {
  "n": 28,
  "domain": "2.0 Network Implementation",
  "prompt": "A fiber run must cover several kilometers between buildings. Which media type is MOST appropriate?",
  "options": [
   "Multimode fiber",
   "Twinaxial copper",
   "Single-mode fiber",
   "Cat 6 UTP"
  ],
  "correct": 2
 },
 {
  "n": 29,
  "domain": "2.0 Network Implementation",
  "prompt": "A technician is installing copper Ethernet in an environment with significant electromagnetic interference. Which cable is MOST appropriate?",
  "options": [
   "STP",
   "UTP",
   "Single-mode fiber patch cord with RJ45 ends",
   "RG-6"
  ],
  "correct": 0
 },
 {
  "n": 30,
  "domain": "2.0 Network Implementation",
  "prompt": "Which technology can provide electrical power and Ethernet data to a wireless access point over the same cable?",
  "options": [
   "MPLS",
   "DSL",
   "DOCSIS",
   "PoE"
  ],
  "correct": 3
 },
 {
  "n": 31,
  "domain": "2.0 Network Implementation",
  "prompt": "A branch office requires a private WAN service in which the provider forwards traffic based on labels rather than normal IP routing at every hop. Which technology fits?",
  "options": [
   "MPLS",
   "NFC",
   "SIP",
   "Zigbee"
  ],
  "correct": 0
 },
 {
  "n": 32,
  "domain": "2.0 Network Implementation",
  "prompt": "Which dynamic routing protocol is designed primarily to exchange routes between autonomous systems on the internet?",
  "options": [
   "OSPF",
   "RIP",
   "STP",
   "BGP"
  ],
  "correct": 3
 },
 {
  "n": 33,
  "domain": "2.0 Network Implementation",
  "prompt": "A router has routes 10.0.0.0/8, 10.20.0.0/16, and 10.20.30.0/24. A packet is destined for 10.20.30.45. Which route is selected?",
  "options": [
   "10.20.0.0/16",
   "10.0.0.0/8",
   "The default route",
   "10.20.30.0/24"
  ],
  "correct": 3
 },
 {
  "n": 34,
  "domain": "2.0 Network Implementation",
  "prompt": "A company wants remote employees to securely access internal applications through an encrypted tunnel over the internet. Which solution is BEST?",
  "options": [
   "Port mirroring",
   "Remote-access VPN",
   "NAT loopback",
   "VLAN hopping"
  ],
  "correct": 1
 },
 {
  "n": 35,
  "domain": "3.0 Network Operations",
  "prompt": "A network team needs a centralized record showing switch names, management IP addresses, rack locations, and serial numbers. Which document is MOST useful?",
  "options": [
   "Heat map",
   "Packet capture",
   "Asset inventory",
   "SLA"
  ],
  "correct": 2
 },
 {
  "n": 36,
  "domain": "3.0 Network Operations",
  "prompt": "Which document should define the expected uptime and response times a service provider must meet?",
  "options": [
   "MOU",
   "Rack elevation",
   "SLA",
   "Logical diagram"
  ],
  "correct": 2
 },
 {
  "n": 37,
  "domain": "3.0 Network Operations",
  "prompt": "Before making a major firewall configuration change, what should an administrator do FIRST according to sound change-management practice?",
  "options": [
   "Disable logging",
   "Delete the existing configuration",
   "Implement during business hours without notification",
   "Document the change, risk, approvals, testing, and rollback plan"
  ],
  "correct": 3
 },
 {
  "n": 38,
  "domain": "3.0 Network Operations",
  "prompt": "Which protocol is commonly used to collect interface counters, device status, and alerts from managed network equipment?",
  "options": [
   "SNMP",
   "SFTP",
   "RDP",
   "SMB"
  ],
  "correct": 0
 },
 {
  "n": 39,
  "domain": "3.0 Network Operations",
  "prompt": "Which technology exports summarized information about network conversations, such as source/destination addresses, ports, and byte counts?",
  "options": [
   "Syslog",
   "Flow data",
   "DNSSEC",
   "NTP"
  ],
  "correct": 1
 },
 {
  "n": 40,
  "domain": "3.0 Network Operations",
  "prompt": "A monitoring system reports that interface utilization rises to 95% every weekday at 10:00 a.m. What operational activity would BEST help determine whether this is abnormal?",
  "options": [
   "Change all VLAN IDs",
   "Disable QoS",
   "Compare the measurement with an established performance baseline",
   "Immediately replace the switch"
  ],
  "correct": 2
 },
 {
  "n": 41,
  "domain": "3.0 Network Operations",
  "prompt": "Which protocol should network devices use to synchronize their clocks for accurate event correlation?",
  "options": [
   "SIP",
   "NTP",
   "TFTP",
   "ARP"
  ],
  "correct": 1
 },
 {
  "n": 42,
  "domain": "3.0 Network Operations",
  "prompt": "Which backup type copies all selected data each time it runs?",
  "options": [
   "Differential",
   "Full",
   "Incremental",
   "Snapshot-only"
  ],
  "correct": 1
 },
 {
  "n": 43,
  "domain": "3.0 Network Operations",
  "prompt": "A company needs network devices to send event messages to a central logging server. Which service is designed for this purpose?",
  "options": [
   "IMAP",
   "DHCP",
   "Syslog",
   "LDAP"
  ],
  "correct": 2
 },
 {
  "n": 44,
  "domain": "3.0 Network Operations",
  "prompt": "Which diagram BEST shows VLANs, IP subnets, routing relationships, and logical network connections rather than rack placement?",
  "options": [
   "Cable certification report",
   "Physical rack diagram",
   "Floor plan",
   "Logical network diagram"
  ],
  "correct": 3
 },
 {
  "n": 45,
  "domain": "3.0 Network Operations",
  "prompt": "A network administrator needs to identify which switch port a particular IP phone is physically connected to. Which discovery protocol can provide neighbor and port information across vendors?",
  "options": [
   "RIP",
   "BGP",
   "LLDP",
   "NAT"
  ],
  "correct": 2
 },
 {
  "n": 46,
  "domain": "3.0 Network Operations",
  "prompt": "Which disaster recovery metric defines the maximum acceptable amount of data loss measured in time?",
  "options": [
   "RPO",
   "MTTR",
   "RTO",
   "MTBF"
  ],
  "correct": 0
 },
 {
  "n": 47,
  "domain": "3.0 Network Operations",
  "prompt": "Which disaster recovery metric defines the targeted time to restore a service after an outage?",
  "options": [
   "SLA jitter",
   "RTO",
   "TTL",
   "RPO"
  ],
  "correct": 1
 },
 {
  "n": 48,
  "domain": "3.0 Network Operations",
  "prompt": "A network team wants to ensure configurations can be restored after an administrator accidentally overwrites a switch configuration. What is the BEST preventive operational practice?",
  "options": [
   "Remove NTP",
   "Regular configuration backups",
   "Use a hub",
   "Disable AAA"
  ],
  "correct": 1
 },
 {
  "n": 49,
  "domain": "3.0 Network Operations",
  "prompt": "Which approach BEST supports high availability for a critical network service?",
  "options": [
   "Use one large broadcast domain",
   "Disable monitoring",
   "Single device with no spare",
   "Redundant devices, links, and power where appropriate"
  ],
  "correct": 3
 },
 {
  "n": 50,
  "domain": "4.0 Network Security",
  "prompt": "Which security principle gives users only the permissions required to perform their assigned job duties?",
  "options": [
   "Least privilege",
   "Open authorization",
   "Nonrepudiation",
   "Implicit trust"
  ],
  "correct": 0
 },
 {
  "n": 51,
  "domain": "4.0 Network Security",
  "prompt": "An attacker connects a rogue switch and attempts to negotiate a trunk to gain access to multiple VLANs. Which switch hardening measure BEST mitigates this attack?",
  "options": [
   "Configure a default route",
   "Enable all unused ports",
   "Increase MTU",
   "Disable dynamic trunk negotiation on access ports"
  ],
  "correct": 3
 },
 {
  "n": 52,
  "domain": "4.0 Network Security",
  "prompt": "Which technology provides centralized authentication, authorization, and accounting for administrative access to network devices and encrypts the entire payload?",
  "options": [
   "ARP",
   "TFTP",
   "TACACS+",
   "LLDP"
  ],
  "correct": 2
 },
 {
  "n": 53,
  "domain": "4.0 Network Security",
  "prompt": "Which access-control solution authenticates users or devices before allowing access through a wired or wireless switch port?",
  "options": [
   "802.1Q",
   "STP",
   "802.1X",
   "LACP"
  ],
  "correct": 2
 },
 {
  "n": 54,
  "domain": "4.0 Network Security",
  "prompt": "A company wants guest wireless users isolated from internal resources. Which design is MOST appropriate?",
  "options": [
   "Place guests in a separate VLAN with restrictive firewall rules",
   "Disable encryption on internal Wi-Fi",
   "Configure all users in the native VLAN",
   "Place guests in the server VLAN"
  ],
  "correct": 0
 },
 {
  "n": 55,
  "domain": "4.0 Network Security",
  "prompt": "Which attack overwhelms a service with traffic from many compromised systems?",
  "options": [
   "VLAN pruning",
   "ARP inspection",
   "Tailgating",
   "DDoS"
  ],
  "correct": 3
 },
 {
  "n": 56,
  "domain": "4.0 Network Security",
  "prompt": "An attacker sends forged ARP replies so traffic intended for the default gateway is sent through the attacker's computer. What attack is occurring?",
  "options": [
   "MAC filtering",
   "ARP poisoning",
   "Route summarization",
   "DNSSEC validation"
  ],
  "correct": 1
 },
 {
  "n": 57,
  "domain": "4.0 Network Security",
  "prompt": "Which control BEST reduces the risk posed by unused switch ports in publicly accessible areas?",
  "options": [
   "Administratively disable unused ports",
   "Enable DHCP servers on them",
   "Configure them as trunks",
   "Increase their speed"
  ],
  "correct": 0
 },
 {
  "n": 58,
  "domain": "4.0 Network Security",
  "prompt": "Which technology creates an encrypted connection between two offices over an untrusted network?",
  "options": [
   "Site-to-site VPN",
   "Port security",
   "SPAN",
   "VLAN trunking"
  ],
  "correct": 0
 },
 {
  "n": 59,
  "domain": "4.0 Network Security",
  "prompt": "Which security architecture assumes no user, device, or network location should be trusted automatically?",
  "options": [
   "Flat-network trust",
   "Implicit allow",
   "Hub-and-spoke authentication",
   "Zero trust"
  ],
  "correct": 3
 },
 {
  "n": 60,
  "domain": "4.0 Network Security",
  "prompt": "A switch should permit only two learned MAC addresses on a user-facing port and block additional devices. Which feature should be configured?",
  "options": [
   "Port security",
   "DHCP relay",
   "LACP",
   "Port mirroring"
  ],
  "correct": 0
 },
 {
  "n": 61,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A user can ping 8.8.8.8 but cannot browse to www.example.com. Which service should be investigated FIRST?",
  "options": [
   "DHCP",
   "NTP",
   "DNS",
   "STP"
  ],
  "correct": 2
 },
 {
  "n": 62,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A workstation has an address of 169.254.45.20/16. What is the MOST likely cause?",
  "options": [
   "The workstation could not obtain an IPv4 address from DHCP",
   "The switch placed the host in a voice VLAN",
   "The default gateway used NAT64",
   "The DNS server assigned a loopback address"
  ],
  "correct": 0
 },
 {
  "n": 63,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A newly installed copper Ethernet link negotiates at 100 Mbps even though both devices support 1 Gbps. Which issue is MOST likely?",
  "options": [
   "Expired certificate",
   "Damaged or incorrectly terminated cable pairs",
   "Duplicate VLAN name",
   "Incorrect DNS suffix"
  ],
  "correct": 1
 },
 {
  "n": 64,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Users report intermittent wireless connectivity only in a break room containing several microwave ovens. What is the MOST likely cause?",
  "options": [
   "BGP route flapping",
   "2.4 GHz interference",
   "Incorrect subnet mask on the router",
   "Fiber attenuation"
  ],
  "correct": 1
 },
 {
  "n": 65,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician suspects a copper cable has an open conductor. Which tool is BEST for locating the distance to the fault?",
  "options": [
   "Protocol analyzer",
   "Spectrum analyzer",
   "TDR",
   "OTDR"
  ],
  "correct": 2
 },
 {
  "n": 66,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician needs to locate a break in a long fiber-optic cable. Which tool should be used?",
  "options": [
   "Wi-Fi analyzer",
   "Tone generator",
   "TDR",
   "OTDR"
  ],
  "correct": 3
 },
 {
  "n": 67,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A host can communicate with devices on its local subnet but cannot reach any remote subnet. Other hosts work normally. Which configuration should be checked FIRST?",
  "options": [
   "DNS MX record",
   "Default gateway",
   "Switch hostname",
   "NTP server"
  ],
  "correct": 1
 },
 {
  "n": 68,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Two hosts on the same VLAN intermittently lose connectivity, and logs show the same IPv4 address associated with different MAC addresses. What is the MOST likely problem?",
  "options": [
   "Routing loop",
   "Duplicate IP address",
   "MTU mismatch",
   "Incorrect SSID"
  ],
  "correct": 1
 },
 {
  "n": 69,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A router interface shows rapidly increasing CRC errors. Which issue is MOST likely?",
  "options": [
   "Physical-layer cabling or signal problem",
   "Incorrect DNS record",
   "Wrong NTP stratum",
   "Expired DHCP lease"
  ],
  "correct": 0
 },
 {
  "n": 70,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "After a network change, packets circulate repeatedly between two routers until TTL expires. What is the problem?",
  "options": [
   "Correct route summarization",
   "Routing loop",
   "Split horizon success",
   "Broadcast suppression"
  ],
  "correct": 1
 },
 {
  "n": 71,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A user reports that large file transfers fail, but small pings work. The path includes a VPN tunnel. Which issue should be investigated?",
  "options": [
   "Disabled SNMP",
   "Incorrect hostname",
   "MTU mismatch",
   "Duplicate SSID"
  ],
  "correct": 2
 },
 {
  "n": 72,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Which command is MOST useful for displaying the hop-by-hop Layer 3 path to a remote destination?",
  "options": [
   "netstat",
   "nslookup",
   "arp",
   "tracert/traceroute"
  ],
  "correct": 3
 },
 {
  "n": 73,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician needs to verify the DNS server configured on a Windows workstation along with its IP address, subnet mask, and default gateway. Which command is BEST?",
  "options": [
   "route print only",
   "ipconfig /all",
   "hostname",
   "arp -a"
  ],
  "correct": 1
 },
 {
  "n": 74,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A switch port is up, but the connected workstation cannot communicate with other devices in its department. The workstation has a correct IP configuration. The port was recently replaced. What should be checked NEXT?",
  "options": [
   "BGP autonomous system number",
   "VLAN assignment on the switch port",
   "DNS root hints",
   "NTP authentication"
  ],
  "correct": 1
 },
 {
  "n": 75,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Users on one floor experience slow network performance. Interface statistics show many late collisions on an Ethernet link. Which issue is MOST likely?",
  "options": [
   "Incorrect DNS TTL",
   "Missing PTR record",
   "Excessive optical power",
   "Duplex mismatch"
  ],
  "correct": 3
 },
 {
  "n": 76,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A wireless client sees the corporate SSID with a strong signal but repeatedly fails authentication. Other clients connect successfully. Which area should be checked FIRST on the affected client?",
  "options": [
   "AP channel width only",
   "Wireless security credentials/certificate and authentication settings",
   "Switch STP root priority",
   "Default route on the core router"
  ],
  "correct": 1
 },
 {
  "n": 77,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "After replacing a switch, users connected to it can reach local devices but not the router. The uplink carries multiple VLANs. Which misconfiguration is MOST likely?",
  "options": [
   "The router supports IPv6",
   "The switch has too much flash storage",
   "The clients use HTTPS",
   "The uplink is configured as an access port instead of a trunk"
  ],
  "correct": 3
 },
 {
  "n": 78,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A network engineer captures traffic and sees repeated TCP SYN packets from a client with no SYN-ACK replies. What does this MOST directly indicate?",
  "options": [
   "The switch has learned the destination MAC correctly",
   "DNS resolution is definitely successful",
   "The TCP connection is not being established because the destination or path is not responding",
   "The client has completed the TCP handshake"
  ],
  "correct": 2
 },
 {
  "n": 79,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "A technician follows a structured troubleshooting methodology. After identifying the problem and establishing a theory of probable cause, what should be done NEXT?",
  "options": [
   "Test the theory to determine the cause",
   "Implement every possible solution",
   "Document findings immediately and stop",
   "Escalate without testing"
  ],
  "correct": 0
 },
 {
  "n": 80,
  "domain": "5.0 Network Troubleshooting",
  "prompt": "Users complain of choppy VoIP calls whenever large backups run. Links are not failing, but delay and jitter increase sharply. Which solution is MOST appropriate?",
  "options": [
   "Replace DNS with static host files",
   "Configure QoS to prioritize latency-sensitive voice traffic",
   "Disable all VLANs",
   "Increase DHCP lease time"
  ],
  "correct": 1
 }
] as ExamQuestion[],
};
