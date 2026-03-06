# Java/Kotlin + Protobuf Monorepo — Code Review Checklist

☕ Review checklist for Java, Kotlin, and Protobuf monorepo projects
Total items: 129  |  Version: 1.0.0

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
3. [MIN] Are there any unrelated changes bundled in (drive-by fixes, formatting-only diffs)?  `general`
4. [MIN] Does the commit history tell a coherent story? Are commits atomic and well-messaged?  `protobuf`
5. [NIT] Is dead code removed rather than commented out?  `code-quality` `documentation`
6. [NIT] Are TODO/FIXME comments accompanied by a tracking ticket?  `code-quality` `documentation`

## Java Language & Style

### Naming & Readability

7. [NIT] Are class, method, and variable names descriptive and consistent with project conventions?  `naming` `code-quality` `accessibility`
8. [NIT] Do method names clearly describe their behavior (e.g., `findUserById` vs `getUser`)?  `naming` `code-quality`
9. [NIT] Are boolean variables/methods named with `is`, `has`, `should`, `can` prefixes?  `naming` `code-quality` `accessibility`
10. [NIT] Are constants in `UPPER_SNAKE_CASE` and class names in `PascalCase`?  `naming` `code-quality`
11. [NIT] Are abbreviations avoided in names unless they are universally understood?  `naming` `code-quality`

### Object-Oriented Design

12. [NIT] Is the class doing too much? Does it violate the Single Responsibility Principle?  `general`
13. [NIT] Are fields and methods using the narrowest possible access modifier (`private` > `package-private` > `protected` > `public`)?  `protobuf`
14. [NIT] Is inheritance used appropriately, or would composition be a better fit?  `react`
15. [NIT] Are abstract classes and interfaces used to define contracts, not just to share code?  `types`
16. [NIT] Are utility/helper classes kept to a minimum and well-justified?  `general`

### Java-Specific Patterns

17. [NIT] Are `Optional` return types used instead of returning `null` from methods?  `types` `null-safety`
18. [NIT] Is `Optional.get()` avoided in favor of `orElse()`, `orElseThrow()`, `ifPresent()`, `map()`?  `error-handling` `types` `null-safety`
19. [NIT] Are streams used appropriately (not overly complex, not replacing simple loops unnecessarily)?  `react`
20. [NIT] Are `var` declarations used only where the type is obvious from the right-hand side?  `types`
21. [NIT] Is `equals()` and `hashCode()` overridden together when either is overridden?  `general`
22. [NIT] Are immutable objects preferred? Are fields `final` where possible?  `protobuf`
23. [NIT] Are builder patterns used for objects with many constructor parameters?  `general`
24. [NIT] Is `StringBuilder` used for string concatenation in loops?  `general`

### Collections & Generics

25. [NIT] Are the correct collection types chosen (`List` vs `Set` vs `Map`, `ArrayList` vs `LinkedList`)?  `types`
26. [NIT] Are collections returned as unmodifiable views when callers shouldn't modify them?  `types`
27. [NIT] Are raw types avoided (always use `List<String>`, never just `List`)?  `types`
28. [NIT] Are wildcard generics (`? extends`, `? super`) used correctly?  `types`
29. [NIT] Are empty collections returned instead of `null` (e.g., `Collections.emptyList()`)?  `types` `null-safety`

## Error Handling & Resilience

30. [MAJ] Are checked exceptions used for recoverable conditions and unchecked for programming errors?  `error-handling`
31. [MAJ] Are exceptions caught at the appropriate level (not too broad, not swallowed)?  `error-handling` `react`
32. [MAJ] Are catch blocks doing something meaningful (logging, wrapping, rethrowing), not just `e.printStackTrace()`?  `error-handling` `concurrency`
33. [MAJ] Are custom exception classes used where they add semantic value?  `error-handling` `accessibility`
34. [MAJ] Is `finally` or try-with-resources used for resource cleanup (streams, connections, locks)?  `error-handling` `concurrency` `resource-management`
35. [MAJ] Are `catch (Exception e)` or `catch (Throwable t)` blocks justified and documented?  `error-handling` `concurrency` `documentation`
36. [MAJ] Are error messages descriptive enough for debugging (include relevant IDs, state)?  `error-handling` `protobuf` `react`
37. [MAJ] Are retries implemented with backoff and bounded attempts?  `error-handling`
38. [MAJ] Is `@Nullable` / `@NonNull` annotated consistently?  `error-handling` `null-safety`

## Concurrency & Threading

