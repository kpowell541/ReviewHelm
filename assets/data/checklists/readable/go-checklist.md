# Go — Code Review Checklist

🐹 Review checklist for Go services and libraries
Total items: 176  |  Version: 1.0.0

---

## Severity Legend

| Code | Meaning  | Description                        |
|------|----------|------------------------------------|
| BLK  | Blocker  | Must fix before merge              |
| MAJ  | Major    | Should fix, significant concern    |
| MIN  | Minor    | Nice to fix, not critical          |
| NIT  | Nit      | Cosmetic / stylistic preference    |

---

## General Code Quality

1. [MIN] Does the PR have a clear description of what it does and why?  `general`
2. [MIN] Is the change scoped appropriately, or should it be split into smaller PRs?  `react`
3. [MIN] Are there any unrelated changes bundled in?  `general`
4. [NIT] Is dead code removed rather than commented out?  `code-quality` `documentation`
5. [NIT] Are TODO/FIXME comments accompanied by a tracking ticket?  `code-quality` `documentation`
6. [MIN] Does the commit history tell a coherent story?  `general`

## Go Idioms & Style

### Naming

7. [NIT] Are package names short, lowercase, singular nouns (not `utils`, `common`, `helpers`)?  `naming`
8. [NIT] Are exported names clear without the package prefix (`http.Client`, not `http.HTTPClient`)?  `naming`
9. [NIT] Are interfaces named with `-er` suffix when they have a single method (`Reader`, `Writer`, `Closer`)?  `types` `naming` `resource-management`
10. [NIT] Are acronyms consistently cased (`ID`, `HTTP`, `URL`, not `Id`, `Http`, `Url`)?  `naming`
11. [NIT] Are local variables short but descriptive (`i` for index, `ctx` for context, `err` for error)?  `error-handling` `performance` `naming` `accessibility`
12. [NIT] Are receiver names short (1-2 chars) and consistent across methods of the same type?  `types` `naming`
13. [NIT] Are unexported names used for package-internal types and functions?  `types` `naming`
14. [NIT] Is `MixedCaps` used (not `snake_case` or `SCREAMING_SNAKE`)?  `naming`

### Code Organization

15. [NIT] Does each package have a clear, single purpose?  `general`
16. [NIT] Are files within a package organized logically (not one giant file)?  `general`
17. [NIT] Is the `internal/` directory used to prevent external packages from importing internal code?  `general`
18. [NIT] Are `cmd/` packages used for binaries and kept thin (parse flags, call into libraries)?  `general`
19. [NIT] Is the project layout consistent with the team's conventions?  `naming`
20. [NIT] Are init() functions avoided unless absolutely necessary?  `general`

### Go Proverbs & Principles

21. [NIT] Is the code straightforward and readable ("Clear is better than clever")?  `general`
22. [NIT] Are small interfaces preferred over large ones ("The bigger the interface, the weaker the abstraction")?  `types`
23. [NIT] Is `interface{}` / `any` usage minimized in favor of concrete types or constrained generics?  `types`
24. [NIT] Are interfaces defined by the consumer, not the implementer?  `types`
25. [NIT] Is the zero value of types useful and safe?  `types`
26. [NIT] Is reflection avoided unless truly necessary?  `general`

## Error Handling

### Error Basics

27. [MAJ] Are all errors checked? (`err` not silently discarded with `_`)  `error-handling`
28. [MAJ] Are errors returned, not panicked on? (`panic` only for truly unrecoverable situations)  `error-handling`
29. [MAJ] Are errors wrapped with context using `fmt.Errorf("doing X: %w", err)`?  `error-handling`
30. [MAJ] Is the `%w` verb used (not `%v` or `%s`) when the caller needs to unwrap the error?  `error-handling`
31. [MAJ] Are error messages lowercase and without trailing punctuation (Go convention)?  `error-handling` `naming` `protobuf`
32. [MAJ] Are error messages specific enough to locate the problem ("open config file /etc/app.conf: permission denied")?  `error-handling` `protobuf`
33. [MAJ] Are sentinel errors (`var ErrNotFound = errors.New(...)`) used for expected, matchable conditions?  `error-handling`
34. [MAJ] Are custom error types used when callers need to extract structured information?  `error-handling` `types`
35. [MAJ] Is `errors.Is()` and `errors.As()` used instead of direct comparison or type assertion?  `error-handling` `testing` `types`
36. [MAJ] Are errors handled once (either logged or returned, not both)?  `error-handling`

### Error Patterns

37. [MAJ] Is the happy path left-aligned (guard clauses return early on error)?  `error-handling`
38. [MAJ] Are multi-return values `(result, error)` — never `(error, result)`?  `error-handling`
39. [MAJ] Are errors from deferred calls handled (`defer f.Close()` — does `Close` return an error that matters)?  `error-handling` `resource-management`
40. [MAJ] Are cleanup operations in `defer` statements idempotent?  `error-handling` `resource-management` `react`

