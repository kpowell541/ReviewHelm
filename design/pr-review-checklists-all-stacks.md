# PR Code Review Checklists (All Stacks)

This document combines three comprehensive PR review checklists:
- Java + Protobuf monorepo
- JavaScript/TypeScript + React + Node
- Go

Generated: 2026-03-04

---

# Code Review Checklist: Java + Protobuf Monorepo

---

## 1. General Code Quality

- [ ] Does the PR have a clear description of what it does and why?
- [ ] Is the change scoped appropriately, or should it be split into smaller PRs?
- [ ] Are there any unrelated changes bundled in (drive-by fixes, formatting-only diffs)?
- [ ] Does the commit history tell a coherent story? Are commits atomic and well-messaged?
- [ ] Is dead code removed rather than commented out?
- [ ] Are TODO/FIXME comments accompanied by a tracking ticket?

---

## 2. Java Language & Style

### Naming & Readability
- [ ] Are class, method, and variable names descriptive and consistent with project conventions?
- [ ] Do method names clearly describe their behavior (e.g., `findUserById` vs `getUser`)?
- [ ] Are boolean variables/methods named with `is`, `has`, `should`, `can` prefixes?
- [ ] Are constants in `UPPER_SNAKE_CASE` and class names in `PascalCase`?
- [ ] Are abbreviations avoided in names unless they are universally understood?

### Object-Oriented Design
- [ ] Is the class doing too much? Does it violate the Single Responsibility Principle?
- [ ] Are fields and methods using the narrowest possible access modifier (`private` > `package-private` > `protected` > `public`)?
- [ ] Is inheritance used appropriately, or would composition be a better fit?
- [ ] Are abstract classes and interfaces used to define contracts, not just to share code?
- [ ] Are utility/helper classes kept to a minimum and well-justified?

### Java-Specific Patterns
- [ ] Are `Optional` return types used instead of returning `null` from methods?
- [ ] Is `Optional.get()` avoided in favor of `orElse()`, `orElseThrow()`, `ifPresent()`, `map()`?
- [ ] Are streams used appropriately (not overly complex, not replacing simple loops unnecessarily)?
- [ ] Are `var` declarations used only where the type is obvious from the right-hand side?
- [ ] Is `equals()` and `hashCode()` overridden together when either is overridden?
- [ ] Are immutable objects preferred? Are fields `final` where possible?
- [ ] Are builder patterns used for objects with many constructor parameters?
- [ ] Is `StringBuilder` used for string concatenation in loops?

### Collections & Generics
- [ ] Are the correct collection types chosen (`List` vs `Set` vs `Map`, `ArrayList` vs `LinkedList`)?
- [ ] Are collections returned as unmodifiable views when callers shouldn't modify them?
- [ ] Are raw types avoided (always use `List<String>`, never just `List`)?
- [ ] Are wildcard generics (`? extends`, `? super`) used correctly?
- [ ] Are empty collections returned instead of `null` (e.g., `Collections.emptyList()`)?

---

## 3. Error Handling & Resilience

- [ ] Are checked exceptions used for recoverable conditions and unchecked for programming errors?
- [ ] Are exceptions caught at the appropriate level (not too broad, not swallowed)?
- [ ] Are catch blocks doing something meaningful (logging, wrapping, rethrowing), not just `e.printStackTrace()`?
- [ ] Are custom exception classes used where they add semantic value?
- [ ] Is `finally` or try-with-resources used for resource cleanup (streams, connections, locks)?
- [ ] Are `catch (Exception e)` or `catch (Throwable t)` blocks justified and documented?
- [ ] Are error messages descriptive enough for debugging (include relevant IDs, state)?
- [ ] Are retries implemented with backoff and bounded attempts?
- [ ] Is `@Nullable` / `@NonNull` annotated consistently?

---

## 4. Concurrency & Threading

