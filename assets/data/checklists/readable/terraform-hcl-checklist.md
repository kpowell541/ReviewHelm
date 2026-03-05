# Terraform (HCL) — Code Review Checklist

🏗️ Review checklist for Terraform infrastructure repositories written in HCL
Total items: 195  |  Version: 1.0.0

---

## General Review Quality

1. [MIN] Does the PR clearly state the infrastructure intent, blast radius, and rollback plan?  `general` `terraform`
2. [MIN] Is the change scoped to a coherent unit of infra work and not mixing unrelated concerns?  `general` `terraform`
3. [MIN] Are environment targets explicitly called out (dev/stage/prod/regions/accounts)?  `general` `environments`
4. [MIN] Is there a plan artifact attached for each target environment?  `plan` `ci-cd`
5. [MIN] Are any manual console steps removed or justified if unavoidable?  `operations` `documentation`
6. [MIN] Are destructive actions called out explicitly in review notes?  `risk` `operations`
7. [NIT] Are TODO/FIXME comments tied to tracked work items?  `code-quality` `documentation`
8. [MIN] Are commits organized so infra intent is easy to review incrementally?  `general` `git`

## Terraform Fundamentals & Repo Structure

9. [MIN] Is the Terraform version pinned with `required_version`?  `terraform` `versions`
10. [MIN] Is the repository structure consistent (root modules, reusable modules, env overlays)?  `terraform` `structure`
11. [MIN] Are root modules minimal and orchestration-focused rather than logic-heavy?  `modules` `structure`
12. [MIN] Are module boundaries clear and aligned to ownership domains?  `modules` `ownership`
13. [MIN] Is HCL formatted (`terraform fmt`) with no noisy formatting drift?  `hcl` `linting`
14. [MIN] Does static validation pass (`terraform validate`) for changed modules?  `validation` `hcl`
15. [MIN] Are files named predictably (`providers.tf`, `versions.tf`, `variables.tf`, `outputs.tf`)?  `naming` `structure`
16. [NIT] Are logical concerns grouped to reduce merge conflict hotspots?  `structure` `collaboration`
17. [MIN] Is generated content excluded or clearly separated from authored code?  `code-quality` `structure`
18. [MIN] Are module READMEs present and updated for interface changes?  `documentation` `modules`
19. [MIN] Are examples provided for reusable modules where behavior is non-obvious?  `documentation` `modules`
20. [MIN] Are module sources stable and intentional (registry, git ref, local path)?  `modules` `supply-chain`
21. [MAJ] Are external module refs pinned to immutable versions/tags/commits (not floating)?  `modules` `versions`
22. [MIN] Is there a clear separation between shared foundations and app-specific infra?  `structure` `environments`
23. [MIN] Are deprecated resources/modules removed instead of left orphaned?  `maintenance` `structure`
24. [NIT] Are comments focused on intent/tradeoffs rather than restating code?  `documentation` `code-quality`

## Providers & Versioning

25. [BLK] Are all providers declared under `required_providers` with source and version constraints?  `providers` `versions`
26. [MIN] Are provider version constraints narrow enough for reproducibility but wide enough for patch updates?  `providers` `versions`
27. [MIN] Is provider aliasing used correctly for multi-account/multi-region patterns?  `providers` `multi-account`
28. [MAJ] Are aliased providers explicitly passed into child modules where required?  `providers` `modules`
29. [MIN] Are provider credentials sourced securely (env vars/workload identity), not hardcoded?  `security` `providers`
30. [MAJ] Are default provider regions/accounts explicit to avoid accidental deployment drift?  `providers` `risk`
31. [MIN] Is `.terraform.lock.hcl` committed and updated intentionally?  `lockfile` `versions`
32. [MIN] Does lockfile churn match actual provider/module changes?  `lockfile` `review`
33. [MAJ] Are provider upgrades reviewed for breaking changes and state migrations?  `providers` `upgrades`
34. [MIN] Are beta/preview providers/features only used with explicit risk acknowledgment?  `providers` `risk`
35. [MIN] Are provider-level default tags/labels configured consistently where supported?  `tagging` `providers`
36. [MIN] Are parallel provider blocks avoiding conflicting default behavior?  `providers` `consistency`
37. [MIN] Are provider-specific timeouts/retries configured when defaults are known to be insufficient?  `reliability` `providers`
38. [MIN] Are provider deprecations in plan output addressed proactively?  `maintenance` `providers`

