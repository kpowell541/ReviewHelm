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
