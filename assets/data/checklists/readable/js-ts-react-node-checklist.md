# JavaScript/TypeScript + React + Node — Code Review Checklist

⚛️ Review checklist for JS/TS projects with React and Node.js
Total items: 171  |  Version: 1.0.0

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

## TypeScript & Type Safety

### Type Definitions

7. [MIN] Are types defined for all function parameters and return values?  `types`
8. [MIN] Are `any` and `unknown` avoided unless absolutely necessary and documented?  `types` `documentation`
9. [MIN] Are type assertions (`as`) minimized and justified?  `testing` `types`
10. [MIN] Are union types and discriminated unions used instead of `any` for flexible data?  `types`
11. [MIN] Are `interface` vs `type` used consistently with project conventions?  `types` `naming`
12. [MIN] Are generic types used where they add value (reusable functions, data structures)?  `types`
13. [MIN] Are optional properties (`?`) distinguished from nullable properties (`| null`)?  `types` `null-safety` `react`
14. [MIN] Are `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,V>` used instead of duplicating types?  `types`
15. [MIN] Are enums used appropriately, or would `as const` objects be more idiomatic?  `types` `react`
16. [MIN] Are shared types in a central location, not duplicated across files?  `types`
17. [MIN] Is `strict: true` being honored (no `@ts-ignore` without explanation)?  `types`

### Type Guards & Narrowing

18. [MIN] Are custom type guards (`is` return type) used for complex type narrowing?  `types`
19. [MIN] Are `typeof`, `instanceof`, and `in` checks used correctly for narrowing?  `types`
20. [MIN] Are exhaustiveness checks (`never`) used in switch statements on union types?  `types` `react`

## JavaScript Fundamentals

21. [MIN] Is `const` preferred over `let`, and `let` over `var`?  `general`
22. [MIN] Are strict equality (`===`, `!==`) used instead of loose equality?  `general`
23. [MIN] Are template literals used instead of string concatenation?  `general`
24. [MIN] Are destructuring and spread operators used appropriately (not overused)?  `react`
25. [MIN] Are `async/await` patterns used instead of raw `.then()` chains?  `concurrency`
26. [MAJ] Are `Promise.all()` / `Promise.allSettled()` used for concurrent async operations?  `concurrency`
27. [MIN] Are unhandled promise rejections avoided (missing `catch`, missing `await`)?  `error-handling`
28. [MIN] Are `for...of` loops used instead of `for...in` for arrays?  `general`
29. [MIN] Are array methods (`map`, `filter`, `reduce`) used where clearer than loops?  `general`
30. [NIT] Is `reduce` avoided when it hurts readability (prefer `map` + `filter`)?  `code-quality`
31. [MIN] Are nullish coalescing (`??`) and optional chaining (`?.`) used instead of `||` and `&&` checks?  `types` `null-safety`
32. [MIN] Are `Map` and `Set` used instead of plain objects where semantically appropriate?  `react` `accessibility`
33. [MIN] Are closures and variable scoping correct (no stale closure bugs)?  `accessibility`

## React Components

### Component Design

34. [MIN] Are components small and focused on a single responsibility?  `react`
35. [MIN] Is the component tree structured to minimize unnecessary re-renders?  `react`
36. [MIN] Are presentational and container concerns separated appropriately?  `react`
37. [MIN] Are compound components or render props used instead of overly complex prop drilling?  `react`
38. [MAJ] Are component files co-located with their styles, tests, and types?  `testing` `types` `react`
39. [MIN] Are default exports avoided in favor of named exports for better refactoring support?  `naming` `react`

### Props & State

40. [MIN] Are prop types well-defined with TypeScript interfaces?  `types` `react`
41. [MIN] Are required vs optional props distinguished correctly?  `types` `null-safety` `react`
42. [MIN] Are callback props named with `on` prefix (`onClick`, `onSubmit`)?  `naming` `react`
43. [MIN] Is state kept as local as possible (lifted only when necessary)?  `react`
44. [MIN] Is derived state computed during render, not stored in state?  `react`
45. [MIN] Are controlled vs uncontrolled components chosen intentionally?  `react`
46. [MIN] Is state shape flat and normalized (no deeply nested state objects)?  `react`

### Hooks