- [ ] Are shared mutable state accesses properly synchronized?
- [ ] Is `ConcurrentHashMap` used instead of `synchronizedMap` where appropriate?
- [ ] Are `volatile` fields used correctly for visibility guarantees?
- [ ] Are `AtomicInteger`, `AtomicReference`, etc. preferred over `synchronized` for simple counters?
- [ ] Are thread pools properly sized and named (for debugging)?
- [ ] Are `ExecutorService` instances shut down properly?
- [ ] Is there risk of deadlock (lock ordering issues)?
- [ ] Are `CompletableFuture` chains handling exceptions with `exceptionally()` or `handle()`?
- [ ] Are race conditions possible in read-modify-write sequences?

---

## 5. Protobuf-Specific

### Schema Design
- [ ] Are field numbers stable and never reused for different semantics?
- [ ] Are deprecated fields marked with `reserved` to prevent reuse?
- [ ] Are field names in `snake_case` as per protobuf convention?
- [ ] Are enums used with an `UNSPECIFIED = 0` default value?
- [ ] Are `oneof` fields used where exactly one of several fields should be set?
- [ ] Are nested message types used to scope closely related messages?
- [ ] Are `repeated` fields used instead of separate count + values patterns?
- [ ] Are `google.protobuf.Timestamp` and `google.protobuf.Duration` used instead of raw integers for time?
- [ ] Are `google.protobuf.FieldMask` used for partial update APIs?
- [ ] Are `bytes` fields used for opaque binary data, not `string`?

### Wire Compatibility & Evolution
- [ ] Is the change backward compatible? Can old readers still parse new messages?
- [ ] Is the change forward compatible? Can new readers still parse old messages?
- [ ] Are required fields avoided (proto3 doesn't support them, proto2 they're dangerous)?
- [ ] Are field numbers not changed for existing fields?
- [ ] Are field types not changed in incompatible ways (e.g., `int32` to `string`)?
- [ ] If a field is removed, is the field number `reserved`?
- [ ] Is the `.proto` file's `package` declaration correct and consistent?
- [ ] Are `import` statements using the correct paths?

