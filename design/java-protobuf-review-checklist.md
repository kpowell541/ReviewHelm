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
