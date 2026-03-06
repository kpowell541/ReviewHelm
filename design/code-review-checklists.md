# Code Review Checklists

---

# Part 1: Java + Protobuf Monorepo

---

## 1. General Code Quality

- [ ] PR has a clear description of what it does and why
- [ ] Change is scoped appropriately (not too large, not bundling unrelated changes)
- [ ] Commit history is atomic and well-messaged
- [ ] Dead code is removed, not commented out
- [ ] TODO/FIXME comments have tracking tickets

## 2. Java Language & Style

### Naming & Readability

- [ ] Class, method, and variable names are descriptive and consistent with project conventions
- [ ] Method names clearly describe behavior (e.g., `findUserById` vs `getUser`)
- [ ] Boolean variables/methods use `is`, `has`, `should`, `can` prefixes
- [ ] Constants in `UPPER_SNAKE_CASE`, class names in `PascalCase`
- [ ] Abbreviations avoided unless universally understood

### Object-Oriented Design

- [ ] Class follows Single Responsibility Principle
- [ ] Narrowest possible access modifier used (`private` > `package-private` > `protected` > `public`)
- [ ] Composition preferred over inheritance where appropriate
- [ ] Abstract classes and interfaces define contracts, not just share code
- [ ] Utility/helper classes are minimal and justified

### Java-Specific Patterns

- [ ] `Optional` returned instead of `null` from methods
- [ ] `Optional.get()` avoided in favor of `orElse()`, `orElseThrow()`, `ifPresent()`, `map()`
- [ ] Streams used appropriately (not overly complex, not replacing simple loops needlessly)
- [ ] `var` declarations used only where the type is obvious from the right-hand side
- [ ] `equals()` and `hashCode()` overridden together
- [ ] Immutable objects preferred; fields `final` where possible
- [ ] Builder patterns used for objects with many constructor parameters
- [ ] `StringBuilder` used for string concatenation in loops

### Collections & Generics

- [ ] Correct collection types chosen (`List` vs `Set` vs `Map`, `ArrayList` vs `LinkedList`)
- [ ] Collections returned as unmodifiable views when callers shouldn't modify them
- [ ] Raw types avoided (always `List<String>`, never just `List`)
- [ ] Wildcard generics (`? extends`, `? super`) used correctly
- [ ] Empty collections returned instead of `null`

## 3. Error Handling & Resilience

- [ ] Checked exceptions for recoverable conditions, unchecked for programming errors
- [ ] Exceptions caught at the appropriate level (not too broad, not swallowed)
- [ ] Catch blocks do something meaningful (logging, wrapping, rethrowing), not just `e.printStackTrace()`
- [ ] Custom exception classes used where they add semantic value
- [ ] `finally` or try-with-resources used for resource cleanup
- [ ] `catch (Exception e)` or `catch (Throwable t)` justified and documented
- [ ] Error messages are descriptive enough for debugging (include relevant IDs, state)
- [ ] Retries implemented with backoff and bounded attempts
- [ ] `@Nullable` / `@NonNull` annotated consistently

## 4. Concurrency & Threading

- [ ] Shared mutable state accesses properly synchronized
- [ ] `ConcurrentHashMap` used instead of `synchronizedMap` where appropriate
- [ ] `volatile` fields used correctly for visibility guarantees
- [ ] `AtomicInteger`, `AtomicReference`, etc. preferred over `synchronized` for simple counters
- [ ] Thread pools properly sized and named (for debugging)
- [ ] `ExecutorService` instances shut down properly
- [ ] No risk of deadlock (lock ordering issues reviewed)
- [ ] `CompletableFuture` chains handle exceptions with `exceptionally()` or `handle()`
- [ ] No race conditions in read-modify-write sequences

## 5. Protobuf — Schema Design

- [ ] Field numbers are stable and never reused for different semantics
- [ ] Deprecated fields marked with `reserved` to prevent reuse
- [ ] Field names in `snake_case` per protobuf convention
- [ ] Enums use an `UNSPECIFIED = 0` default value
- [ ] `oneof` fields used where exactly one of several fields should be set
- [ ] Nested message types used to scope closely related messages
- [ ] `repeated` fields used instead of separate count + values patterns
- [ ] `google.protobuf.Timestamp` and `google.protobuf.Duration` used for time (not raw integers)
- [ ] `google.protobuf.FieldMask` used for partial update APIs
- [ ] `bytes` fields used for opaque binary data, not `string`