### Generated Code Usage
- [ ] Is the generated Java code used correctly (using builders, not constructing with `new`)?
- [ ] Are `.toBuilder()` and `.build()` patterns used for modifications?
- [ ] Are `hasField()` checks used before accessing optional fields?
- [ ] Is `.getDefaultInstance()` used instead of `null` for absent messages?
- [ ] Are proto messages not used as map keys (they're mutable)?
- [ ] Is serialization/deserialization done with the correct methods (`toByteArray()`, `parseFrom()`)?

---

## 6. API Design (gRPC / REST)

- [ ] Are RPC methods named with verbs describing the action (`CreateUser`, `ListOrders`)?
- [ ] Are request/response messages appropriately structured and not overly generic?
- [ ] Are pagination fields included for list endpoints (`page_token`, `page_size`)?
- [ ] Are idempotency keys used for mutating operations where appropriate?
- [ ] Are error codes/status codes used correctly (gRPC status codes, HTTP status codes)?
- [ ] Are API changes documented in relevant API docs or changelogs?
- [ ] Are timeouts and deadlines set appropriately?
- [ ] Is input validation done early and comprehensively?

---

## 7. Monorepo-Specific Concerns

- [ ] Does the change respect module/package boundaries?
- [ ] Are cross-module dependencies introduced intentionally and reviewed by owning teams?
- [ ] Is the build still fast? Are unnecessary dependencies added to the build graph?
- [ ] Are shared libraries versioned or pinned appropriately?
- [ ] Does the change affect other modules' builds or tests unexpectedly?
- [ ] Are internal vs. public APIs clearly separated (`internal` packages, `@VisibleForTesting`)?
- [ ] Is the change in the correct module, or should it be in a shared library?
- [ ] Are generated files checked in or generated at build time consistently with repo conventions?

---

## 8. Testing

- [ ] Are there unit tests for new logic?
- [ ] Are tests testing behavior, not implementation details?
- [ ] Are edge cases covered (null inputs, empty collections, boundary values)?
- [ ] Are test names descriptive (`shouldReturnEmptyListWhenNoUsersExist`)?
- [ ] Are mocks used appropriately (not over-mocking, not mocking value objects)?
- [ ] Are integration tests added for cross-module or database interactions?
- [ ] Are proto serialization round-trip tests included for schema changes?
- [ ] Are flaky test patterns avoided (no `Thread.sleep()`, no reliance on ordering)?
- [ ] Is test data constructed with builders/factories, not long constructors?
- [ ] Are assertions specific (`assertEquals` > `assertTrue`, AssertJ > Hamcrest)?
- [ ] Are `@ParameterizedTest` or data-driven tests used for repetitive test cases?
- [ ] Are test fixtures and shared setup in `@BeforeEach`, not in each test method?

---

## 9. Performance & Scalability

- [ ] Are database queries efficient? Are N+1 query patterns avoided?
- [ ] Are appropriate indexes in place for new queries?
- [ ] Is pagination used for large result sets?
- [ ] Are caches used where appropriate, with proper invalidation?
- [ ] Are large proto messages avoided in hot paths (serialization cost)?
- [ ] Are `repeated` proto fields bounded in practice (max list sizes)?
- [ ] Is lazy initialization used for expensive objects?
- [ ] Are connection pools, thread pools, and resource pools properly configured?
- [ ] Are logging levels appropriate (`DEBUG` for verbose, `INFO` for operational, `WARN`/`ERROR` for problems)?
- [ ] Is logging not done inside tight loops?

---

## 10. Security

- [ ] Is user input validated and sanitized?
- [ ] Are SQL queries parameterized (no string concatenation)?
- [ ] Are sensitive fields (passwords, tokens, PII) not logged?
- [ ] Are authentication and authorization checks in place for new endpoints?
- [ ] Are secrets not hardcoded (use environment variables or secret managers)?
- [ ] Are dependency versions free of known vulnerabilities?
- [ ] Are proto fields containing sensitive data annotated or documented?
- [ ] Is data encrypted in transit (TLS) and at rest where required?

---

## 11. Observability & Operations

- [ ] Are new metrics, traces, or logs added for new features?
- [ ] Are structured logging fields used (not string interpolation in log messages)?
- [ ] Are alerts or dashboards updated for new failure modes?
- [ ] Are feature flags used for gradual rollout of risky changes?
- [ ] Are migration scripts idempotent and backward compatible?
- [ ] Is there a rollback plan for the change?
- [ ] Are health checks updated if dependencies change?

---

## 12. Documentation

- [ ] Are Javadoc comments added for public APIs?
- [ ] Are proto field comments clear about semantics, units, and constraints?
- [ ] Are complex algorithms or business rules explained in comments?
- [ ] Is the README or internal wiki updated for architectural changes?
- [ ] Are breaking changes called out in the PR description?

\newpage

# Code Review Checklist: JavaScript/TypeScript + React + Node

---

## 1. General Code Quality

- [ ] Does the PR have a clear description of what it does and why?
- [ ] Is the change scoped appropriately, or should it be split into smaller PRs?
- [ ] Are there any unrelated changes bundled in?
- [ ] Is dead code removed rather than commented out?
- [ ] Are TODO/FIXME comments accompanied by a tracking ticket?
- [ ] Does the commit history tell a coherent story?

---

## 2. TypeScript & Type Safety

### Type Definitions
- [ ] Are types defined for all function parameters and return values?
- [ ] Are `any` and `unknown` avoided unless absolutely necessary and documented?
- [ ] Are type assertions (`as`) minimized and justified?
- [ ] Are union types and discriminated unions used instead of `any` for flexible data?
- [ ] Are `interface` vs `type` used consistently with project conventions?
- [ ] Are generic types used where they add value (reusable functions, data structures)?
- [ ] Are optional properties (`?`) distinguished from nullable properties (`| null`)?
- [ ] Are `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,V>` used instead of duplicating types?
- [ ] Are enums used appropriately, or would `as const` objects be more idiomatic?
- [ ] Are shared types in a central location, not duplicated across files?
- [ ] Is `strict: true` being honored (no `@ts-ignore` without explanation)?

### Type Guards & Narrowing
- [ ] Are custom type guards (`is` return type) used for complex type narrowing?
- [ ] Are `typeof`, `instanceof`, and `in` checks used correctly for narrowing?
- [ ] Are exhaustiveness checks (`never`) used in switch statements on union types?

---

## 3. JavaScript Fundamentals

- [ ] Is `const` preferred over `let`, and `let` over `var`?
- [ ] Are strict equality (`===`, `!==`) used instead of loose equality?
- [ ] Are template literals used instead of string concatenation?
- [ ] Are destructuring and spread operators used appropriately (not overused)?
- [ ] Are `async/await` patterns used instead of raw `.then()` chains?
- [ ] Are `Promise.all()` / `Promise.allSettled()` used for concurrent async operations?
- [ ] Are unhandled promise rejections avoided (missing `catch`, missing `await`)?
- [ ] Are `for...of` loops used instead of `for...in` for arrays?
- [ ] Are array methods (`map`, `filter`, `reduce`) used where clearer than loops?
- [ ] Is `reduce` avoided when it hurts readability (prefer `map` + `filter`)?
- [ ] Are nullish coalescing (`??`) and optional chaining (`?.`) used instead of `||` and `&&` checks?
- [ ] Are `Map` and `Set` used instead of plain objects where semantically appropriate?
- [ ] Are closures and variable scoping correct (no stale closure bugs)?

---

## 4. React Components

### Component Design
- [ ] Are components small and focused on a single responsibility?
- [ ] Is the component tree structured to minimize unnecessary re-renders?
- [ ] Are presentational and container concerns separated appropriately?
- [ ] Are compound components or render props used instead of overly complex prop drilling?
- [ ] Are component files co-located with their styles, tests, and types?
- [ ] Are default exports avoided in favor of named exports for better refactoring support?

### Props & State
- [ ] Are prop types well-defined with TypeScript interfaces?
- [ ] Are required vs optional props distinguished correctly?
- [ ] Are callback props named with `on` prefix (`onClick`, `onSubmit`)?
- [ ] Is state kept as local as possible (lifted only when necessary)?
- [ ] Is derived state computed during render, not stored in state?
- [ ] Are controlled vs uncontrolled components chosen intentionally?
- [ ] Is state shape flat and normalized (no deeply nested state objects)?

### Hooks
- [ ] Are hooks called at the top level only (not inside conditions, loops, or nested functions)?
- [ ] Are `useEffect` dependency arrays correct and complete?
- [ ] Are cleanup functions returned from `useEffect` where needed (subscriptions, timers, event listeners)?
- [ ] Is `useEffect` not used for things computable from state/props (use `useMemo` or compute inline)?
- [ ] Are `useMemo` and `useCallback` used appropriately (not prematurely, but where re-renders are costly)?
- [ ] Are `useRef` values not used in dependency arrays (they don't trigger re-renders)?
- [ ] Are custom hooks extracted for reusable stateful logic?
- [ ] Are custom hooks prefixed with `use`?
- [ ] Is `useState` used for values that should trigger a re-render, `useRef` for values that shouldn't?

### Rendering
- [ ] Are `key` props stable, unique, and not using array indices (unless list is static)?
- [ ] Are conditional renders clean (ternary for simple, early return for complex)?
- [ ] Is `&&` rendering guarded against falsy values rendering `0` or `""` (`count && <X/>` bug)?
- [ ] Are fragments (`<>...</>`) used instead of unnecessary wrapper `<div>`s?
- [ ] Are large lists virtualized (react-window, react-virtuoso) when rendering 100+ items?
- [ ] Are inline object/array literals avoided in JSX props (creates new references each render)?
- [ ] Is `dangerouslySetInnerHTML` avoided or sanitized if used?

### Context & State Management
- [ ] Is React Context used for truly global state, not for prop drilling avoidance in shallow trees?
- [ ] Are context values memoized to prevent unnecessary re-renders?
- [ ] Are context providers placed as low in the tree as possible?
- [ ] Is the state management library (Redux, Zustand, Jotai, etc.) used consistently with project patterns?
- [ ] Are selectors used to read only necessary slices of state?
- [ ] Are actions/mutations named clearly and consistently?

---

## 5. Node.js Backend

### Server & Routing
- [ ] Are routes organized logically (by resource, not by HTTP method)?
- [ ] Are route handlers thin (delegate to services/controllers)?
- [ ] Are middleware functions ordered correctly (auth before business logic)?
- [ ] Are request bodies validated and parsed with a schema validator (Zod, Joi, Yup)?
- [ ] Are HTTP status codes used correctly (201 for creation, 204 for no content, 404 for not found)?
- [ ] Are consistent error response shapes used across all endpoints?

### Async Patterns
- [ ] Are all async operations properly awaited?
- [ ] Are errors in async middleware caught (express-async-errors or try/catch)?
- [ ] Are database transactions used for multi-step mutations?
- [ ] Are long-running operations offloaded to background jobs/queues?
- [ ] Are connection pools used for databases and external services?
- [ ] Are timeouts set on external HTTP calls?

### Error Handling
- [ ] Is there a global error handler middleware?
- [ ] Are operational errors (expected) distinguished from programmer errors (bugs)?
- [ ] Are error responses not leaking stack traces or internal details to clients?
- [ ] Are errors logged with sufficient context (request ID, user ID, operation)?
- [ ] Are unhandled rejections and uncaught exceptions handled at the process level?

### Security (Node-specific)
- [ ] Are environment variables used for secrets (not hardcoded)?
- [ ] Is CORS configured correctly (not `*` in production)?
- [ ] Are rate limiters in place for public endpoints?
- [ ] Are request body size limits set?
- [ ] Is input sanitized to prevent NoSQL injection, XSS, and path traversal?
- [ ] Are authentication tokens validated on every request (JWT expiry, signature)?
- [ ] Are passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA)?
- [ ] Are HTTP security headers set (Helmet.js or equivalent)?
- [ ] Are file uploads validated (type, size, filename sanitization)?

---

## 6. Frontend-Specific Concerns

### Styling
- [ ] Are styles scoped to components (CSS modules, styled-components, Tailwind)?
- [ ] Are magic numbers in CSS extracted to design tokens or variables?
- [ ] Is responsive design considered (mobile-first, breakpoints)?
- [ ] Are dark mode / theme tokens used instead of hardcoded colors?
- [ ] Are CSS animations using `transform` and `opacity` for performance?

### Accessibility (a11y)
- [ ] Do interactive elements have accessible names (labels, aria-label)?
- [ ] Are semantic HTML elements used (`<button>`, `<nav>`, `<main>`, not `<div onClick>`)?
- [ ] Is keyboard navigation supported (focus management, tab order)?
- [ ] Are ARIA roles and attributes used correctly (not redundant with semantic HTML)?
- [ ] Are color contrast ratios sufficient (WCAG AA minimum)?
- [ ] Are loading and error states announced to screen readers (aria-live regions)?
- [ ] Are form inputs associated with labels (`htmlFor` / `id`)?
- [ ] Are images with content meaning given `alt` text? Are decorative images `alt=""`?

### Performance
- [ ] Are images optimized (WebP/AVIF, lazy loading, responsive `srcSet`)?
- [ ] Are large dependencies evaluated for bundle size impact?
- [ ] Is code splitting used for routes and heavy components (`React.lazy`, dynamic `import()`)?
- [ ] Are network requests deduplicated and cached (React Query, SWR, Apollo)?
- [ ] Are web vitals considered (LCP, FID/INP, CLS)?
- [ ] Are expensive computations moved to web workers or debounced/throttled?
- [ ] Are fonts loaded efficiently (preload, `font-display: swap`)?

### Browser & Network
- [ ] Are API calls handled with loading, error, and empty states?
- [ ] Is optimistic UI used for instant-feeling mutations where appropriate?
- [ ] Are network errors handled gracefully (retry, offline state)?
- [ ] Are stale-while-revalidate patterns used for frequently accessed data?
- [ ] Are local storage / session storage values namespaced and size-bounded?

---

## 7. Testing

### Unit Tests
- [ ] Are there unit tests for new utility functions and hooks?
- [ ] Are tests testing behavior, not implementation?
- [ ] Are edge cases covered (empty arrays, null, undefined, boundary values)?
- [ ] Are test names descriptive (`it("should show error when email is invalid")`)?
- [ ] Are mocks scoped to the test and cleaned up (`jest.restoreAllMocks()`)?

### Component Tests
- [ ] Are React components tested with Testing Library (not Enzyme)?
- [ ] Are queries using accessible selectors (`getByRole`, `getByLabelText`) not `getByTestId`?
- [ ] Are user interactions simulated with `userEvent`, not `fireEvent`?
- [ ] Are async state changes awaited with `waitFor` or `findBy`?
- [ ] Are snapshot tests avoided or used sparingly and intentionally?

### Integration & E2E Tests
- [ ] Are API endpoints tested with supertest or similar?
- [ ] Are critical user flows covered by E2E tests (Playwright, Cypress)?
- [ ] Are E2E tests not brittle (no hardcoded waits, stable selectors)?
- [ ] Are test database fixtures managed properly (seeding, cleanup)?

### Test Quality
- [ ] Are tests independent (no reliance on execution order)?
- [ ] Are test utilities and custom render functions used to reduce boilerplate?
- [ ] Are `beforeEach`/`afterEach` used for setup/teardown, not repeated in each test?
- [ ] Is test coverage adequate for the change (not chasing 100%, but covering important paths)?

---

## 8. Module & Dependency Management

- [ ] Are new dependencies justified and vetted (maintained, small, secure)?
- [ ] Are dependency versions pinned or using lockfiles (`package-lock.json`, `yarn.lock`)?
- [ ] Are peer dependency warnings resolved?
- [ ] Are circular dependencies avoided?
- [ ] Are barrel files (`index.ts`) not causing excessive bundling?
- [ ] Are imports organized consistently (external, internal, relative)?
- [ ] Are unused dependencies removed?
- [ ] Are dev dependencies vs production dependencies classified correctly?

---

## 9. API Design & Data Flow

- [ ] Are REST conventions followed (resource nouns, HTTP verbs, proper status codes)?
- [ ] Are request/response schemas versioned or backward compatible?
- [ ] Are API types shared between frontend and backend (monorepo) or generated from OpenAPI/GraphQL?
- [ ] Are pagination, filtering, and sorting implemented for list endpoints?
- [ ] Are N+1 query patterns avoided in GraphQL resolvers (use DataLoader)?
- [ ] Is data normalized on the client or server as appropriate?

---

## 10. Security (General)

- [ ] Is user input validated on both client and server?
- [ ] Are XSS vectors mitigated (no `dangerouslySetInnerHTML` with user content)?
- [ ] Are CSRF protections in place for state-changing requests?
- [ ] Are authentication and authorization checked for every protected route (both frontend guards and backend middleware)?
- [ ] Are secrets absent from client-side code and git history?
- [ ] Are third-party scripts evaluated for security (CDN integrity hashes)?
- [ ] Are Content Security Policy headers configured?
- [ ] Are file paths sanitized to prevent directory traversal?

---

## 11. Observability & Operations

- [ ] Are structured logs used (JSON format, correlation IDs)?
- [ ] Are new features behind feature flags for safe rollout?
- [ ] Are health check endpoints updated if dependencies change?
- [ ] Are metrics tracked for new API endpoints (latency, error rate)?
- [ ] Are Sentry/error tracking breadcrumbs meaningful?
- [ ] Are database migrations reversible?
- [ ] Are environment-specific configurations handled correctly (dev/staging/prod)?

---

## 12. Documentation

- [ ] Are JSDoc comments added for exported functions and complex logic?
- [ ] Are README files updated for new setup steps or environment variables?
- [ ] Are API endpoints documented (OpenAPI/Swagger, GraphQL schema)?
- [ ] Are breaking changes called out in the PR description?
- [ ] Are Storybook stories added for new UI components?

\newpage

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
