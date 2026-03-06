# Code Review Checklist: Go

---

## 1. General Code Quality

- [ ] Does the PR have a clear description of what it does and why?
- [ ] Is the change scoped appropriately, or should it be split into smaller PRs?
- [ ] Are there any unrelated changes bundled in?
- [ ] Is dead code removed rather than commented out?
- [ ] Are TODO/FIXME comments accompanied by a tracking ticket?
- [ ] Does the commit history tell a coherent story?

---

## 2. Go Idioms & Style

### Naming
- [ ] Are package names short, lowercase, singular nouns (not `utils`, `common`, `helpers`)?
- [ ] Are exported names clear without the package prefix (`http.Client`, not `http.HTTPClient`)?
- [ ] Are interfaces named with `-er` suffix when they have a single method (`Reader`, `Writer`, `Closer`)?
- [ ] Are acronyms consistently cased (`ID`, `HTTP`, `URL`, not `Id`, `Http`, `Url`)?
- [ ] Are local variables short but descriptive (`i` for index, `ctx` for context, `err` for error)?
- [ ] Are receiver names short (1-2 chars) and consistent across methods of the same type?
- [ ] Are unexported names used for package-internal types and functions?
- [ ] Is `MixedCaps` used (not `snake_case` or `SCREAMING_SNAKE`)?

### Code Organization
- [ ] Does each package have a clear, single purpose?
- [ ] Are files within a package organized logically (not one giant file)?
- [ ] Is the `internal/` directory used to prevent external packages from importing internal code?
- [ ] Are `cmd/` packages used for binaries and kept thin (parse flags, call into libraries)?
- [ ] Is the project layout consistent with the team's conventions?
- [ ] Are init() functions avoided unless absolutely necessary?

### Go Proverbs & Principles
- [ ] Is the code straightforward and readable ("Clear is better than clever")?
- [ ] Are small interfaces preferred over large ones ("The bigger the interface, the weaker the abstraction")?
- [ ] Is `interface{}` / `any` usage minimized in favor of concrete types or constrained generics?
- [ ] Are interfaces defined by the consumer, not the implementer?
- [ ] Is the zero value of types useful and safe?
- [ ] Is reflection avoided unless truly necessary?

---

## 3. Error Handling

### Error Basics
- [ ] Are all errors checked? (`err` not silently discarded with `_`)
- [ ] Are errors returned, not panicked on? (`panic` only for truly unrecoverable situations)
- [ ] Are errors wrapped with context using `fmt.Errorf("doing X: %w", err)`?
- [ ] Is the `%w` verb used (not `%v` or `%s`) when the caller needs to unwrap the error?
- [ ] Are error messages lowercase and without trailing punctuation (Go convention)?
- [ ] Are error messages specific enough to locate the problem ("open config file /etc/app.conf: permission denied")?
- [ ] Are sentinel errors (`var ErrNotFound = errors.New(...)`) used for expected, matchable conditions?
- [ ] Are custom error types used when callers need to extract structured information?
- [ ] Is `errors.Is()` and `errors.As()` used instead of direct comparison or type assertion?
- [ ] Are errors handled once (either logged or returned, not both)?

### Error Patterns
- [ ] Is the happy path left-aligned (guard clauses return early on error)?
- [ ] Are multi-return values `(result, error)` — never `(error, result)`?
- [ ] Are errors from deferred calls handled (`defer f.Close()` — does `Close` return an error that matters)?
- [ ] Are cleanup operations in `defer` statements idempotent?

---

## 4. Concurrency

### Goroutines
- [ ] Is every goroutine launched with a clear shutdown path?
- [ ] Are goroutine leaks avoided? Is there a mechanism to stop every goroutine (`context.Context`, `done` channel, `sync.WaitGroup`)?
- [ ] Are goroutines not launched in library code without the caller's knowledge?
- [ ] Is `go func()` capturing loop variables correctly (Go < 1.22 pitfall)?
- [ ] Are `sync.WaitGroup` counters incremented before `go` statements, not inside goroutines?
- [ ] Is the number of goroutines bounded (worker pool pattern, semaphore)?

### Channels
- [ ] Are channels used for communication, mutexes for state protection?
- [ ] Is the channel direction specified in function signatures (`chan<-`, `<-chan`)?
- [ ] Are channels closed by the sender, never the receiver?
- [ ] Are channels not closed more than once?
- [ ] Are buffered channels used only when the buffer size is justified?
- [ ] Is `select` with `default` used intentionally (non-blocking operations)?
- [ ] Is `select` with `context.Done()` used for cancellation?

### Synchronization
- [ ] Is `sync.Mutex` preferred over `sync.RWMutex` unless read-heavy access is proven?
- [ ] Are mutexes not copied (embed a pointer or use pointer receivers)?
- [ ] Is `sync.Once` used for one-time initialization?
- [ ] Is `sync.Map` only used for its intended use cases (append-only, disjoint keys)?
- [ ] Are race conditions tested with `-race` flag?
- [ ] Is `sync.Pool` used correctly (objects may be garbage collected, not for connection pooling)?

