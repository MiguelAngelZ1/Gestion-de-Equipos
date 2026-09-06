export type ProbeType = 'ARP' | 'ICMP' | 'TCP_CONNECT' | 'NETBIOS' | 'DNS_PTR';

export type TcpStatus = 'ACCEPTED' | 'REFUSED_RST' | 'TIMEOUT' | 'HOST_UNREACHABLE' | 'ERROR';

export interface RawProbeResult {
  probeType: ProbeType;
  targetIp: string;
  targetPort?: number;
  success: boolean;
  rttMs: number | null;
  detail?: string;
  metadata?: {
    mac?: string;
    isStale?: boolean;
    tcpStatus?: TcpStatus;
    hostname?: string;
    [key: string]: any;
  };
}

export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Evidence {
  name: string;
  probeType: ProbeType;
  positive: boolean;
  confidence: EvidenceConfidence;
  rttMs: number | null;
  detail: string;
}

export interface EvidenceSet {
  targetIp: string;
  evaluatedAt: Date;
  evidences: Evidence[];
  hasL2Presence: boolean;
  hasL3Response: boolean;
  hasL4Activity: boolean;
  positiveCount: number;
  minRttMs: number | null;
  summary: string;
}

export type NetworkNodeState = 'UNKNOWN' | 'ONLINE' | 'WARNING' | 'OFFLINE' | 'MAINTENANCE';

export interface CanaryHealth {
  isHealthy: boolean;
  linkUp: boolean;
  gatewayArpOk: boolean;
  gatewayL3Ok: boolean;
  dnsOk: boolean;
  detail: string;
  checkedAt: Date;
}

export interface StateTransitionResult {
  previousState: NetworkNodeState;
  nextState: NetworkNodeState;
  consecutiveFailures: number;
  stateChanged: boolean;
  reason: string;
  eventToEmit?: {
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    details?: Record<string, any>;
  };
}