39. [MAJ] Are shared mutable state accesses properly synchronized?  `concurrency` `react`
40. [MAJ] Is `ConcurrentHashMap` used instead of `synchronizedMap` where appropriate?  `concurrency` `react`
41. [MAJ] Are `volatile` fields used correctly for visibility guarantees?  `concurrency` `protobuf`
42. [MAJ] Are `AtomicInteger`, `AtomicReference`, etc. preferred over `synchronized` for simple counters?  `concurrency`
43. [MAJ] Are thread pools properly sized and named (for debugging)?  `concurrency` `performance` `naming` `react`
44. [MAJ] Are `ExecutorService` instances shut down properly?  `concurrency` `react`
45. [BLK] Is there risk of deadlock (lock ordering issues)?  `concurrency`
46. [MAJ] Are `CompletableFuture` chains handling exceptions with `exceptionally()` or `handle()`?  `error-handling` `concurrency`
47. [BLK] Are race conditions possible in read-modify-write sequences?  `concurrency`

## Protobuf-Specific

### Schema Design

48. [MIN] Are field numbers stable and never reused for different semantics?  `protobuf` `accessibility`
49. [MIN] Are deprecated fields marked with `reserved` to prevent reuse?  `protobuf`
50. [MIN] Are field names in `snake_case` as per protobuf convention?  `naming` `protobuf`
51. [MIN] Are enums used with an `UNSPECIFIED = 0` default value?  `types` `protobuf`
52. [MIN] Are `oneof` fields used where exactly one of several fields should be set?  `protobuf`
53. [MIN] Are nested message types used to scope closely related messages?  `types` `resource-management` `protobuf`
54. [MIN] Are `repeated` fields used instead of separate count + values patterns?  `protobuf`
55. [MIN] Are `google.protobuf.Timestamp` and `google.protobuf.Duration` used instead of raw integers for time?  `protobuf`
56. [MIN] Are `google.protobuf.FieldMask` used for partial update APIs?  `api-design` `protobuf`
57. [MIN] Are `bytes` fields used for opaque binary data, not `string`?  `protobuf`

### Wire Compatibility & Evolution

58. [MAJ] Is the change backward compatible? Can old readers still parse new messages?  `protobuf`
59. [MIN] Is the change forward compatible? Can new readers still parse old messages?  `protobuf`
60. [MIN] Are required fields avoided (proto3 doesn't support them, proto2 they're dangerous)?  `protobuf`
61. [MIN] Are field numbers not changed for existing fields?  `protobuf`
62. [MIN] Are field types not changed in incompatible ways (e.g., `int32` to `string`)?  `types` `protobuf`
63. [MIN] If a field is removed, is the field number `reserved`?  `protobuf`
64. [MIN] Is the `.proto` file's `package` declaration correct and consistent?  `protobuf`
65. [MIN] Are `import` statements using the correct paths?  `protobuf` `react`

### Generated Code Usage