## State, Backend & Workspaces

39. [BLK] Is remote state configured (not local state for shared/team environments)?  `state` `backend`
40. [BLK] Is backend storage encrypted at rest?  `security` `state`
41. [BLK] Is backend access least-privilege and scoped to required principals only?  `security` `iam` `state`
42. [BLK] Is state locking enabled and reliable (e.g., DynamoDB, GCS locks, remote backend locking)?  `state` `concurrency`
43. [MAJ] Is backend key/path naming deterministic and environment-safe?  `state` `naming`
44. [MAJ] Are workspaces used deliberately (and not as a substitute for proper environment isolation)?  `workspaces` `environments`
45. [MAJ] Is there a strategy to prevent cross-environment state collisions?  `state` `environments`
46. [BLK] Are sensitive values prevented from landing in state where avoidable?  `security` `state` `secrets`
47. [MAJ] Is state snapshot/versioning enabled for recovery?  `state` `dr`
48. [MIN] Is state retention/lifecycle policy aligned with compliance and recovery needs?  `state` `compliance`
49. [MIN] Are backend configuration changes migration-safe and documented?  `state` `operations`
50. [MAJ] Are `terraform_remote_state` dependencies minimized and versioned to reduce coupling?  `state` `architecture`
51. [MIN] Is remote-state data consumption scoped to needed outputs only?  `state` `least-privilege`
52. [MAJ] Are apply runners prevented from concurrent applies against the same state?  `ci-cd` `concurrency` `state`
53. [MIN] Is state access audited/logged in cloud audit trails?  `security` `audit` `state`
54. [MIN] Is there a tested state recovery/runbook for corruption or accidental deletion?  `state` `operations`

## Variables, Locals & Outputs

55. [MIN] Are variable types explicitly declared for all inputs?  `variables` `types`
56. [MIN] Are variable descriptions clear and current?  `variables` `documentation`
57. [MIN] Are defaults safe and production-appropriate (or intentionally omitted)?  `variables` `risk`
58. [MAJ] Are validation blocks used for critical constraints (CIDRs, name patterns, allowed values)?  `variables` `validation`
59. [MIN] Are nullable/optional variables handled intentionally without ambiguous null behavior?  `variables` `null-safety`
60. [MIN] Are complex variable objects modeled to prevent invalid combinations?  `variables` `design`
61. [MIN] Are `locals` used to reduce duplication and centralize computed intent?  `locals` `code-quality`
62. [MIN] Are local expressions readable and not overly clever?  `locals` `readability`
63. [MAJ] Are secrets marked `sensitive = true` on variables and outputs where appropriate?  `secrets` `outputs`
64. [MAJ] Are outputs minimal, purposeful, and non-sensitive by default?  `outputs` `security`
65. [MIN] Are output names stable and consumer-friendly?  `outputs` `naming`
66. [MAJ] Do output/interface changes include compatibility notes for downstream modules/pipelines?  `outputs` `compatibility`
67. [MIN] Are environment-specific values injected externally (`*.tfvars`, pipeline vars), not hardcoded?  `environments` `variables`
68. [MIN] Are `tfvars` files excluded from VCS if they contain sensitive or ephemeral values?  `security` `git`
69. [MIN] Are list/set/map semantics chosen correctly for deterministic plans?  `types` `plan`
70. [MIN] Are stringly-typed booleans/numbers avoided?  `types` `validation`
71. [MIN] Are dynamic defaults not hiding risky behavior in prod?  `variables` `risk`
72. [MIN] Are feature flags clearly named and fail-safe?  `variables` `operations`
73. [MAJ] Are breaking variable interface changes versioned or migration-noted?  `variables` `compatibility`
74. [NIT] Are variable names concise, domain-specific, and consistent across modules?  `variables` `naming`
75. [MIN] Are computed names deterministic and compliant with provider limits?  `naming` `providers`
76. [MIN] Are regex validations understandable and tested for edge cases?  `validation` `testing`

## Module Design & Composition