47. [MIN] Are hooks called at the top level only (not inside conditions, loops, or nested functions)?  `react`
48. [MIN] Are `useEffect` dependency arrays correct and complete?  `react`
49. [MIN] Are cleanup functions returned from `useEffect` where needed (subscriptions, timers, event listeners)?  `resource-management` `react`
50. [MIN] Is `useEffect` not used for things computable from state/props (use `useMemo` or compute inline)?  `react`
51. [MIN] Are `useMemo` and `useCallback` used appropriately (not prematurely, but where re-renders are costly)?  `react`
52. [MIN] Are `useRef` values not used in dependency arrays (they don't trigger re-renders)?  `react`
53. [MIN] Are custom hooks extracted for reusable stateful logic?  `react`
54. [MIN] Are custom hooks prefixed with `use`?  `naming` `react`
55. [MIN] Is `useState` used for values that should trigger a re-render, `useRef` for values that shouldn't?  `react`

### Rendering

56. [MIN] Are `key` props stable, unique, and not using array indices (unless list is static)?  `react`
57. [MIN] Are conditional renders clean (ternary for simple, early return for complex)?  `react`
58. [MIN] Is `&&` rendering guarded against falsy values rendering `0` or `""` (`count && <X/>` bug)?  `react`
59. [MIN] Are fragments (`<>...</>`) used instead of unnecessary wrapper `<div>`s?  `react`
60. [MIN] Are large lists virtualized (react-window, react-virtuoso) when rendering 100+ items?  `react`
61. [MIN] Are inline object/array literals avoided in JSX props (creates new references each render)?  `react`
62. [MIN] Is `dangerouslySetInnerHTML` avoided or sanitized if used?  `react`

### Context & State Management

63. [MIN] Is React Context used for truly global state, not for prop drilling avoidance in shallow trees?  `react`
64. [MIN] Are context values memoized to prevent unnecessary re-renders?  `react`
65. [MIN] Are context providers placed as low in the tree as possible?  `react`
66. [MIN] Is the state management library (Redux, Zustand, Jotai, etc.) used consistently with project patterns?  `react`
67. [MIN] Are selectors used to read only necessary slices of state?  `react`
68. [MIN] Are actions/mutations named clearly and consistently?  `naming` `react`

## Node.js Backend

### Server & Routing

69. [MIN] Are routes organized logically (by resource, not by HTTP method)?  `api-design` `resource-management` `node`
70. [MIN] Are route handlers thin (delegate to services/controllers)?  `api-design` `node`
71. [MIN] Are middleware functions ordered correctly (auth before business logic)?  `security` `node`
72. [MIN] Are request bodies validated and parsed with a schema validator (Zod, Joi, Yup)?  `protobuf` `node`
73. [MIN] Are HTTP status codes used correctly (201 for creation, 204 for no content, 404 for not found)?  `node`
74. [MIN] Are consistent error response shapes used across all endpoints?  `error-handling` `api-design` `node`

### Async Patterns

75. [MIN] Are all async operations properly awaited?  `concurrency` `react` `node`
76. [MIN] Are errors in async middleware caught (express-async-errors or try/catch)?  `error-handling` `concurrency` `node`
77. [MIN] Are database transactions used for multi-step mutations?  `concurrency` `node`
78. [MIN] Are long-running operations offloaded to background jobs/queues?  `concurrency` `node`
79. [MIN] Are connection pools used for databases and external services?  `concurrency` `performance` `resource-management` `node`
80. [MIN] Are timeouts set on external HTTP calls?  `concurrency` `node`

### Error Handling

81. [MAJ] Is there a global error handler middleware?  `error-handling` `api-design` `node`
82. [MAJ] Are operational errors (expected) distinguished from programmer errors (bugs)?  `error-handling` `node`
83. [MAJ] Are error responses not leaking stack traces or internal details to clients?  `error-handling` `concurrency` `node`
84. [MAJ] Are errors logged with sufficient context (request ID, user ID, operation)?  `error-handling` `node`
85. [MAJ] Are unhandled rejections and uncaught exceptions handled at the process level?  `error-handling` `node`

### Security (Node-specific)

86. [BLK] Are environment variables used for secrets (not hardcoded)?  `security` `node` `accessibility`
87. [BLK] Is CORS configured correctly (not `*` in production)?  `security` `node`
88. [BLK] Are rate limiters in place for public endpoints?  `security` `api-design` `node`
89. [BLK] Are request body size limits set?  `security` `node`
90. [BLK] Is input sanitized to prevent NoSQL injection, XSS, and path traversal?  `security` `node`
91. [BLK] Are authentication tokens validated on every request (JWT expiry, signature)?  `security` `node`
92. [BLK] Are passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA)?  `security` `node`
93. [BLK] Are HTTP security headers set (Helmet.js or equivalent)?  `security` `node`
94. [BLK] Are file uploads validated (type, size, filename sanitization)?  `security` `types` `naming` `node`