## Concurrency

### Goroutines

41. [MAJ] Is every goroutine launched with a clear shutdown path?  `concurrency`
42. [MAJ] Are goroutine leaks avoided? Is there a mechanism to stop every goroutine (`context.Context`, `done` channel, `sync.WaitGroup`)?  `concurrency`
43. [MAJ] Are goroutines not launched in library code without the caller's knowledge?  `concurrency`
44. [MAJ] Is `go func()` capturing loop variables correctly (Go < 1.22 pitfall)?  `concurrency` `accessibility`
45. [MAJ] Are `sync.WaitGroup` counters incremented before `go` statements, not inside goroutines?  `concurrency` `react`
46. [MAJ] Is the number of goroutines bounded (worker pool pattern, semaphore)?  `concurrency` `performance`

### Channels

47. [MAJ] Are channels used for communication, mutexes for state protection?  `concurrency` `react`
48. [MAJ] Is the channel direction specified in function signatures (`chan<-`, `<-chan`)?  `concurrency`
49. [MAJ] Are channels closed by the sender, never the receiver?  `concurrency` `resource-management`
50. [MAJ] Are channels not closed more than once?  `concurrency` `resource-management`
51. [MAJ] Are buffered channels used only when the buffer size is justified?  `concurrency`
52. [MAJ] Is `select` with `default` used intentionally (non-blocking operations)?  `concurrency`
53. [MAJ] Is `select` with `context.Done()` used for cancellation?  `concurrency`

### Synchronization

54. [MAJ] Is `sync.Mutex` preferred over `sync.RWMutex` unless read-heavy access is proven?  `concurrency`
55. [MAJ] Are mutexes not copied (embed a pointer or use pointer receivers)?  `concurrency`
56. [MAJ] Is `sync.Once` used for one-time initialization?  `general`
57. [MAJ] Is `sync.Map` only used for its intended use cases (append-only, disjoint keys)?  `general`
58. [BLK] Are race conditions tested with `-race` flag?  `concurrency` `testing`
59. [MAJ] Is `sync.Pool` used correctly (objects may be garbage collected, not for connection pooling)?  `performance` `resource-management`

### Context

60. [MAJ] Is `context.Context` the first parameter of functions that accept it?  `general`
61. [MAJ] Are contexts not stored in structs?  `general`
62. [MAJ] Is `context.Background()` used only at the top level (main, init, tests)?  `testing`
63. [MAJ] Is `context.TODO()` not left in production code?  `code-quality`
64. [MAJ] Are context cancellation functions called (typically with `defer cancel()`)?  `resource-management`
65. [MAJ] Are context values used sparingly and only for request-scoped data (not for function parameters)?  `general`

## Resource Management