## 6. Protobuf — Wire Compatibility & Evolution

- [ ] Change is backward compatible (old readers can parse new messages)
- [ ] Change is forward compatible (new readers can parse old messages)
- [ ] Required fields avoided
- [ ] Field numbers not changed for existing fields
- [ ] Field types not changed in incompatible ways (e.g., `int32` to `string`)
- [ ] Removed fields have their field number `reserved`
- [ ] `.proto` file's `package` declaration is correct and consistent
- [ ] `import` statements use the correct paths

## 7. Protobuf — Generated Code Usage

- [ ] Generated Java code used correctly (builders, not `new`)
- [ ] `.toBuilder()` and `.build()` patterns used for modifications
- [ ] `hasField()` checks used before accessing optional fields
- [ ] `.getDefaultInstance()` used instead of `null` for absent messages
- [ ] Proto messages not used as map keys (they're mutable)
- [ ] Serialization/deserialization uses correct methods (`toByteArray()`, `parseFrom()`)

## 8. API Design (gRPC / REST)

- [ ] RPC methods named with verbs describing the action (`CreateUser`, `ListOrders`)
- [ ] Request/response messages appropriately structured, not overly generic
- [ ] Pagination fields included for list endpoints (`page_token`, `page_size`)
- [ ] Idempotency keys used for mutating operations where appropriate
- [ ] Error codes/status codes used correctly
- [ ] API changes documented in relevant API docs or changelogs
- [ ] Timeouts and deadlines set appropriately
- [ ] Input validation done early and comprehensively

## 9. Monorepo-Specific Concerns

- [ ] Change respects module/package boundaries
- [ ] Cross-module dependencies introduced intentionally and reviewed by owning teams
- [ ] Build remains fast; no unnecessary dependencies added to the build graph
- [ ] Shared libraries versioned or pinned appropriately
- [ ] Change does not affect other modules' builds or tests unexpectedly
- [ ] Internal vs public APIs clearly separated (`internal` packages, `@VisibleForTesting`)
- [ ] Change is in the correct module (not duplicating shared library functionality)
- [ ] Generated files handled consistently with repo conventions (checked in vs build-time)

## 10. Testing

- [ ] Unit tests exist for new logic
- [ ] Tests test behavior, not implementation details
- [ ] Edge cases covered (null inputs, empty collections, boundary values)
- [ ] Test names are descriptive (`shouldReturnEmptyListWhenNoUsersExist`)
- [ ] Mocks used appropriately (not over-mocking, not mocking value objects)
- [ ] Integration tests added for cross-module or database interactions
- [ ] Proto serialization round-trip tests included for schema changes
- [ ] Flaky test patterns avoided (no `Thread.sleep()`, no reliance on ordering)
- [ ] Test data constructed with builders/factories, not long constructors
- [ ] Assertions are specific (`assertEquals` > `assertTrue`, AssertJ preferred)
- [ ] `@ParameterizedTest` or data-driven tests used for repetitive cases
- [ ] Test fixtures and shared setup in `@BeforeEach`, not repeated in each test

## 11. Performance & Scalability

- [ ] Database queries efficient; N+1 query patterns avoided
- [ ] Appropriate indexes in place for new queries
- [ ] Pagination used for large result sets
- [ ] Caches used where appropriate, with proper invalidation
- [ ] Large proto messages avoided in hot paths (serialization cost)
- [ ] `repeated` proto fields bounded in practice (max list sizes)
- [ ] Lazy initialization used for expensive objects
- [ ] Connection pools, thread pools, and resource pools properly configured
- [ ] Logging levels appropriate (`DEBUG` verbose, `INFO` operational, `WARN`/`ERROR` problems)
- [ ] No logging inside tight loops

## 12. Security

- [ ] User input validated and sanitized
- [ ] SQL queries parameterized (no string concatenation)
- [ ] Sensitive fields (passwords, tokens, PII) not logged
- [ ] Authentication and authorization checks in place for new endpoints
- [ ] Secrets not hardcoded
- [ ] Dependency versions free of known vulnerabilities
- [ ] Proto fields containing sensitive data annotated or documented
- [ ] Data encrypted in transit (TLS) and at rest where required

## 13. Observability & Operations

- [ ] New metrics, traces, or logs added for new features
- [ ] Structured logging fields used (not string interpolation in log messages)
- [ ] Alerts or dashboards updated for new failure modes
- [ ] Feature flags used for gradual rollout of risky changes
- [ ] Migration scripts idempotent and backward compatible
- [ ] Rollback plan exists for the change
- [ ] Health checks updated if dependencies change

## 14. Documentation

- [ ] Javadoc comments added for public APIs
- [ ] Proto field comments clear about semantics, units, and constraints
- [ ] Complex algorithms or business rules explained in comments
- [ ] README or internal wiki updated for architectural changes
- [ ] Breaking changes called out in the PR description

---

\newpage

# Part 2: JavaScript/TypeScript + React + Node

---

## 1. General Code Quality

- [ ] PR has a clear description of what it does and why
- [ ] Change is scoped appropriately (not too large, not bundling unrelated changes)
- [ ] Commit history is atomic and well-messaged
- [ ] Dead code is removed, not commented out
- [ ] TODO/FIXME comments have tracking tickets

## 2. TypeScript & Type Safety

### Type Definitions

- [ ] Types defined for all function parameters and return values
- [ ] `any` and `unknown` avoided unless absolutely necessary and documented
- [ ] Type assertions (`as`) minimized and justified
- [ ] Union types and discriminated unions used instead of `any` for flexible data
- [ ] `interface` vs `type` used consistently with project conventions
- [ ] Generic types used where they add value (reusable functions, data structures)
- [ ] Optional properties (`?`) distinguished from nullable properties (`| null`)
- [ ] `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,V>` used instead of duplicating types
- [ ] Enums used appropriately, or `as const` objects used where more idiomatic
- [ ] Shared types in a central location, not duplicated across files
- [ ] `strict: true` honored (no `@ts-ignore` without explanation)

### Type Guards & Narrowing

- [ ] Custom type guards (`is` return type) used for complex type narrowing
- [ ] `typeof`, `instanceof`, and `in` checks used correctly for narrowing
- [ ] Exhaustiveness checks (`never`) used in switch statements on union types

## 3. JavaScript Fundamentals

- [ ] `const` preferred over `let`, and `let` over `var`
- [ ] Strict equality (`===`, `!==`) used instead of loose equality
- [ ] Template literals used instead of string concatenation
- [ ] Destructuring and spread operators used appropriately (not overused)
- [ ] `async/await` patterns used instead of raw `.then()` chains
- [ ] `Promise.all()` / `Promise.allSettled()` used for concurrent async operations
- [ ] Unhandled promise rejections avoided (no missing `catch`, no missing `await`)
- [ ] `for...of` loops used instead of `for...in` for arrays
- [ ] Array methods (`map`, `filter`, `reduce`) used where clearer than loops
- [ ] `reduce` avoided when it hurts readability (prefer `map` + `filter`)
- [ ] Nullish coalescing (`??`) and optional chaining (`?.`) used instead of `||` and `&&` checks
- [ ] `Map` and `Set` used instead of plain objects where semantically appropriate
- [ ] Closures and variable scoping correct (no stale closure bugs)

## 4. React Components

### Component Design

- [ ] Components are small and focused on a single responsibility
- [ ] Component tree structured to minimize unnecessary re-renders
- [ ] Presentational and container concerns separated appropriately
- [ ] Compound components or render props used instead of overly complex prop drilling
- [ ] Component files co-located with their styles, tests, and types
- [ ] Named exports preferred over default exports for refactoring support

### Props & State

- [ ] Prop types well-defined with TypeScript interfaces
- [ ] Required vs optional props distinguished correctly
- [ ] Callback props named with `on` prefix (`onClick`, `onSubmit`)
- [ ] State kept as local as possible (lifted only when necessary)
- [ ] Derived state computed during render, not stored in state
- [ ] Controlled vs uncontrolled components chosen intentionally
- [ ] State shape is flat and normalized (no deeply nested state objects)

### Hooks

- [ ] Hooks called at the top level only (not inside conditions, loops, or nested functions)
- [ ] `useEffect` dependency arrays correct and complete
- [ ] Cleanup functions returned from `useEffect` where needed (subscriptions, timers, listeners)
- [ ] `useEffect` not used for things computable from state/props (use `useMemo` or compute inline)
- [ ] `useMemo` and `useCallback` used appropriately (not prematurely, but where re-renders are costly)
- [ ] `useRef` values not used in dependency arrays (they don't trigger re-renders)
- [ ] Custom hooks extracted for reusable stateful logic
- [ ] Custom hooks prefixed with `use`
- [ ] `useState` used for values that trigger re-render, `useRef` for values that shouldn't

### Rendering

- [ ] `key` props are stable, unique, and not using array indices (unless list is static)
- [ ] Conditional renders are clean (ternary for simple, early return for complex)
- [ ] `&&` rendering guarded against falsy values rendering `0` or `""` (`count && <X/>` bug)
- [ ] Fragments (`<>...</>`) used instead of unnecessary wrapper `<div>`s
- [ ] Large lists virtualized (react-window, react-virtuoso) when rendering 100+ items
- [ ] Inline object/array literals avoided in JSX props (creates new references each render)
- [ ] `dangerouslySetInnerHTML` avoided or sanitized if used

### Context & State Management

- [ ] React Context used for truly global state, not for prop drilling avoidance in shallow trees
- [ ] Context values memoized to prevent unnecessary re-renders
- [ ] Context providers placed as low in the tree as possible
- [ ] State management library used consistently with project patterns
- [ ] Selectors used to read only necessary slices of state
- [ ] Actions/mutations named clearly and consistently

## 5. Node.js Backend

### Server & Routing

- [ ] Routes organized logically (by resource, not by HTTP method)
- [ ] Route handlers are thin (delegate to services/controllers)
- [ ] Middleware functions ordered correctly (auth before business logic)
- [ ] Request bodies validated with a schema validator (Zod, Joi, Yup)
- [ ] HTTP status codes used correctly (201 creation, 204 no content, 404 not found)
- [ ] Consistent error response shapes used across all endpoints

### Async Patterns

- [ ] All async operations properly awaited
- [ ] Errors in async middleware caught (express-async-errors or try/catch)
- [ ] Database transactions used for multi-step mutations
- [ ] Long-running operations offloaded to background jobs/queues
- [ ] Connection pools used for databases and external services
- [ ] Timeouts set on external HTTP calls

### Error Handling

- [ ] Global error handler middleware exists
- [ ] Operational errors (expected) distinguished from programmer errors (bugs)
- [ ] Error responses do not leak stack traces or internal details to clients
- [ ] Errors logged with sufficient context (request ID, user ID, operation)
- [ ] Unhandled rejections and uncaught exceptions handled at the process level

### Security (Node-specific)

- [ ] Environment variables used for secrets (not hardcoded)
- [ ] CORS configured correctly (not `*` in production)
- [ ] Rate limiters in place for public endpoints
- [ ] Request body size limits set
- [ ] Input sanitized to prevent NoSQL injection, XSS, and path traversal
- [ ] Authentication tokens validated on every request (JWT expiry, signature)
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA)
- [ ] HTTP security headers set (Helmet.js or equivalent)
- [ ] File uploads validated (type, size, filename sanitization)

## 6. Frontend-Specific Concerns

### Styling

- [ ] Styles scoped to components (CSS modules, styled-components, Tailwind)
- [ ] Magic numbers in CSS extracted to design tokens or variables
- [ ] Responsive design considered (mobile-first, breakpoints)
- [ ] Dark mode / theme tokens used instead of hardcoded colors
- [ ] CSS animations using `transform` and `opacity` for performance

### Accessibility (a11y)

- [ ] Interactive elements have accessible names (labels, aria-label)
- [ ] Semantic HTML elements used (`<button>`, `<nav>`, `<main>`, not `<div onClick>`)
- [ ] Keyboard navigation supported (focus management, tab order)
- [ ] ARIA roles and attributes used correctly (not redundant with semantic HTML)
- [ ] Color contrast ratios sufficient (WCAG AA minimum)
- [ ] Loading and error states announced to screen readers (aria-live regions)
- [ ] Form inputs associated with labels (`htmlFor` / `id`)
- [ ] Images with content meaning given `alt` text; decorative images use `alt=""`

### Performance

- [ ] Images optimized (WebP/AVIF, lazy loading, responsive `srcSet`)
- [ ] Large dependencies evaluated for bundle size impact
- [ ] Code splitting used for routes and heavy components (`React.lazy`, dynamic `import()`)
- [ ] Network requests deduplicated and cached (React Query, SWR, Apollo)
- [ ] Web vitals considered (LCP, FID/INP, CLS)
- [ ] Expensive computations moved to web workers or debounced/throttled
- [ ] Fonts loaded efficiently (preload, `font-display: swap`)

### Browser & Network

- [ ] API calls handled with loading, error, and empty states
- [ ] Optimistic UI used for instant-feeling mutations where appropriate
- [ ] Network errors handled gracefully (retry, offline state)
- [ ] Stale-while-revalidate patterns used for frequently accessed data
- [ ] Local storage / session storage values namespaced and size-bounded

## 7. Testing

### Unit Tests

- [ ] Unit tests exist for new utility functions and hooks
- [ ] Tests test behavior, not implementation
- [ ] Edge cases covered (empty arrays, null, undefined, boundary values)
- [ ] Test names are descriptive (`it("should show error when email is invalid")`)
- [ ] Mocks scoped to the test and cleaned up (`jest.restoreAllMocks()`)

### Component Tests

- [ ] React components tested with Testing Library (not Enzyme)
- [ ] Queries use accessible selectors (`getByRole`, `getByLabelText`) not `getByTestId`
- [ ] User interactions simulated with `userEvent`, not `fireEvent`
- [ ] Async state changes awaited with `waitFor` or `findBy`
- [ ] Snapshot tests avoided or used sparingly and intentionally

### Integration & E2E Tests

- [ ] API endpoints tested with supertest or similar
- [ ] Critical user flows covered by E2E tests (Playwright, Cypress)
- [ ] E2E tests not brittle (no hardcoded waits, stable selectors)
- [ ] Test database fixtures managed properly (seeding, cleanup)

### Test Quality

- [ ] Tests are independent (no reliance on execution order)
- [ ] Test utilities and custom render functions reduce boilerplate
- [ ] `beforeEach`/`afterEach` used for setup/teardown, not repeated in each test
- [ ] Test coverage adequate for the change (covering important paths, not chasing 100%)

## 8. Module & Dependency Management

- [ ] New dependencies justified and vetted (maintained, small, secure)
- [ ] Dependency versions pinned or using lockfiles (`package-lock.json`, `yarn.lock`)
- [ ] Peer dependency warnings resolved
- [ ] Circular dependencies avoided
- [ ] Barrel files (`index.ts`) not causing excessive bundling
- [ ] Imports organized consistently (external, internal, relative)
- [ ] Unused dependencies removed
- [ ] Dev dependencies vs production dependencies classified correctly

## 9. API Design & Data Flow

- [ ] REST conventions followed (resource nouns, HTTP verbs, proper status codes)
- [ ] Request/response schemas versioned or backward compatible
- [ ] API types shared between frontend and backend (monorepo) or generated from OpenAPI/GraphQL
- [ ] Pagination, filtering, and sorting implemented for list endpoints
- [ ] N+1 query patterns avoided in GraphQL resolvers (use DataLoader)
- [ ] Data normalized on the client or server as appropriate

## 10. Security (General)

- [ ] User input validated on both client and server
- [ ] XSS vectors mitigated (no `dangerouslySetInnerHTML` with user content)
- [ ] CSRF protections in place for state-changing requests
- [ ] Authentication and authorization checked for every protected route (frontend and backend)
- [ ] Secrets absent from client-side code and git history
- [ ] Third-party scripts evaluated for security (CDN integrity hashes)
- [ ] Content Security Policy headers configured
- [ ] File paths sanitized to prevent directory traversal

## 11. Observability & Operations

- [ ] Structured logs used (JSON format, correlation IDs)
- [ ] New features behind feature flags for safe rollout
- [ ] Health check endpoints updated if dependencies change
- [ ] Metrics tracked for new API endpoints (latency, error rate)
- [ ] Sentry/error tracking breadcrumbs meaningful
- [ ] Database migrations reversible
- [ ] Environment-specific configurations handled correctly (dev/staging/prod)

## 12. Documentation

- [ ] JSDoc comments added for exported functions and complex logic
- [ ] README files updated for new setup steps or environment variables
- [ ] API endpoints documented (OpenAPI/Swagger, GraphQL schema)
- [ ] Breaking changes called out in the PR description
- [ ] Storybook stories added for new UI components

---

\newpage

# Part 3: Go

---

## 1. General Code Quality

- [ ] PR has a clear description of what it does and why
- [ ] Change is scoped appropriately (not too large, not bundling unrelated changes)
- [ ] Commit history is atomic and well-messaged
- [ ] Dead code is removed, not commented out
- [ ] TODO/FIXME comments have tracking tickets

## 2. Go Idioms & Style

### Naming

- [ ] Package names are short, lowercase, singular nouns (not `utils`, `common`, `helpers`)
- [ ] Exported names are clear without the package prefix (`http.Client`, not `http.HTTPClient`)
- [ ] Interfaces named with `-er` suffix for single-method interfaces (`Reader`, `Writer`, `Closer`)
- [ ] Acronyms consistently cased (`ID`, `HTTP`, `URL`, not `Id`, `Http`, `Url`)
- [ ] Local variables short but descriptive (`i` for index, `ctx` for context, `err` for error)
- [ ] Receiver names short (1-2 chars) and consistent across methods of the same type
- [ ] Unexported names used for package-internal types and functions
- [ ] `MixedCaps` used (not `snake_case` or `SCREAMING_SNAKE`)

### Code Organization

- [ ] Each package has a clear, single purpose
- [ ] Files within a package organized logically (not one giant file)
- [ ] `internal/` directory used to prevent external import of internal code
- [ ] `cmd/` packages used for binaries and kept thin
- [ ] Project layout consistent with team conventions
- [ ] `init()` functions avoided unless absolutely necessary

### Go Proverbs & Principles

- [ ] Code is straightforward and readable ("Clear is better than clever")
- [ ] Small interfaces preferred over large ones
- [ ] `interface{}` / `any` usage minimized in favor of concrete types or constrained generics
- [ ] Interfaces defined by the consumer, not the implementer
- [ ] Zero value of types is useful and safe
- [ ] Reflection avoided unless truly necessary

## 3. Error Handling

### Error Basics

- [ ] All errors checked (`err` not silently discarded with `_`)
- [ ] Errors returned, not panicked on (`panic` only for truly unrecoverable situations)
- [ ] Errors wrapped with context using `fmt.Errorf("doing X: %w", err)`
- [ ] `%w` verb used (not `%v` or `%s`) when the caller needs to unwrap the error
- [ ] Error messages lowercase and without trailing punctuation (Go convention)
- [ ] Error messages specific enough to locate the problem
- [ ] Sentinel errors (`var ErrNotFound = errors.New(...)`) used for expected, matchable conditions
- [ ] Custom error types used when callers need to extract structured information
- [ ] `errors.Is()` and `errors.As()` used instead of direct comparison or type assertion
- [ ] Errors handled once (either logged or returned, not both)

### Error Patterns

- [ ] Happy path is left-aligned (guard clauses return early on error)
- [ ] Multi-return values follow `(result, error)` convention
- [ ] Errors from deferred calls handled where `Close` return value matters
- [ ] Cleanup operations in `defer` statements are idempotent

## 4. Concurrency

### Goroutines

- [ ] Every goroutine launched has a clear shutdown path
- [ ] Goroutine leaks avoided (mechanism to stop: `context.Context`, `done` channel, `sync.WaitGroup`)
- [ ] Goroutines not launched in library code without the caller's knowledge
- [ ] `go func()` captures loop variables correctly (Go < 1.22 pitfall)
- [ ] `sync.WaitGroup` counters incremented before `go` statements, not inside goroutines
- [ ] Number of goroutines bounded (worker pool pattern, semaphore)

### Channels

- [ ] Channels used for communication, mutexes for state protection
- [ ] Channel direction specified in function signatures (`chan<-`, `<-chan`)
- [ ] Channels closed by the sender, never the receiver
- [ ] Channels not closed more than once
- [ ] Buffered channels used only when the buffer size is justified
- [ ] `select` with `default` used intentionally (non-blocking operations)
- [ ] `select` with `context.Done()` used for cancellation

### Synchronization

- [ ] `sync.Mutex` preferred over `sync.RWMutex` unless read-heavy access is proven
- [ ] Mutexes not copied (embed a pointer or use pointer receivers)
- [ ] `sync.Once` used for one-time initialization
- [ ] `sync.Map` only used for its intended use cases (append-only, disjoint keys)
- [ ] Race conditions tested with `-race` flag
- [ ] `sync.Pool` used correctly (not for connection pooling)

### Context

- [ ] `context.Context` is the first parameter of functions that accept it
- [ ] Contexts not stored in structs
- [ ] `context.Background()` used only at the top level (main, init, tests)
- [ ] `context.TODO()` not left in production code
- [ ] Context cancellation functions called (typically with `defer cancel()`)
- [ ] Context values used sparingly, only for request-scoped data

## 5. Resource Management

- [ ] `defer` statements used for cleanup (closing files, releasing locks, closing response bodies)
- [ ] `defer` not used in long-running loops (resources won't release until function returns)
- [ ] `http.Response.Body` always closed, even when response is an error
- [ ] Database connections returned to the pool (rows closed, transactions committed/rolled back)
- [ ] File handles closed after use
- [ ] Temporary files cleaned up
- [ ] `io.Copy` or `io.ReadAll` used with appropriate size limits to prevent memory exhaustion

## 6. Data Structures & Types

### Structs

- [ ] Struct fields ordered to minimize padding (largest to smallest alignment)
- [ ] Struct literals use field names (not positional)
- [ ] Pointer vs value receivers chosen consistently and correctly for a given type
- [ ] Value receivers used for small, immutable types; pointer receivers for large or mutable types
- [ ] Exported struct fields are intentionally public
- [ ] Struct tags correct and consistent (`json:"fieldName"`, `db:"column_name"`)

### Slices & Maps

- [ ] Slices pre-allocated with `make([]T, 0, expectedCap)` when size is known or estimable
- [ ] Nil slices preferred over empty slices for "no data"
- [ ] Maps initialized with `make(map[K]V, expectedSize)` when size is known
- [ ] Map reads not assumed safe for concurrent access (use `sync.RWMutex` or `sync.Map`)
- [ ] Slice append side effects understood (shared underlying arrays)
- [ ] `copy()` used when a true copy is needed, not just reassignment
- [ ] Map iteration order not relied upon (it's randomized)

### Generics (Go 1.18+)

- [ ] Generics used only when they reduce duplication without sacrificing readability
- [ ] Type constraints as narrow as possible (`comparable`, `constraints.Ordered`, custom interfaces)
- [ ] Generic functions preferred over generic types when possible
- [ ] Generic code not overengineered (concrete implementation may be clearer)

## 7. Standard Library Usage

- [ ] `strings.Builder` used for building strings in loops, not `+` concatenation
- [ ] `strconv` used instead of `fmt.Sprintf` for simple number-to-string conversions
- [ ] `time.Duration` values used (not raw integers) for time-related parameters
- [ ] `time.Since(start)` used instead of `time.Now().Sub(start)`
- [ ] `filepath` functions used for file paths (not `path` or string manipulation)
- [ ] `io.Reader`/`io.Writer` used for streaming data rather than loading everything into memory
- [ ] `bytes.Buffer` or `strings.Reader` used to adapt between string/byte and io interfaces
- [ ] `encoding/json` struct tags correct; `omitempty` and `-` used where appropriate
- [ ] `net/http` client uses a custom `Transport` with timeouts, not `DefaultClient`
- [ ] `sort.Slice` / `slices.Sort` used for sorting

## 8. Testing

### Test Basics

- [ ] Tests exist for new logic
- [ ] Test function names are descriptive (`TestCreateUser_DuplicateEmail_ReturnsError`)
- [ ] Table-driven tests used for multiple input/output scenarios
- [ ] Test helpers use `t.Helper()` for clear error reporting
- [ ] Subtests used (`t.Run(name, func(t *testing.T) {...})`) for organization
- [ ] Tests are parallel where possible (`t.Parallel()`)
- [ ] Test fixtures in `testdata/` directory
- [ ] Golden files used for complex output comparisons

### Test Quality

- [ ] Tests test behavior, not implementation
- [ ] Assertions clear and specific (use `testify` or `go-cmp` for readable diffs)
- [ ] Tests are independent (no reliance on execution order or global state)
- [ ] `t.Cleanup()` used for test resource cleanup
- [ ] Timeouts or deadlines set for tests that could hang
- [ ] Mock/fake/stub interfaces used, not concrete types
- [ ] Integration tests tagged with build tags or in separate packages

### Benchmarks & Fuzzing

- [ ] Benchmarks added for performance-critical code (`func BenchmarkXxx(b *testing.B)`)
- [ ] Benchmark results stable and meaningful (use `b.ResetTimer()`, `b.ReportAllocs()`)
- [ ] Fuzz tests added for parsers and validators (`func FuzzXxx(f *testing.F)`)

### Race Detection

- [ ] Tests run with `-race` in CI
- [ ] Data races fixed, not worked around

## 9. API & Interface Design

### HTTP APIs

- [ ] Handlers use `http.HandlerFunc` or implement `http.Handler`
- [ ] Middleware functions are composable and focused
- [ ] Request validation done early (before business logic)
- [ ] Response types consistent (JSON structure, error shapes)
- [ ] HTTP status codes correct and specific
- [ ] Request timeouts set via `http.Server.ReadTimeout`, `WriteTimeout`
- [ ] Graceful shutdown patterns implemented (`server.Shutdown(ctx)`)

### gRPC APIs

- [ ] Protobuf best practices followed (see Java+Protobuf checklist for schema review)
- [ ] Interceptors used for cross-cutting concerns (logging, auth, metrics)
- [ ] Streaming RPCs used appropriately (not for simple request/response)
- [ ] Deadlines propagated through context

### Library APIs

- [ ] Functions accept interfaces and return structs
- [ ] Functional options used for configurable constructors (`WithTimeout(d time.Duration)`)
- [ ] Exported APIs minimal and intentional
- [ ] Breaking changes avoided or clearly documented

## 10. Performance

- [ ] Allocations minimized in hot paths (reuse buffers, avoid unnecessary copies)
- [ ] String/byte conversions minimized (`[]byte(s)` allocates)
- [ ] `sync.Pool` used for frequently allocated, short-lived objects
- [ ] Database queries efficient with proper indexes
- [ ] HTTP response bodies fully read and closed (prevent connection reuse issues)
- [ ] Large payloads streamed, not buffered entirely in memory
- [ ] `pprof` profiling data considered for performance-sensitive changes
- [ ] Connection pools tuned (`sql.DB.SetMaxOpenConns`, `SetMaxIdleConns`)
- [ ] Batch processing used for bulk operations

## 11. Security

- [ ] User input validated and sanitized
- [ ] SQL queries parameterized (using `$1`, `?` placeholders, not `fmt.Sprintf`)
- [ ] Secrets not hardcoded or logged
- [ ] TLS configurations secure (min TLS 1.2, no weak ciphers)
- [ ] File paths sanitized to prevent directory traversal (`filepath.Clean`, `filepath.Rel`)
- [ ] Crypto operations using `crypto/rand`, not `math/rand`
- [ ] Dependencies scanned for vulnerabilities (`govulncheck`)
- [ ] Input size limits enforced to prevent denial of service
- [ ] Authentication and authorization checked for every endpoint
- [ ] HTTP clients not following redirects to untrusted hosts

## 12. Build, Modules & Dependencies

- [ ] `go.mod` is tidy (`go mod tidy` leaves no diff)
- [ ] New dependencies justified and reviewed for quality and maintenance
- [ ] Indirect dependencies understood (no unexpected transitive deps)
- [ ] Go version in `go.mod` appropriate for the project
- [ ] Build tags used correctly for platform-specific code
- [ ] `go vet` is clean
- [ ] Linter warnings addressed (`golangci-lint`, `staticcheck`)
- [ ] `//go:generate` commands documented and reproducible
- [ ] Binary size reasonable (no unnecessary dependencies linked)

## 13. Observability & Operations

- [ ] Structured logs used (`slog`, `zap`, or `zerolog`) instead of `log.Printf`
- [ ] Log levels used appropriately (debug verbose, info operational, error failures)
- [ ] Metrics exposed (Prometheus counters, gauges, histograms) for new features
- [ ] Traces propagated through context (OpenTelemetry)
- [ ] Health check endpoints (`/healthz`, `/readyz`) updated
- [ ] Feature flags used for gradual rollout
- [ ] Configuration values validated at startup (fail fast)
- [ ] Graceful shutdown and drain patterns implemented

## 14. Documentation

- [ ] Exported functions and types documented with godoc-style comments
- [ ] Package-level comments present in `doc.go` for important packages
- [ ] Complex algorithms or business rules explained in comments
- [ ] Examples provided for non-obvious APIs (`func ExampleFoo() {...}`)
- [ ] Breaking changes called out in the PR description
- [ ] README updated for new setup steps, environment variables, or CLI flags