## Frontend-Specific Concerns

### Styling

95. [MIN] Are styles scoped to components (CSS modules, styled-components, Tailwind)?  `react`
96. [MIN] Are magic numbers in CSS extracted to design tokens or variables?  `security` `accessibility`
97. [MIN] Is responsive design considered (mobile-first, breakpoints)?  `general`
98. [MIN] Are dark mode / theme tokens used instead of hardcoded colors?  `security`
99. [MIN] Are CSS animations using `transform` and `opacity` for performance?  `performance`

### Accessibility (a11y)

100. [MIN] Do interactive elements have accessible names (labels, aria-label)?  `naming` `accessibility`
101. [MIN] Are semantic HTML elements used (`<button>`, `<nav>`, `<main>`, not `<div onClick>`)?  `accessibility`
102. [MIN] Is keyboard navigation supported (focus management, tab order)?  `accessibility`
103. [MIN] Are ARIA roles and attributes used correctly (not redundant with semantic HTML)?  `accessibility`
104. [MIN] Are color contrast ratios sufficient (WCAG AA minimum)?  `accessibility`
105. [MIN] Are loading and error states announced to screen readers (aria-live regions)?  `error-handling` `react` `accessibility`
106. [MIN] Are form inputs associated with labels (`htmlFor` / `id`)?  `accessibility`
107. [MIN] Are images with content meaning given `alt` text? Are decorative images `alt=""`?  `accessibility`

### Performance

108. [MIN] Are images optimized (WebP/AVIF, lazy loading, responsive `srcSet`)?  `performance`
109. [MIN] Are large dependencies evaluated for bundle size impact?  `performance`
110. [MIN] Is code splitting used for routes and heavy components (`React.lazy`, dynamic `import()`)?  `performance` `api-design` `react` `node`
111. [MIN] Are network requests deduplicated and cached (React Query, SWR, Apollo)?  `performance` `react`
112. [MIN] Are web vitals considered (LCP, FID/INP, CLS)?  `performance`
113. [MIN] Are expensive computations moved to web workers or debounced/throttled?  `performance`
114. [MIN] Are fonts loaded efficiently (preload, `font-display: swap`)?  `performance`

### Browser & Network

115. [MIN] Are API calls handled with loading, error, and empty states?  `error-handling` `api-design` `react`
116. [MIN] Is optimistic UI used for instant-feeling mutations where appropriate?  `react`
117. [MIN] Are network errors handled gracefully (retry, offline state)?  `error-handling` `concurrency` `react`
118. [MIN] Are stale-while-revalidate patterns used for frequently accessed data?  `general`
119. [MIN] Are local storage / session storage values namespaced and size-bounded?  `naming`

## Testing

### Unit Tests

120. [MAJ] Are there unit tests for new utility functions and hooks?  `testing` `react`
121. [MAJ] Are tests testing behavior, not implementation?  `testing`
122. [MAJ] Are edge cases covered (empty arrays, null, undefined, boundary values)?  `testing` `null-safety`
123. [MAJ] Are test names descriptive (`it("should show error when email is invalid")`)?  `error-handling` `testing` `naming`
124. [MAJ] Are mocks scoped to the test and cleaned up (`jest.restoreAllMocks()`)?  `testing` `api-design`

### Component Tests

125. [MAJ] Are React components tested with Testing Library (not Enzyme)?  `testing` `react`
126. [MAJ] Are queries using accessible selectors (`getByRole`, `getByLabelText`) not `getByTestId`?  `testing` `react` `accessibility`
127. [MAJ] Are user interactions simulated with `userEvent`, not `fireEvent`?  `testing` `react`
128. [MAJ] Are async state changes awaited with `waitFor` or `findBy`?  `concurrency` `testing` `react`
129. [MAJ] Are snapshot tests avoided or used sparingly and intentionally?  `testing` `react`