77. [MIN] Is each module focused on one infra capability/domain?  `modules` `architecture`
78. [MIN] Are module inputs minimal and high-signal rather than pass-through wrappers?  `modules` `design`
79. [MIN] Are module outputs limited to true consumption needs?  `modules` `outputs`
80. [MAJ] Are modules avoiding hidden side effects across unrelated services?  `modules` `risk`
81. [MIN] Are reusable modules cloud/provider-idiomatic and not leaky abstractions?  `modules` `providers`
82. [MIN] Are module defaults safe for first-time consumers?  `modules` `safety`
83. [MIN] Are optional features toggled cleanly with clear behavior when disabled?  `modules` `design`
84. [MAJ] Is `for_each` used instead of `count` where stable identity is required?  `meta-args` `state`
85. [MIN] If `count` is used, is index churn risk understood and accepted?  `meta-args` `risk`
86. [MAJ] Are resource keys in `for_each` stable over time to avoid replacements?  `meta-args` `state`
87. [MIN] Are module-level `depends_on` used sparingly and justified?  `dependencies` `performance`
88. [MIN] Are dynamic blocks used only when they improve maintainability?  `hcl` `readability`
89. [MIN] Are data sources in modules deterministic and not introducing hidden external coupling?  `data-sources` `modules`
90. [MAJ] Are module versions incremented and changelogged for interface or behavior changes?  `modules` `versioning`
91. [MIN] Are module README inputs/outputs autogenerated or kept in sync?  `documentation` `modules`
92. [MIN] Are examples/tests covering representative module usage patterns?  `testing` `modules`
93. [MIN] Is ownership clear for each module (team/service)?  `ownership` `modules`
94. [MIN] Are module dependencies acyclic and understandable?  `architecture` `modules`
95. [MAJ] Are modules avoiding provider configuration internally unless explicitly designed for it?  `providers` `modules`
96. [MIN] Are nested module stacks not too deep for maintainability?  `architecture` `readability`
97. [MIN] Are resource names/tags within modules customizable where needed?  `modules` `tagging`
98. [MIN] Are guardrails encoded (timeouts, protections, validations) in module defaults?  `modules` `safety`
99. [MIN] Are cloud quotas/limits considered in module behavior?  `reliability` `providers`
100. [MIN] Are one-off resources kept out of shared modules when they reduce reuse clarity?  `modules` `code-quality`

## Resource Semantics, Lifecycle & Change Safety

101. [BLK] Are any planned destroys intentional, reviewed, and approved for the target env?  `plan` `risk`
102. [BLK] Are critical resources protected with `lifecycle.prevent_destroy` where appropriate?  `lifecycle` `safety`
103. [MAJ] Is `create_before_destroy` used for zero/low-downtime replacement paths where supported?  `lifecycle` `availability`
104. [MAJ] Is `ignore_changes` used narrowly and documented to avoid config drift blind spots?  `lifecycle` `drift`
105. [MAJ] Are explicit `depends_on` only used when implicit graphing is insufficient?  `dependencies` `graph`
106. [MIN] Are resources imported/moved using `import`/`moved` blocks instead of ad hoc state surgery?  `state` `migrations`
107. [MAJ] Are rename/refactor operations planned to avoid force-recreate surprises?  `migrations` `state`
108. [MAJ] Are replacement-triggering attribute changes clearly called out in review?  `plan` `risk`
109. [MIN] Are timeout blocks configured for slow-provisioning resources?  `reliability` `resources`
110. [MIN] Are eventual-consistency issues handled with robust dependency modeling?  `reliability` `graph`
111. [MAJ] Are data/resource cycles avoided (no graph deadlocks)?  `graph` `stability`
112. [MIN] Are computed values not used in ways that cause perpetual diffs?  `drift` `plan`
113. [MIN] Are `null_resource` and provisioners avoided unless truly unavoidable?  `anti-patterns` `terraform`
114. [MAJ] If provisioners are used, are they idempotent, timeout-bounded, and failure-safe?  `provisioners` `risk`
115. [MIN] Are external scripts pinned/versioned and reviewable when called from Terraform?  `supply-chain` `provisioners`
116. [MIN] Is graph fan-out manageable to avoid provider/API throttling during apply?  `performance` `reliability`
117. [MIN] Are large plans split logically to keep review and apply risk bounded?  `operations` `risk`
118. [MAJ] Are `taint`-style workflows avoided in favor of declarative, reviewable code changes?  `operations` `state`
119. [MIN] Are drift-prone resources monitored and reconciled intentionally?  `drift` `operations`
120. [MIN] Are resource names immutable/stable where replacement is costly?  `naming` `risk`
121. [MAJ] Are cross-region/cross-account dependencies explicit and resilient?  `multi-account` `reliability`
122. [MIN] Are default provider region assumptions avoided in resource blocks?  `providers` `resources`
123. [MIN] Are cloud API eventual consistency retries/backoff considered in provider settings or patterns?  `reliability` `providers`
124. [MIN] Is rollback behavior understood for partial failures in apply?  `operations` `risk`