### Context
- [ ] Is `context.Context` the first parameter of functions that accept it?
- [ ] Are contexts not stored in structs?
- [ ] Is `context.Background()` used only at the top level (main, init, tests)?
- [ ] Is `context.TODO()` not left in production code?
- [ ] Are context cancellation functions called (typically with `defer cancel()`)?
- [ ] Are context values used sparingly and only for request-scoped data (not for function parameters)?

---

## 5. Resource Management

- [ ] Are `defer` statements used for cleanup (closing files, releasing locks, closing response bodies)?
- [ ] Is `defer` not used in long-running loops (resources won't be released until function returns)?
- [ ] Are `http.Response.Body` always closed, even when the response is an error?
- [ ] Are database connections returned to the pool (rows closed, transactions committed/rolled back)?
- [ ] Are file handles closed after use?
- [ ] Are temporary files cleaned up?
- [ ] Is `io.Copy` or `io.ReadAll` used with appropriate size limits to prevent memory exhaustion?

---

## 6. Data Structures & Types

### Structs
- [ ] Are struct fields ordered to minimize padding (largest to smallest alignment)?
- [ ] Are struct literals using field names (not positional)?
- [ ] Are pointer vs value receivers chosen consistently and correctly for a given type?
- [ ] Are value receivers used for small, immutable types; pointer receivers for large or mutable types?
- [ ] Are exported struct fields intentionally public?
- [ ] Are struct tags correct and consistent (`json:"fieldName"`, `db:"column_name"`)?

### Slices & Maps
- [ ] Are slices pre-allocated with `make([]T, 0, expectedCap)` when the size is known or estimable?
- [ ] Are nil slices preferred over empty slices for "no data" (`var s []int` not `s := []int{}`)?
- [ ] Are maps initialized with `make(map[K]V, expectedSize)` when size is known?
- [ ] Are map reads not assumed to be safe for concurrent access (use `sync.RWMutex` or `sync.Map`)?
- [ ] Are slice append side effects understood (shared underlying arrays)?
- [ ] Are `copy()` used when a true copy is needed, not just reassignment?
- [ ] Is map iteration order not relied upon (it's randomized)?

### Generics (Go 1.18+)
- [ ] Are generics used only when they reduce duplication without sacrificing readability?
- [ ] Are type constraints as narrow as possible (`comparable`, `constraints.Ordered`, custom interfaces)?
- [ ] Are generic functions preferred over generic types when possible?
- [ ] Is the generic code not overengineered (a concrete implementation may be clearer)?

---

## 7. Standard Library Usage

- [ ] Is `strings.Builder` used for building strings in loops, not `+` concatenation?
- [ ] Is `strconv` used instead of `fmt.Sprintf` for simple number-to-string conversions?
- [ ] Are `time.Duration` values used (not raw integers) for time-related parameters?
- [ ] Is `time.Since(start)` used instead of `time.Now().Sub(start)`?
- [ ] Are `filepath` functions used for file paths (not `path` or string manipulation)?
- [ ] Is `io.Reader`/`io.Writer` used for streaming data rather than loading everything into memory?
- [ ] Are `bytes.Buffer` or `strings.Reader` used to adapt between string/byte and io interfaces?
- [ ] Is `encoding/json` using struct tags correctly? Are `omitempty` and `-` used where appropriate?
- [ ] Is `net/http` client using a custom `Transport` with timeouts, not the `DefaultClient`?
- [ ] Are `sort.Slice` / `slices.Sort` used for sorting?

---

## 8. Testing

### Test Basics
- [ ] Are there tests for new logic?
- [ ] Are test function names descriptive (`TestCreateUser_DuplicateEmail_ReturnsError`)?
- [ ] Are table-driven tests used for multiple input/output scenarios?
- [ ] Are test helpers using `t.Helper()` for clear error reporting?
- [ ] Are subtests used (`t.Run(name, func(t *testing.T) {...})`) for organization?
- [ ] Are tests parallel where possible (`t.Parallel()`)?
- [ ] Are test fixtures in `testdata/` directory?
- [ ] Are golden files used for complex output comparisons?

### Test Quality
- [ ] Are tests testing behavior, not implementation?
- [ ] Are assertions clear and specific (use `testify` or `go-cmp` for readable diffs)?
- [ ] Are tests independent (no reliance on execution order or global state)?
- [ ] Is `t.Cleanup()` used for test resource cleanup?
- [ ] Are timeouts or deadlines set for tests that could hang?
- [ ] Are mock/fake/stub interfaces used, not concrete types?
- [ ] Are integration tests tagged with build tags or in separate packages?

### Benchmarks & Fuzzing
- [ ] Are benchmarks added for performance-critical code (`func BenchmarkXxx(b *testing.B)`)?
- [ ] Are benchmark results stable and meaningful (use `b.ResetTimer()`, `b.ReportAllocs()`)?
- [ ] Are fuzz tests added for parsers and validators (`func FuzzXxx(f *testing.F)`)?

### Race Detection
- [ ] Are tests run with `-race` in CI?
- [ ] Are data races fixed, not worked around?

---

## 9. API & Interface Design

### HTTP APIs
- [ ] Are handlers using `http.HandlerFunc` or implementing `http.Handler`?
- [ ] Are middleware functions composable and focused?
- [ ] Is request validation done early (before business logic)?
- [ ] Are response types consistent (JSON structure, error shapes)?
- [ ] Are HTTP status codes correct and specific?
- [ ] Are request timeouts set via `http.Server.ReadTimeout`, `WriteTimeout`?
- [ ] Are graceful shutdown patterns implemented (`server.Shutdown(ctx)`)?

### gRPC APIs
- [ ] Are protobuf best practices followed (see Java+Protobuf checklist for proto schema review)?
- [ ] Are interceptors used for cross-cutting concerns (logging, auth, metrics)?
- [ ] Are streaming RPCs used appropriately (not for simple request/response)?
- [ ] Are deadlines propagated through context?

### Library APIs
- [ ] Do functions accept interfaces and return structs?
- [ ] Are functional options used for configurable constructors (`WithTimeout(d time.Duration)`)?
- [ ] Are exported APIs minimal and intentional?
- [ ] Are breaking changes avoided or clearly documented?

---

## 10. Performance

- [ ] Are allocations minimized in hot paths (reuse buffers, avoid unnecessary copies)?
- [ ] Are string/byte conversions minimized (`[]byte(s)` allocates)?
- [ ] Is `sync.Pool` used for frequently allocated, short-lived objects?
- [ ] Are database queries efficient with proper indexes?
- [ ] Are HTTP response bodies fully read and closed (prevent connection reuse issues)?
- [ ] Are large payloads streamed, not buffered entirely in memory?
- [ ] Is `pprof` profiling data considered for performance-sensitive changes?
- [ ] Are connection pools tuned (`sql.DB.SetMaxOpenConns`, `SetMaxIdleConns`)?
- [ ] Is batch processing used for bulk operations?

---

## 11. Security

- [ ] Is user input validated and sanitized?
- [ ] Are SQL queries parameterized (using `$1`, `?` placeholders, not `fmt.Sprintf`)?
- [ ] Are secrets not hardcoded or logged?
- [ ] Are TLS configurations secure (min TLS 1.2, no weak ciphers)?
- [ ] Are file paths sanitized to prevent directory traversal (`filepath.Clean`, `filepath.Rel`)?
- [ ] Are crypto operations using `crypto/rand`, not `math/rand`?
- [ ] Are dependencies scanned for vulnerabilities (`govulncheck`)?
- [ ] Are input size limits enforced to prevent denial of service?
- [ ] Are authentication and authorization checked for every endpoint?
- [ ] Are HTTP clients not following redirects to untrusted hosts?

---

## 12. Build, Modules & Dependencies

- [ ] Is `go.mod` tidy (`go mod tidy` leaves no diff)?
- [ ] Are new dependencies justified and reviewed for quality and maintenance?
- [ ] Are indirect dependencies understood (no unexpected transitive deps)?
- [ ] Is the Go version in `go.mod` appropriate for the project?
- [ ] Are build tags used correctly for platform-specific code?
- [ ] Is `go vet` clean?
- [ ] Are linter warnings addressed (`golangci-lint`, `staticcheck`)?
- [ ] Are `//go:generate` commands documented and reproducible?
- [ ] Is the binary size reasonable (no unnecessary dependencies linked)?

---

## 13. Observability & Operations

- [ ] Are structured logs used (`slog`, `zap`, or `zerolog`) instead of `log.Printf`?
- [ ] Are log levels used appropriately (debug for verbose, info for operational, error for failures)?
- [ ] Are metrics exposed (Prometheus counters, gauges, histograms) for new features?
- [ ] Are traces propagated through context (OpenTelemetry)?
- [ ] Are health check endpoints (`/healthz`, `/readyz`) updated?
- [ ] Are feature flags used for gradual rollout?
- [ ] Are configuration values validated at startup (fail fast)?
- [ ] Are graceful shutdown and drain patterns implemented?

---

## 14. Documentation

- [ ] Are exported functions and types documented with godoc-style comments?
- [ ] Are package-level comments present in a `doc.go` file for important packages?
- [ ] Are complex algorithms or business rules explained in comments?
- [ ] Are examples provided for non-obvious APIs (`func ExampleFoo() {...}`)?
- [ ] Are breaking changes called out in the PR description?
- [ ] Is the README updated for new setup steps, environment variables, or CLI flags?