### Integration & E2E Tests

130. [MAJ] Are API endpoints tested with supertest or similar?  `testing` `api-design`
131. [MAJ] Are critical user flows covered by E2E tests (Playwright, Cypress)?  `testing`
132. [MAJ] Are E2E tests not brittle (no hardcoded waits, stable selectors)?  `testing`
133. [MAJ] Are test database fixtures managed properly (seeding, cleanup)?  `testing` `resource-management` `react`

### Test Quality

134. [MAJ] Are tests independent (no reliance on execution order)?  `testing`
135. [MAJ] Are test utilities and custom render functions used to reduce boilerplate?  `testing` `react`
136. [MAJ] Are `beforeEach`/`afterEach` used for setup/teardown, not repeated in each test?  `testing`
137. [MAJ] Is test coverage adequate for the change (not chasing 100%, but covering important paths)?  `testing`

## Module & Dependency Management

138. [MIN] Are new dependencies justified and vetted (maintained, small, secure)?  `general`
139. [MIN] Are dependency versions pinned or using lockfiles (`package-lock.json`, `yarn.lock`)?  `concurrency`
140. [MIN] Are peer dependency warnings resolved?  `general`
141. [MIN] Are circular dependencies avoided?  `general`
142. [MIN] Are barrel files (`index.ts`) not causing excessive bundling?  `performance`
143. [MIN] Are imports organized consistently (external, internal, relative)?  `general`
144. [MIN] Are unused dependencies removed?  `general`
145. [MIN] Are dev dependencies vs production dependencies classified correctly?  `general`

## API Design & Data Flow

146. [MIN] Are REST conventions followed (resource nouns, HTTP verbs, proper status codes)?  `api-design` `naming` `resource-management` `react`
147. [MAJ] Are request/response schemas versioned or backward compatible?  `api-design` `protobuf`
148. [MIN] Are API types shared between frontend and backend (monorepo) or generated from OpenAPI/GraphQL?  `api-design` `types`
149. [MIN] Are pagination, filtering, and sorting implemented for list endpoints?  `api-design`
150. [MIN] Are N+1 query patterns avoided in GraphQL resolvers (use DataLoader)?  `api-design`
151. [MIN] Is data normalized on the client or server as appropriate?  `api-design` `react`

## Security (General)

152. [BLK] Is user input validated on both client and server?  `security`
153. [BLK] Are XSS vectors mitigated (no `dangerouslySetInnerHTML` with user content)?  `security`
154. [BLK] Are CSRF protections in place for state-changing requests?  `security` `react`
155. [BLK] Are authentication and authorization checked for every protected route (both frontend guards and backend middleware)?  `security` `api-design` `node`
156. [BLK] Are secrets absent from client-side code and git history?  `security`
157. [BLK] Are third-party scripts evaluated for security (CDN integrity hashes)?  `security`
158. [BLK] Are Content Security Policy headers configured?  `security`
159. [BLK] Are file paths sanitized to prevent directory traversal?  `security`

## Observability & Operations

160. [MIN] Are structured logs used (JSON format, correlation IDs)?  `general`
161. [MIN] Are new features behind feature flags for safe rollout?  `general`
162. [MIN] Are health check endpoints updated if dependencies change?  `api-design`
163. [MIN] Are metrics tracked for new API endpoints (latency, error rate)?  `error-handling` `api-design`
164. [MIN] Are Sentry/error tracking breadcrumbs meaningful?  `error-handling`
165. [MIN] Are database migrations reversible?  `general`
166. [MIN] Are environment-specific configurations handled correctly (dev/staging/prod)?  `general`

## Documentation

167. [NIT] Are JSDoc comments added for exported functions and complex logic?  `code-quality` `documentation`
168. [NIT] Are README files updated for new setup steps or environment variables?  `accessibility` `documentation`
169. [NIT] Are API endpoints documented (OpenAPI/Swagger, GraphQL schema)?  `api-design` `protobuf` `documentation`
170. [NIT] Are breaking changes called out in the PR description?  `documentation`
171. [NIT] Are Storybook stories added for new UI components?  `react` `documentation`
