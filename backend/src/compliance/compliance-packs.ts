export interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CompliancePack {
  id: string;
  title: string;
  description: string;
  version: string;
  controls: ComplianceControl[];
}

export const COMPLIANCE_PACKS: CompliancePack[] = [
  {
    id: 'owasp-api-top10',
    title: 'OWASP API Top 10',
    description: 'Application security controls for API risk classes.',
    version: '2026.1',
    controls: [
      {
        id: 'api1-bola',
        title: 'Broken object level authorization',
        description: 'Verify object-level authorization on every read/write path.',
        priority: 'high',
      },
      {
        id: 'api2-auth',
        title: 'Broken authentication',
        description: 'Enforce robust token validation and session management.',
        priority: 'high',
      },
      {
        id: 'api4-rate-limits',
        title: 'Unrestricted resource consumption',
        description: 'Apply quotas, cooldowns, and request rate limits.',
        priority: 'high',
      },
      {
        id: 'api8-misconfig',
        title: 'Security misconfiguration',
        description: 'Harden defaults, headers, and secret handling.',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'terraform-guardrails',
    title: 'Terraform/HCL Guardrails',
    description: 'Infrastructure-as-code controls for secure cloud provisioning.',
    version: '2026.1',
    controls: [
      {
        id: 'tf-state',
        title: 'State security',
        description: 'Encrypt and lock remote state, limit state access.',
        priority: 'high',
      },
      {
        id: 'tf-network',
        title: 'Network exposure',
        description: 'Avoid broad CIDR ingress and unmanaged egress.',
        priority: 'high',
      },
      {
        id: 'tf-iam',
        title: 'Least-privilege IAM',
        description: 'Prevent wildcard privileges and privilege escalation paths.',
        priority: 'high',
      },
      {
        id: 'tf-drift',
        title: 'Drift management',
        description: 'Detect and reconcile drift in CI and runtime.',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'soc2-change-control',
    title: 'SOC 2 Change Control',
    description: 'Operational controls for reviewability and change quality.',
    version: '2026.1',
    controls: [
      {
        id: 'cc-review',
        title: 'Peer review policy',
        description: 'Ensure documented review criteria and approval records.',
        priority: 'high',
      },
      {
        id: 'cc-testing',
        title: 'Change validation',
        description: 'Require tests and evidence before production release.',
        priority: 'high',
      },
      {
        id: 'cc-rollback',
        title: 'Rollback readiness',
        description: 'Define rollback plan and ownership for critical changes.',
        priority: 'medium',
      },
    ],
  },
];