## Security, IAM, Secrets & Network Controls

125. [BLK] Are IAM roles/policies least-privilege and scoped to explicit actions/resources?  `security` `iam`
126. [BLK] Are wildcard IAM grants (`*`) avoided unless strongly justified and documented?  `security` `iam`
127. [BLK] Are trust policies constrained (principal, conditions, audience, external ID as needed)?  `security` `iam`
128. [BLK] Are public ingress/egress paths intentional and tightly restricted?  `security` `network`
129. [BLK] Are security groups/firewall rules avoiding broad CIDRs (`0.0.0.0/0`) where not required?  `security` `network`
130. [BLK] Are data stores and object storage encrypted at rest with managed/customer keys as required?  `security` `encryption`
131. [BLK] Is encryption in transit enforced (TLS settings, HTTPS listeners, secure protocols)?  `security` `tls`
132. [BLK] Are secrets retrieved from a secret manager/KMS flow, not plaintext variables or locals?  `security` `secrets`
133. [BLK] Are secret values prevented from leaking into outputs, logs, and plan comments?  `security` `secrets`
134. [MAJ] Are key rotation and secret rotation patterns supported by the infrastructure design?  `security` `operations`
135. [MAJ] Are KMS key policies scoped and audited, including admin separation where required?  `security` `kms`
136. [MAJ] Are bucket/storage policies denying public access by default?  `security` `storage`
137. [MAJ] Are network ACLs, route tables, and subnet boundaries aligned to trust zones?  `security` `network`
138. [MAJ] Are private endpoints/peering/transit configs avoiding unintended lateral exposure?  `security` `network`
139. [MAJ] Are logging/monitoring resources secured against tampering and unauthorized reads?  `security` `audit`
140. [MAJ] Are admin interfaces restricted (IP allowlists, SSO, MFA, break-glass controls)?  `security` `access-control`
141. [MAJ] Are compliance-relevant controls represented as code (retention, encryption, access logs)?  `security` `compliance`
142. [MAJ] Are service accounts/identities separated by workload and environment?  `security` `iam` `environments`
143. [MIN] Are default passwords, test credentials, and insecure bootstrap paths absent?  `security` `secrets`
144. [MIN] Are policy conditions used for time/IP/device/context restrictions where feasible?  `security` `iam`
145. [MIN] Are denial guardrails present for destructive/high-risk actions?  `security` `governance`
146. [MIN] Are sensitive tags/labels avoided if they expose internal security context?  `security` `tagging`
147. [MAJ] Are DNS/public endpoint exposures intentional and reviewed with owning teams?  `security` `network`
148. [MIN] Are TLS cert lifecycles automated and monitored for expiry?  `security` `tls`
149. [MIN] Are backup snapshots encrypted and access-controlled?  `security` `dr`
150. [MIN] Are infrastructure logs routed to centralized, immutable storage where required?  `security` `audit`
151. [MIN] Are cloud-native threat detection integrations enabled where expected?  `security` `operations`
152. [MIN] Are ephemeral preview environments constrained to prevent data exfiltration risk?  `security` `environments`
153. [MIN] Are service-to-service auth patterns explicit (mTLS, IAM auth, workload identity)?  `security` `identity`
154. [MIN] Are third-party integrations scoped and reviewed for least privilege?  `security` `supply-chain`

## Reliability, Observability, DR & Cost