66. [MIN] Are `defer` statements used for cleanup (closing files, releasing locks, closing response bodies)?  `concurrency` `resource-management` `react`
67. [MIN] Is `defer` not used in long-running loops (resources won't be released until function returns)?  `resource-management`
68. [MIN] Are `http.Response.Body` always closed, even when the response is an error?  `error-handling` `resource-management`
69. [MIN] Are database connections returned to the pool (rows closed, transactions committed/rolled back)?  `performance` `resource-management`
70. [MIN] Are file handles closed after use?  `resource-management`
71. [MIN] Are temporary files cleaned up?  `resource-management`
72. [MIN] Is `io.Copy` or `io.ReadAll` used with appropriate size limits to prevent memory exhaustion?  `performance` `resource-management` `react`

## Data Structures & Types

### Structs

73. [MIN] Are struct fields ordered to minimize padding (largest to smallest alignment)?  `types` `protobuf`
74. [MIN] Are struct literals using field names (not positional)?  `types` `naming` `protobuf`
75. [MIN] Are pointer vs value receivers chosen consistently and correctly for a given type?  `types`
76. [MIN] Are value receivers used for small, immutable types; pointer receivers for large or mutable types?  `types`
77. [MIN] Are exported struct fields intentionally public?  `types` `protobuf`
78. [MIN] Are struct tags correct and consistent (`json:"fieldName"`, `db:"column_name"`)?  `types` `naming` `protobuf`

### Slices & Maps

79. [MIN] Are slices pre-allocated with `make([]T, 0, expectedCap)` when the size is known or estimable?  `types`
80. [MIN] Are nil slices preferred over empty slices for "no data" (`var s []int` not `s := []int{}`)?  `types` `null-safety`
81. [MIN] Are maps initialized with `make(map[K]V, expectedSize)` when size is known?  `types`
82. [MAJ] Are map reads not assumed to be safe for concurrent access (use `sync.RWMutex` or `sync.Map`)?  `concurrency` `types`
83. [MIN] Are slice append side effects understood (shared underlying arrays)?  `types` `react`
84. [MIN] Are `copy()` used when a true copy is needed, not just reassignment?  `types`
85. [MIN] Is map iteration order not relied upon (it's randomized)?  `types`

### Generics (Go 1.18+)

86. [NIT] Are generics used only when they reduce duplication without sacrificing readability?  `types` `code-quality`
87. [MIN] Are type constraints as narrow as possible (`comparable`, `constraints.Ordered`, custom interfaces)?  `types`
88. [MIN] Are generic functions preferred over generic types when possible?  `types`
89. [MIN] Is the generic code not overengineered (a concrete implementation may be clearer)?  `types`

## Standard Library Usage

90. [MIN] Is `strings.Builder` used for building strings in loops, not `+` concatenation?  `general`
91. [MIN] Is `strconv` used instead of `fmt.Sprintf` for simple number-to-string conversions?  `general`
92. [MIN] Are `time.Duration` values used (not raw integers) for time-related parameters?  `general`
93. [MIN] Is `time.Since(start)` used instead of `time.Now().Sub(start)`?  `general`
94. [MIN] Are `filepath` functions used for file paths (not `path` or string manipulation)?  `general`
95. [MIN] Is `io.Reader`/`io.Writer` used for streaming data rather than loading everything into memory?  `performance`
96. [MIN] Are `bytes.Buffer` or `strings.Reader` used to adapt between string/byte and io interfaces?  `types`
97. [MIN] Is `encoding/json` using struct tags correctly? Are `omitempty` and `-` used where appropriate?  `react`
98. [MIN] Is `net/http` client using a custom `Transport` with timeouts, not the `DefaultClient`?  `general`
99. [MIN] Are `sort.Slice` / `slices.Sort` used for sorting?  `general`

## Testing

### Test Basics

100. [MAJ] Are there tests for new logic?  `testing`
101. [MAJ] Are test function names descriptive (`TestCreateUser_DuplicateEmail_ReturnsError`)?  `error-handling` `testing` `naming`
102. [MAJ] Are table-driven tests used for multiple input/output scenarios?  `testing`
103. [MAJ] Are test helpers using `t.Helper()` for clear error reporting?  `error-handling` `testing`
104. [MAJ] Are subtests used (`t.Run(name, func(t *testing.T) {...})`) for organization?  `testing` `naming`
105. [MAJ] Are tests parallel where possible (`t.Parallel()`)?  `testing`
106. [MAJ] Are test fixtures in `testdata/` directory?  `testing`
107. [MAJ] Are golden files used for complex output comparisons?  `testing`

### Test Quality

108. [MAJ] Are tests testing behavior, not implementation?  `testing`
109. [MAJ] Are assertions clear and specific (use `testify` or `go-cmp` for readable diffs)?  `testing`
110. [MAJ] Are tests independent (no reliance on execution order or global state)?  `testing` `react`
111. [MAJ] Is `t.Cleanup()` used for test resource cleanup?  `testing` `resource-management`
112. [MAJ] Are timeouts or deadlines set for tests that could hang?  `testing`
113. [MAJ] Are mock/fake/stub interfaces used, not concrete types?  `testing` `types`
114. [MAJ] Are integration tests tagged with build tags or in separate packages?  `testing`

### Benchmarks & Fuzzing

115. [MAJ] Are benchmarks added for performance-critical code (`func BenchmarkXxx(b *testing.B)`)?  `testing` `performance`
116. [MAJ] Are benchmark results stable and meaningful (use `b.ResetTimer()`, `b.ReportAllocs()`)?  `testing`
117. [MAJ] Are fuzz tests added for parsers and validators (`func FuzzXxx(f *testing.F)`)?  `testing`

### Race Detection

118. [MAJ] Are tests run with `-race` in CI?  `concurrency` `testing`
119. [MAJ] Are data races fixed, not worked around?  `concurrency` `testing`

## API & Interface Design

### HTTP APIs

120. [MIN] Are handlers using `http.HandlerFunc` or implementing `http.Handler`?  `api-design` `types`
121. [MIN] Are middleware functions composable and focused?  `api-design` `types` `node`
122. [MIN] Is request validation done early (before business logic)?  `api-design` `types`
123. [MIN] Are response types consistent (JSON structure, error shapes)?  `error-handling` `api-design` `types`
124. [MIN] Are HTTP status codes correct and specific?  `api-design` `types`
125. [MIN] Are request timeouts set via `http.Server.ReadTimeout`, `WriteTimeout`?  `api-design` `types`
126. [MIN] Are graceful shutdown patterns implemented (`server.Shutdown(ctx)`)?  `concurrency` `api-design` `types`

### gRPC APIs

127. [MIN] Are protobuf best practices followed (see Java+Protobuf checklist for proto schema review)?  `api-design` `types` `protobuf`
128. [MIN] Are interceptors used for cross-cutting concerns (logging, auth, metrics)?  `security` `api-design` `types`
129. [MIN] Are streaming RPCs used appropriately (not for simple request/response)?  `api-design` `types` `react`
130. [MIN] Are deadlines propagated through context?  `api-design` `types` `react`

### Library APIs

131. [MIN] Do functions accept interfaces and return structs?  `api-design` `types`
132. [MIN] Are functional options used for configurable constructors (`WithTimeout(d time.Duration)`)?  `api-design` `types`
133. [MIN] Are exported APIs minimal and intentional?  `api-design` `types`
134. [MIN] Are breaking changes avoided or clearly documented?  `api-design` `types` `documentation`

## Performance

135. [MIN] Are allocations minimized in hot paths (reuse buffers, avoid unnecessary copies)?  `performance`
136. [MIN] Are string/byte conversions minimized (`[]byte(s)` allocates)?  `performance`
137. [MIN] Is `sync.Pool` used for frequently allocated, short-lived objects?  `performance`
138. [MIN] Are database queries efficient with proper indexes?  `performance` `react`
139. [MIN] Are HTTP response bodies fully read and closed (prevent connection reuse issues)?  `performance` `resource-management`
140. [MIN] Are large payloads streamed, not buffered entirely in memory?  `performance`
141. [MIN] Is `pprof` profiling data considered for performance-sensitive changes?  `performance`
142. [MIN] Are connection pools tuned (`sql.DB.SetMaxOpenConns`, `SetMaxIdleConns`)?  `performance` `resource-management`
143. [MIN] Is batch processing used for bulk operations?  `performance`

## Security

144. [BLK] Is user input validated and sanitized?  `security`
145. [BLK] Are SQL queries parameterized (using `$1`, `?` placeholders, not `fmt.Sprintf`)?  `security`
146. [BLK] Are secrets not hardcoded or logged?  `security`
147. [BLK] Are TLS configurations secure (min TLS 1.2, no weak ciphers)?  `security`
148. [BLK] Are file paths sanitized to prevent directory traversal (`filepath.Clean`, `filepath.Rel`)?  `security`
149. [BLK] Are crypto operations using `crypto/rand`, not `math/rand`?  `security`
150. [BLK] Are dependencies scanned for vulnerabilities (`govulncheck`)?  `security`
151. [BLK] Are input size limits enforced to prevent denial of service?  `security`
152. [BLK] Are authentication and authorization checked for every endpoint?  `security` `api-design`
153. [BLK] Are HTTP clients not following redirects to untrusted hosts?  `security`

## Build, Modules & Dependencies

154. [MIN] Is `go.mod` tidy (`go mod tidy` leaves no diff)?  `general`
155. [MIN] Are new dependencies justified and reviewed for quality and maintenance?  `general`
156. [MIN] Are indirect dependencies understood (no unexpected transitive deps)?  `general`
157. [MIN] Is the Go version in `go.mod` appropriate for the project?  `react`
158. [MIN] Are build tags used correctly for platform-specific code?  `general`
159. [MIN] Is `go vet` clean?  `general`
160. [MIN] Are linter warnings addressed (`golangci-lint`, `staticcheck`)?  `general`
161. [MIN] Are `//go:generate` commands documented and reproducible?  `documentation`
162. [MIN] Is the binary size reasonable (no unnecessary dependencies linked)?  `general`

## Observability & Operations

163. [MIN] Are structured logs used (`slog`, `zap`, or `zerolog`) instead of `log.Printf`?  `general`
164. [MIN] Are log levels used appropriately (debug for verbose, info for operational, error for failures)?  `error-handling` `react`
165. [MIN] Are metrics exposed (Prometheus counters, gauges, histograms) for new features?  `general`
166. [MIN] Are traces propagated through context (OpenTelemetry)?  `concurrency` `react`
167. [MIN] Are health check endpoints (`/healthz`, `/readyz`) updated?  `api-design`
168. [MIN] Are feature flags used for gradual rollout?  `general`
169. [MIN] Are configuration values validated at startup (fail fast)?  `general`
170. [MIN] Are graceful shutdown and drain patterns implemented?  `concurrency`

## Documentation

171. [NIT] Are exported functions and types documented with godoc-style comments?  `types` `code-quality` `documentation`
172. [NIT] Are package-level comments present in a `doc.go` file for important packages?  `code-quality` `documentation`
173. [NIT] Are complex algorithms or business rules explained in comments?  `code-quality` `documentation`
174. [NIT] Are examples provided for non-obvious APIs (`func ExampleFoo() {...}`)?  `api-design` `documentation`
175. [NIT] Are breaking changes called out in the PR description?  `documentation`
176. [NIT] Is the README updated for new setup steps, environment variables, or CLI flags?  `accessibility` `documentation`