66. [MIN] Is the generated Java code used correctly (using builders, not constructing with `new`)?  `protobuf`
67. [MIN] Are `.toBuilder()` and `.build()` patterns used for modifications?  `protobuf`
68. [MIN] Are `hasField()` checks used before accessing optional fields?  `types` `null-safety` `protobuf`
69. [MIN] Is `.getDefaultInstance()` used instead of `null` for absent messages?  `null-safety` `protobuf`
70. [MIN] Are proto messages not used as map keys (they're mutable)?  `protobuf`
71. [MIN] Is serialization/deserialization done with the correct methods (`toByteArray()`, `parseFrom()`)?  `protobuf`

## API Design (gRPC / REST)

72. [MIN] Are RPC methods named with verbs describing the action (`CreateUser`, `ListOrders`)?  `api-design` `naming`
73. [MIN] Are request/response messages appropriately structured and not overly generic?  `api-design` `types` `protobuf` `react`
74. [MIN] Are pagination fields included for list endpoints (`page_token`, `page_size`)?  `security` `api-design` `protobuf`
75. [MIN] Are idempotency keys used for mutating operations where appropriate?  `api-design` `react`
76. [MIN] Are error codes/status codes used correctly (gRPC status codes, HTTP status codes)?  `error-handling` `api-design`
77. [MIN] Are API changes documented in relevant API docs or changelogs?  `api-design` `documentation`
78. [MIN] Are timeouts and deadlines set appropriately?  `api-design` `react`
79. [MIN] Is input validation done early and comprehensively?  `api-design`

## Monorepo-Specific Concerns

80. [MIN] Does the change respect module/package boundaries?  `general`
81. [MIN] Are cross-module dependencies introduced intentionally and reviewed by owning teams?  `general`
82. [MIN] Is the build still fast? Are unnecessary dependencies added to the build graph?  `general`
83. [MIN] Are shared libraries versioned or pinned appropriately?  `react`
84. [MAJ] Does the change affect other modules' builds or tests unexpectedly?  `testing`
85. [MAJ] Are internal vs. public APIs clearly separated (`internal` packages, `@VisibleForTesting`)?  `testing` `api-design`
86. [MIN] Is the change in the correct module, or should it be in a shared library?  `general`
87. [MIN] Are generated files checked in or generated at build time consistently with repo conventions?  `naming`

## Testing

88. [MAJ] Are there unit tests for new logic?  `testing`
89. [MAJ] Are tests testing behavior, not implementation details?  `testing`
90. [MAJ] Are edge cases covered (null inputs, empty collections, boundary values)?  `testing` `null-safety`
91. [MAJ] Are test names descriptive (`shouldReturnEmptyListWhenNoUsersExist`)?  `testing` `naming`
92. [MAJ] Are mocks used appropriately (not over-mocking, not mocking value objects)?  `testing` `react`
93. [MAJ] Are integration tests added for cross-module or database interactions?  `testing`
94. [MAJ] Are proto serialization round-trip tests included for schema changes?  `testing` `protobuf`
95. [MAJ] Are flaky test patterns avoided (no `Thread.sleep()`, no reliance on ordering)?  `concurrency` `testing`
96. [MAJ] Is test data constructed with builders/factories, not long constructors?  `testing`
97. [MAJ] Are assertions specific (`assertEquals` > `assertTrue`, AssertJ > Hamcrest)?  `testing` `api-design`
98. [MAJ] Are `@ParameterizedTest` or data-driven tests used for repetitive test cases?  `testing`
99. [MAJ] Are test fixtures and shared setup in `@BeforeEach`, not in each test method?  `testing`

## Performance & Scalability

100. [MIN] Are database queries efficient? Are N+1 query patterns avoided?  `performance`
101. [MIN] Are appropriate indexes in place for new queries?  `performance` `react`
102. [MIN] Is pagination used for large result sets?  `performance`
103. [MIN] Are caches used where appropriate, with proper invalidation?  `performance` `react`
104. [MIN] Are large proto messages avoided in hot paths (serialization cost)?  `performance` `protobuf`
105. [MIN] Are `repeated` proto fields bounded in practice (max list sizes)?  `performance` `protobuf`
106. [MIN] Is lazy initialization used for expensive objects?  `performance`
107. [MAJ] Are connection pools, thread pools, and resource pools properly configured?  `concurrency` `performance` `resource-management` `react`
108. [MIN] Are logging levels appropriate (`DEBUG` for verbose, `INFO` for operational, `WARN`/`ERROR` for problems)?  `error-handling` `performance` `react`
109. [MIN] Is logging not done inside tight loops?  `performance`

## Security

110. [BLK] Is user input validated and sanitized?  `security`
111. [BLK] Are SQL queries parameterized (no string concatenation)?  `security`
112. [BLK] Are sensitive fields (passwords, tokens, PII) not logged?  `security` `protobuf`
113. [BLK] Are authentication and authorization checks in place for new endpoints?  `security` `api-design`
114. [BLK] Are secrets not hardcoded (use environment variables or secret managers)?  `security` `accessibility`
115. [BLK] Are dependency versions free of known vulnerabilities?  `security`
116. [BLK] Are proto fields containing sensitive data annotated or documented?  `security` `protobuf` `documentation`
117. [BLK] Is data encrypted in transit (TLS) and at rest where required?  `security` `api-design`

## Observability & Operations

118. [MIN] Are new metrics, traces, or logs added for new features?  `concurrency`
119. [MIN] Are structured logging fields used (not string interpolation in log messages)?  `protobuf`
120. [MIN] Are alerts or dashboards updated for new failure modes?  `general`
121. [MIN] Are feature flags used for gradual rollout of risky changes?  `general`
122. [MAJ] Are migration scripts idempotent and backward compatible?  `general`
123. [MIN] Is there a rollback plan for the change?  `general`
124. [MIN] Are health checks updated if dependencies change?  `general`

## Documentation

125. [NIT] Are Javadoc comments added for public APIs?  `api-design` `code-quality` `documentation`
126. [NIT] Are proto field comments clear about semantics, units, and constraints?  `code-quality` `protobuf` `accessibility` `documentation`
127. [NIT] Are complex algorithms or business rules explained in comments?  `code-quality` `documentation`
128. [NIT] Is the README or internal wiki updated for architectural changes?  `documentation`
129. [NIT] Are breaking changes called out in the PR description?  `documentation`