155. [MAJ] Are HA expectations encoded (multi-AZ/zone, regional redundancy) for critical services?  `reliability` `ha`
156. [MAJ] Are single points of failure identified and either removed or documented with acceptance?  `reliability` `risk`
157. [MAJ] Are autoscaling boundaries sensible (min/max/cooldowns/health metrics)?  `reliability` `scaling`
158. [MAJ] Are health checks and readiness/liveness settings configured appropriately?  `reliability` `operations`
159. [MIN] Are backup policies present (frequency, retention, restore testing expectations)?  `dr` `operations`
160. [MAJ] Are restore/runbook assumptions realistic and documented (RTO/RPO)?  `dr` `operations`
161. [MIN] Are alarms/alerts defined for critical infra saturation and failure signals?  `observability` `operations`
162. [MIN] Are logs/metrics/traces enabled with practical retention and cost controls?  `observability` `cost`
163. [MIN] Are dashboards/alerts tied to ownership and escalation paths?  `observability` `ownership`
164. [MIN] Are quota and API rate limits considered for growth scenarios?  `reliability` `capacity`
165. [MIN] Are region/zone failure assumptions reflected in architecture choices?  `reliability` `ha`
166. [MIN] Are maintenance windows/patch channels represented where applicable?  `operations` `maintenance`
167. [MIN] Are cost-impacting changes called out (new always-on instances, egress, premium tiers)?  `cost` `review`
168. [MIN] Are rightsizing and tier choices justified for environment criticality?  `cost` `environments`
169. [MIN] Are lifecycle/retention policies used to control storage and logging cost growth?  `cost` `operations`
170. [MIN] Are idle resources prevented in ephemeral environments (auto-stop/TTL cleanup)?  `cost` `environments`
171. [MIN] Are tagging standards complete for cost allocation and ownership reporting?  `tagging` `cost`
172. [MIN] Are hidden cost multipliers reviewed (cross-zone/region traffic, NAT, LB data processing)?  `cost` `network`

## CI/CD, Policy, Testing & Team Workflows

173. [BLK] Are plans generated in CI with the same Terraform/provider versions as apply?  `ci-cd` `reproducibility`
174. [BLK] Is apply gated behind review/approval and restricted principals?  `ci-cd` `security`
175. [BLK] Are state-changing commands prevented from developer laptops for protected environments?  `ci-cd` `governance`
176. [MAJ] Are `terraform fmt`, `validate`, and lint checks enforced in CI?  `ci-cd` `quality`
177. [MAJ] Are policy-as-code checks enforced (OPA/Sentinel/Conftest/Tfsec/Checkov equivalents)?  `policy` `security`
178. [MAJ] Are high-risk policy violations blocking merges/applies?  `policy` `governance`
179. [MIN] Are plans reviewed for both resource actions and attribute-level drift?  `plan` `review`
180. [MIN] Are speculative plans generated per PR for all impacted stacks?  `plan` `ci-cd`
181. [MIN] Are integration/smoke tests run post-apply where feasible?  `testing` `operations`
182. [MIN] Are module contract tests present (inputs/outputs/expected resources)?  `testing` `modules`
183. [MIN] Are golden plan tests or snapshot checks used judiciously for critical modules?  `testing` `plan`
184. [MAJ] Are drift-detection jobs scheduled and actionable?  `drift` `operations`
185. [MIN] Are imports/migrations rehearsed in lower environments before prod?  `migrations` `environments`
186. [MIN] Are branch/environment promotion flows explicit (dev -> stage -> prod)?  `ci-cd` `environments`
187. [MIN] Are environment-specific backends/credentials isolated in pipeline configuration?  `ci-cd` `security`
188. [MIN] Are manual approval steps tied to risk level (destroy, IAM, networking, data)?  `ci-cd` `risk`
189. [MIN] Are emergency change paths defined with auditability and follow-up remediation?  `operations` `governance`
190. [MIN] Are code owners/reviewers aligned with impacted infra domains?  `ownership` `review`
191. [NIT] Are PR templates/checklists used to standardize Terraform review quality?  `process` `review`
192. [MIN] Are release notes/changelogs capturing infra-impacting behavior changes?  `documentation` `operations`
193. [MIN] Are decommission workflows documented (drain, backup, revoke, destroy, verify)?  `operations` `lifecycle`
194. [MIN] Are stale modules/stacks periodically retired to reduce attack surface and maintenance burden?  `maintenance` `security`
195. [MIN] Are post-incident findings translated into codified Terraform guardrails/tests?  `operations` `continuous-improvement`
