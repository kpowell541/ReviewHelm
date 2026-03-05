const { createChecklist } = require('./create-checklist');

// 1. Swift & Objective-C
createChecklist({
  id: 'swift-objc',
  title: 'Swift & Objective-C',
  shortTitle: 'Swift/ObjC',
  description: 'Review checklist for iOS/macOS projects with Swift and Objective-C',
  icon: '🍎',
  sections: [
    {
      title: 'General Code Quality',
      items: [
        { text: 'Does the PR have a clear description of what it does and why?', severity: 'minor' },
        { text: 'Is the change scoped appropriately, or should it be split into smaller PRs?', severity: 'minor' },
        { text: 'Are there any unrelated changes bundled in?', severity: 'minor' },
        { text: 'Is dead code removed rather than commented out?', severity: 'nit' },
        { text: 'Are TODO/FIXME comments accompanied by a tracking ticket?', severity: 'nit' },
        { text: 'Does the commit history tell a coherent story?', severity: 'minor' },
      ]
    },
    {
      title: 'Swift Language & Style',
      subsections: [
        {
          title: 'Naming & Conventions',
          items: [
            { text: 'Are types and protocols in PascalCase, properties and methods in camelCase?', severity: 'nit' },
            { text: 'Are function parameters labeled clearly following Swift API design guidelines?', severity: 'nit' },
            { text: 'Are boolean properties/methods named as assertions (e.g., `isEmpty`, `hasContent`)?', severity: 'nit' },
            { text: 'Are abbreviations avoided in names unless universally understood?', severity: 'nit' },
            { text: 'Are factory methods named with `make` prefix per Swift conventions?', severity: 'nit' },
          ]
        },
        {
          title: 'Type System & Safety',
          items: [
            { text: 'Are optionals unwrapped safely (guard let, if let, nil coalescing)?', severity: 'major' },
            { text: 'Is force unwrapping (`!`) avoided unless the value is guaranteed non-nil?', severity: 'major' },
            { text: 'Are implicitly unwrapped optionals (`!`) justified and documented?', severity: 'major' },
            { text: 'Are `as!` force casts avoided in favor of `as?` with handling?', severity: 'major' },
            { text: 'Are enums with associated values used instead of loosely typed dictionaries?', severity: 'minor' },
            { text: 'Are generics used where they add value for reusability?', severity: 'minor' },
            { text: 'Are value types (struct) preferred over reference types (class) where appropriate?', severity: 'minor' },
            { text: 'Are protocol-oriented patterns used instead of deep class hierarchies?', severity: 'minor' },
          ]
        },
        {
          title: 'Swift Patterns',
          items: [
            { text: 'Are closures using `[weak self]` or `[unowned self]` to prevent retain cycles?', severity: 'major' },
            { text: 'Are trailing closure syntax and shorthand argument names used appropriately?', severity: 'nit' },
            { text: 'Are `guard` statements used for early exits instead of nested `if` blocks?', severity: 'minor' },
            { text: 'Is `defer` used for cleanup operations?', severity: 'minor' },
            { text: 'Are `lazy` properties used for expensive initialization that may not be needed?', severity: 'minor' },
            { text: 'Are computed properties used instead of getter methods?', severity: 'nit' },
            { text: 'Are extensions used to organize code by protocol conformance?', severity: 'nit' },
            { text: 'Are access modifiers (`private`, `fileprivate`, `internal`, `public`, `open`) used correctly?', severity: 'minor' },
            { text: 'Is `@discardableResult` used when function return values are intentionally ignorable?', severity: 'nit' },
          ]
        },
        {
          title: 'Collections & Functional Patterns',
          items: [
            { text: 'Are higher-order functions (map, filter, reduce, compactMap) used where clearer than loops?', severity: 'minor' },
            { text: 'Is `compactMap` used instead of `map` + `filter { $0 != nil }` for optional unwrapping?', severity: 'minor' },
            { text: 'Are `Set` and `Dictionary` used instead of arrays for lookup-heavy operations?', severity: 'minor' },
            { text: 'Is `reduce` avoided when it hurts readability?', severity: 'nit' },
          ]
        }
      ]
    },
    {
      title: 'Objective-C Interop & Legacy',
      items: [
        { text: 'Are `@objc` annotations used only where Objective-C interop is required?', severity: 'minor' },
        { text: 'Are nullability annotations (`nullable`, `nonnull`, `NS_ASSUME_NONNULL_BEGIN`) used in ObjC headers?', severity: 'minor' },
        { text: 'Are ObjC bridging headers minimal and maintained?', severity: 'minor' },
        { text: 'Are ObjC categories/extensions named to avoid method conflicts?', severity: 'minor' },
        { text: 'Is ARC (Automatic Reference Counting) used correctly with no manual retain/release?', severity: 'major' },
        { text: 'Are `NS_ENUM` and `NS_OPTIONS` used for enumerations in ObjC?', severity: 'nit' },
        { text: 'Are `instancetype` return types used instead of `id` for init and factory methods?', severity: 'nit' },
        { text: 'Is property memory semantics correct (`strong`, `weak`, `copy`, `assign`)?', severity: 'major' },
      ]
    },
    {
      title: 'Memory Management',
      items: [
        { text: 'Are retain cycles prevented (weak references in closures, delegate patterns)?', severity: 'blocker' },
        { text: 'Are delegates declared as `weak` to prevent retain cycles?', severity: 'major' },
        { text: 'Is `autoreleasepool` used for memory-intensive loops?', severity: 'minor' },
        { text: 'Are large resources (images, data) released when no longer needed?', severity: 'minor' },
        { text: 'Are Instruments (Leaks, Allocations) findings addressed?', severity: 'major' },
        { text: 'Is `deinit` implemented to clean up observations, timers, and subscriptions?', severity: 'minor' },
      ]
    },
    {
      title: 'Concurrency',
      items: [
        { text: 'Are Swift concurrency features (async/await, actors) used instead of GCD where available?', severity: 'minor' },
        { text: 'Is `@MainActor` used for UI-related code?', severity: 'major' },
        { text: 'Are data races prevented (actors, locks, serial queues)?', severity: 'blocker' },
        { text: 'Are `Task` cancellation and cooperative cancellation handled?', severity: 'minor' },
        { text: 'Is `DispatchQueue.main` used for UI updates when not using async/await?', severity: 'major' },
        { text: 'Are `Sendable` conformances correct for types shared across concurrency domains?', severity: 'minor' },
        { text: 'Are completion handlers replaced with async/await where Swift concurrency is available?', severity: 'nit' },
        { text: 'Is `TaskGroup` or `async let` used for concurrent operations instead of nested callbacks?', severity: 'minor' },
      ]
    },
    {
      title: 'UIKit & SwiftUI',
      items: [
        { text: 'Are view controllers not overly large (Massive View Controller anti-pattern)?', severity: 'minor' },
        { text: 'Are `@State`, `@Binding`, `@ObservedObject`, `@StateObject` used correctly in SwiftUI?', severity: 'major' },
        { text: 'Is `@StateObject` used for owned objects and `@ObservedObject` for injected ones?', severity: 'major' },
        { text: 'Are `ObservableObject` publishers minimal to prevent unnecessary view updates?', severity: 'minor' },
        { text: 'Is the view hierarchy structured to minimize unnecessary SwiftUI redraws?', severity: 'minor' },
        { text: 'Are storyboard/XIB changes minimal and not causing merge conflicts?', severity: 'minor' },
        { text: 'Are Auto Layout constraints correct and not causing ambiguous layouts?', severity: 'minor' },
        { text: 'Are custom views reusable and following single responsibility?', severity: 'minor' },
        { text: 'Is accessibility supported (VoiceOver labels, dynamic type, color contrast)?', severity: 'minor' },
        { text: 'Are images using asset catalogs with appropriate scale variants?', severity: 'nit' },
      ]
    },
    {
      title: 'Error Handling',
      items: [
        { text: 'Are errors modeled with Swift `Error` enums with descriptive cases?', severity: 'minor' },
        { text: 'Are `do-catch` blocks handling specific error cases, not just generic `catch`?', severity: 'minor' },
        { text: 'Are `try?` and `try!` used sparingly and justified?', severity: 'minor' },
        { text: 'Are `Result` types used for completion-handler-based async error handling?', severity: 'minor' },
        { text: 'Are error messages user-friendly for user-facing errors and detailed for developer logs?', severity: 'minor' },
        { text: 'Is `fatalError()` / `preconditionFailure()` used only for truly unrecoverable states?', severity: 'major' },
      ]
    },
    {
      title: 'Networking & Data',
      items: [
        { text: 'Are network requests using `URLSession` or a well-maintained networking library?', severity: 'minor' },
        { text: 'Are `Codable` conformances used for JSON parsing instead of manual dictionary access?', severity: 'minor' },
        { text: 'Are `CodingKeys` used when API field names differ from Swift property names?', severity: 'nit' },
        { text: 'Are network errors handled gracefully with retry and offline state?', severity: 'minor' },
        { text: 'Are API responses validated before use?', severity: 'minor' },
        { text: 'Is Core Data / SwiftData used correctly (managed object contexts, threading)?', severity: 'major' },
        { text: 'Are UserDefaults used only for simple preferences, not large data storage?', severity: 'minor' },
        { text: 'Is Keychain used for sensitive data (tokens, credentials)?', severity: 'blocker' },
      ]
    },
    {
      title: 'Testing',
      items: [
        { text: 'Are there unit tests for new logic?', severity: 'major' },
        { text: 'Are tests using XCTest or Swift Testing framework correctly?', severity: 'major' },
        { text: 'Are mocks/stubs using protocols for testability?', severity: 'minor' },
        { text: 'Are async tests using `XCTestExpectation` or Swift Testing async support?', severity: 'minor' },
        { text: 'Are UI tests added for critical user flows?', severity: 'major' },
        { text: 'Are snapshot tests used for visual regression detection?', severity: 'nit' },
        { text: 'Are test names descriptive of the expected behavior?', severity: 'minor' },
        { text: 'Are edge cases covered (nil, empty, boundary values)?', severity: 'major' },
      ]
    },
    {
      title: 'Security',
      items: [
        { text: 'Are sensitive data stored in Keychain, not UserDefaults or plain files?', severity: 'blocker' },
        { text: 'Is App Transport Security (ATS) configured correctly?', severity: 'blocker' },
        { text: 'Are SSL certificate pinning implemented for sensitive connections?', severity: 'major' },
        { text: 'Is biometric authentication (Face ID, Touch ID) implemented correctly?', severity: 'major' },
        { text: 'Are third-party SDKs vetted for privacy and data collection?', severity: 'major' },
        { text: 'Is code obfuscation considered for sensitive business logic?', severity: 'minor' },
        { text: 'Are deep link handlers validating incoming URLs?', severity: 'major' },
        { text: 'Are clipboard operations not leaking sensitive data?', severity: 'minor' },
      ]
    },
    {
      title: 'Performance & Build',
      items: [
        { text: 'Are images and assets optimized for size?', severity: 'minor' },
        { text: 'Is view rendering performance acceptable (no jank, 60fps scrolling)?', severity: 'minor' },
        { text: 'Are background tasks using appropriate APIs (BGTaskScheduler)?', severity: 'minor' },
        { text: 'Is battery usage considered (location updates, network polling)?', severity: 'minor' },
        { text: 'Are build warnings resolved?', severity: 'nit' },
        { text: 'Are unused frameworks and dependencies removed?', severity: 'minor' },
        { text: 'Is the app size reasonable (asset optimization, code stripping)?', severity: 'minor' },
        { text: 'Are CocoaPods/SPM dependencies pinned to specific versions?', severity: 'minor' },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { text: 'Are public APIs documented with doc comments (`///`)?', severity: 'nit' },
        { text: 'Are complex algorithms or business rules explained in comments?', severity: 'nit' },
        { text: 'Are breaking changes called out in the PR description?', severity: 'minor' },
        { text: 'Is the README updated for new setup steps or dependencies?', severity: 'nit' },
      ]
    }
  ]
});

// 2. HTML, CSS, Shell, Dockerfile, Groovy, XSLT
createChecklist({
  id: 'web-devops-config',
  title: 'HTML/CSS, Shell, Docker & Config',
  shortTitle: 'Web/DevOps',
  description: 'Review checklist for HTML, CSS, Shell scripts, Dockerfiles, Groovy, and XSLT',
  icon: '🐳',
  sections: [
    {
      title: 'General Code Quality',
      items: [
        { text: 'Does the PR have a clear description of what it does and why?', severity: 'minor' },
        { text: 'Is the change scoped appropriately?', severity: 'minor' },
        { text: 'Are there any unrelated changes bundled in?', severity: 'minor' },
        { text: 'Is dead code removed rather than commented out?', severity: 'nit' },
        { text: 'Are TODO/FIXME comments accompanied by a tracking ticket?', severity: 'nit' },
      ]
    },
    {
      title: 'HTML',
      subsections: [
        {
          title: 'Structure & Semantics',
          items: [
            { text: 'Are semantic HTML elements used (header, nav, main, article, section, footer)?', severity: 'minor' },
            { text: 'Is the document structure valid (proper nesting, required elements)?', severity: 'minor' },
            { text: 'Are heading levels sequential and not skipped (h1 -> h2 -> h3)?', severity: 'minor' },
            { text: 'Are IDs unique within the document?', severity: 'minor' },
            { text: 'Are forms using proper input types (email, tel, number, date)?', severity: 'minor' },
            { text: 'Are form inputs associated with labels?', severity: 'minor' },
          ]
        },
        {
          title: 'Accessibility',
          items: [
            { text: 'Are images with content meaning given alt text? Decorative images have alt=""?', severity: 'minor' },
            { text: 'Are ARIA attributes used correctly and not redundant with semantic HTML?', severity: 'minor' },
            { text: 'Is keyboard navigation supported for interactive elements?', severity: 'minor' },
            { text: 'Are color contrast ratios sufficient (WCAG AA)?', severity: 'minor' },
            { text: 'Is the language attribute set on the html element?', severity: 'nit' },
          ]
        },
        {
          title: 'Performance & SEO',
          items: [
            { text: 'Are scripts deferred or placed at the bottom of the body?', severity: 'minor' },
            { text: 'Are meta tags (viewport, description, charset) present and correct?', severity: 'minor' },
            { text: 'Are Open Graph and social meta tags included where applicable?', severity: 'nit' },
            { text: 'Is inline styling avoided in favor of external stylesheets?', severity: 'nit' },
          ]
        }
      ]
    },
    {
      title: 'CSS',
      subsections: [
        {
          title: 'Organization & Maintainability',
          items: [
            { text: 'Are styles organized logically (by component, by page, by concern)?', severity: 'minor' },
            { text: 'Are CSS custom properties (variables) used for repeated values?', severity: 'minor' },
            { text: 'Are magic numbers avoided in favor of design tokens or variables?', severity: 'minor' },
            { text: 'Are selectors specific but not over-specific (avoid long selector chains)?', severity: 'minor' },
            { text: 'Are `!important` declarations avoided except for utility overrides?', severity: 'minor' },
            { text: 'Are naming conventions consistent (BEM, utility-first, etc.)?', severity: 'nit' },
          ]
        },
        {
          title: 'Layout & Responsiveness',
          items: [
            { text: 'Are modern layout techniques used (Flexbox, Grid) instead of floats/tables?', severity: 'minor' },
            { text: 'Is the layout responsive with appropriate breakpoints?', severity: 'minor' },
            { text: 'Are mobile-first media queries used?', severity: 'nit' },
            { text: 'Are units appropriate (rem/em for text, px for borders, % or vw/vh for layout)?', severity: 'nit' },
            { text: 'Are animations using transform and opacity for performance?', severity: 'minor' },
          ]
        },
        {
          title: 'Browser Compatibility',
          items: [
            { text: 'Are vendor prefixes handled (or autoprefixer configured)?', severity: 'minor' },
            { text: 'Are fallbacks provided for newer CSS features?', severity: 'minor' },
            { text: 'Are CSS features checked against browser support targets?', severity: 'minor' },
          ]
        }
      ]
    },
    {
      title: 'Shell Scripts',
      subsections: [
        {
          title: 'Safety & Correctness',
          items: [
            { text: 'Does the script start with a proper shebang (#!/bin/bash or #!/usr/bin/env bash)?', severity: 'minor' },
            { text: 'Is `set -euo pipefail` used for strict error handling?', severity: 'major' },
            { text: 'Are all variables quoted to prevent word splitting and globbing?', severity: 'major' },
            { text: 'Are user inputs validated and sanitized?', severity: 'blocker' },
            { text: 'Is `shellcheck` passing with no warnings?', severity: 'minor' },
            { text: 'Are temporary files created with `mktemp` and cleaned up with traps?', severity: 'minor' },
            { text: 'Are exit codes used meaningfully?', severity: 'minor' },
          ]
        },
        {
          title: 'Readability & Portability',
          items: [
            { text: 'Are functions used to organize complex logic?', severity: 'minor' },
            { text: 'Are variable names descriptive and in UPPER_CASE for exports, lower_case for local?', severity: 'nit' },
            { text: 'Are complex commands commented for clarity?', severity: 'nit' },
            { text: 'Are POSIX-compatible constructs used where portability matters?', severity: 'minor' },
            { text: 'Is `[[ ]]` used instead of `[ ]` for conditional expressions in Bash?', severity: 'nit' },
            { text: 'Are heredocs or printf used instead of echo for multi-line output?', severity: 'nit' },
          ]
        },
        {
          title: 'Security',
          items: [
            { text: 'Are secrets not hardcoded in scripts?', severity: 'blocker' },
            { text: 'Are file permissions set correctly (not world-writable)?', severity: 'major' },
            { text: 'Is `eval` avoided or used with extreme caution?', severity: 'blocker' },
            { text: 'Are command injection vectors prevented when using user input?', severity: 'blocker' },
            { text: 'Are downloaded scripts/binaries verified with checksums?', severity: 'major' },
          ]
        }
      ]
    },
    {
      title: 'Dockerfile',
      subsections: [
        {
          title: 'Build Efficiency',
          items: [
            { text: 'Is a multi-stage build used to minimize final image size?', severity: 'minor' },
            { text: 'Are layers ordered for optimal cache utilization (least-changing first)?', severity: 'minor' },
            { text: 'Are `COPY` commands specific instead of copying the entire context?', severity: 'minor' },
            { text: 'Is a `.dockerignore` file present and maintained?', severity: 'minor' },
            { text: 'Are RUN commands combined with `&&` to reduce layers?', severity: 'nit' },
            { text: 'Are package manager caches cleaned in the same layer as install?', severity: 'minor' },
          ]
        },
        {
          title: 'Security',
          items: [
            { text: 'Is the base image pinned to a specific digest or version tag (not `latest`)?', severity: 'major' },
            { text: 'Is the container running as a non-root user?', severity: 'blocker' },
            { text: 'Are secrets not baked into the image (use build secrets or runtime injection)?', severity: 'blocker' },
            { text: 'Are unnecessary tools removed from the final image?', severity: 'minor' },
            { text: 'Is the image scanned for vulnerabilities (Trivy, Snyk)?', severity: 'major' },
            { text: 'Are HEALTHCHECK instructions defined?', severity: 'minor' },
          ]
        },
        {
          title: 'Best Practices',
          items: [
            { text: 'Are `ENTRYPOINT` and `CMD` used correctly (exec form, not shell form)?', severity: 'minor' },
            { text: 'Are `EXPOSE` ports documented and correct?', severity: 'nit' },
            { text: 'Are environment variables used for configuration, not hardcoded values?', severity: 'minor' },
            { text: 'Is `LABEL` used for image metadata (maintainer, version)?', severity: 'nit' },
            { text: 'Are signals handled correctly for graceful shutdown (SIGTERM)?', severity: 'minor' },
          ]
        }
      ]
    },
    {
      title: 'Groovy',
      items: [
        { text: 'Are Groovy scripts using safe navigation operator (`?.`) for null safety?', severity: 'minor' },
        { text: 'Are Jenkinsfile pipelines using declarative syntax where possible?', severity: 'minor' },
        { text: 'Are shared libraries versioned and tested?', severity: 'major' },
        { text: 'Are credentials accessed via Jenkins credentials store, not hardcoded?', severity: 'blocker' },
        { text: 'Are pipeline stages named clearly and logically ordered?', severity: 'nit' },
        { text: 'Are `@NonCPS` annotations used for methods that cannot be serialized?', severity: 'minor' },
        { text: 'Are timeout and retry blocks used for external calls?', severity: 'minor' },
        { text: 'Are post-build actions (always, success, failure) defined?', severity: 'minor' },
        { text: 'Are script approvals minimized in Jenkins sandbox mode?', severity: 'minor' },
        { text: 'Are environment variables used instead of hardcoded paths and URLs?', severity: 'minor' },
      ]
    },
    {
      title: 'XSLT',
      items: [
        { text: 'Is the XSLT version specified and appropriate for the use case?', severity: 'minor' },
        { text: 'Are XPath expressions efficient and not overly broad (avoid `//` when possible)?', severity: 'minor' },
        { text: 'Are named templates used for reusable logic instead of duplicated patterns?', severity: 'minor' },
        { text: 'Are variables used to avoid redundant XPath evaluations?', severity: 'minor' },
        { text: 'Is the output method specified correctly (xml, html, text)?', severity: 'minor' },
        { text: 'Are namespace declarations correct and consistent?', severity: 'minor' },
        { text: 'Is whitespace handling intentional (xsl:strip-space, normalize-space)?', severity: 'nit' },
        { text: 'Are edge cases handled (empty nodes, missing attributes, null values)?', severity: 'minor' },
        { text: 'Is the transformation testable with known input/output pairs?', severity: 'minor' },
        { text: 'Are security considerations addressed (no user input in XPath without sanitization)?', severity: 'blocker' },
      ]
    }
  ]
});

// 3. Python
createChecklist({
  id: 'python',
  title: 'Python',
  shortTitle: 'Python',
  description: 'Review checklist for Python projects',
  icon: '🐍',
  sections: [
    {
      title: 'General Code Quality',
      items: [
        { text: 'Does the PR have a clear description of what it does and why?', severity: 'minor' },
        { text: 'Is the change scoped appropriately?', severity: 'minor' },
        { text: 'Are there any unrelated changes bundled in?', severity: 'minor' },
        { text: 'Is dead code removed rather than commented out?', severity: 'nit' },
        { text: 'Are TODO/FIXME comments accompanied by a tracking ticket?', severity: 'nit' },
        { text: 'Does the commit history tell a coherent story?', severity: 'minor' },
      ]
    },
    {
      title: 'Python Style & Idioms',
      subsections: [
        {
          title: 'PEP 8 & Formatting',
          items: [
            { text: 'Does the code follow PEP 8 style guidelines?', severity: 'nit' },
            { text: 'Is a formatter (Black, autopep8) and linter (flake8, ruff) configured?', severity: 'minor' },
            { text: 'Are imports organized (stdlib, third-party, local) with isort or ruff?', severity: 'nit' },
            { text: 'Are wildcard imports (`from module import *`) avoided?', severity: 'minor' },
            { text: 'Are line lengths within project limits (79 or 88 characters)?', severity: 'nit' },
          ]
        },
        {
          title: 'Pythonic Patterns',
          items: [
            { text: 'Are list/dict/set comprehensions used instead of manual loops where clearer?', severity: 'minor' },
            { text: 'Are context managers (`with` statements) used for resource management?', severity: 'major' },
            { text: 'Are f-strings used instead of `%` formatting or `.format()`?', severity: 'nit' },
            { text: 'Is `enumerate()` used instead of manual counter variables?', severity: 'nit' },
            { text: 'Are `pathlib.Path` objects used instead of `os.path` string manipulation?', severity: 'nit' },
            { text: 'Is unpacking used instead of index-based access where appropriate?', severity: 'nit' },
            { text: 'Are `any()` and `all()` used instead of loop-based boolean checks?', severity: 'nit' },
            { text: 'Is EAFP (try/except) preferred over LBYL (if/check) for Python?', severity: 'nit' },
            { text: 'Are walrus operator (`:=`) usages clear and not overly clever?', severity: 'nit' },
          ]
        },
        {
          title: 'Naming',
          items: [
            { text: 'Are class names in PascalCase, functions/variables in snake_case?', severity: 'nit' },
            { text: 'Are constants in UPPER_SNAKE_CASE?', severity: 'nit' },
            { text: 'Are private attributes prefixed with underscore (`_private`)?', severity: 'nit' },
            { text: 'Are dunder methods (`__init__`, `__repr__`) used correctly?', severity: 'minor' },
            { text: 'Are module names short, lowercase, and descriptive?', severity: 'nit' },
          ]
        }
      ]
    },
    {
      title: 'Type Hints & Safety',
      items: [
        { text: 'Are type hints added for function signatures?', severity: 'minor' },
        { text: 'Are complex types using `typing` module (Optional, Union, List, Dict)?', severity: 'minor' },
        { text: 'Is mypy or pyright configured and passing?', severity: 'minor' },
        { text: 'Are `Optional` types handled explicitly (not assuming non-None)?', severity: 'minor' },
        { text: 'Are TypedDict or dataclasses used for structured data?', severity: 'minor' },
        { text: 'Are `Any` types avoided unless justified?', severity: 'minor' },
        { text: 'Are Protocol classes used for structural subtyping where appropriate?', severity: 'minor' },
        { text: 'Are type aliases used for complex nested types?', severity: 'nit' },
      ]
    },
    {
      title: 'Error Handling',
      items: [
        { text: 'Are exceptions caught specifically, not bare `except:` or `except Exception:`?', severity: 'major' },
        { text: 'Are custom exception classes used where they add semantic value?', severity: 'minor' },
        { text: 'Are error messages descriptive with relevant context?', severity: 'minor' },
        { text: 'Is `raise from` used to chain exceptions and preserve tracebacks?', severity: 'minor' },
        { text: 'Are exceptions not used for flow control in normal cases?', severity: 'minor' },
        { text: 'Is `finally` or context managers used for cleanup?', severity: 'major' },
        { text: 'Are `assert` statements not used for runtime validation (only for debug)?', severity: 'major' },
        { text: 'Are logging levels appropriate (debug, info, warning, error, critical)?', severity: 'minor' },
      ]
    },
    {
      title: 'Data Structures & Classes',
      items: [
        { text: 'Are dataclasses used for data-holding classes?', severity: 'minor' },
        { text: 'Are Pydantic models used for data validation at boundaries?', severity: 'minor' },
        { text: 'Are `__repr__` and `__str__` implemented for debuggability?', severity: 'nit' },
        { text: 'Are `__eq__` and `__hash__` implemented correctly when needed?', severity: 'minor' },
        { text: 'Are mutable default arguments avoided (`def func(items=[])`)?', severity: 'major' },
        { text: 'Are slots used for memory-intensive classes?', severity: 'nit' },
        { text: 'Is inheritance depth reasonable (prefer composition)?', severity: 'minor' },
        { text: 'Are abstract base classes used for interface contracts?', severity: 'minor' },
      ]
    },
    {
      title: 'Async & Concurrency',
      items: [
        { text: 'Are async/await used consistently (not mixing sync and async patterns)?', severity: 'major' },
        { text: 'Are blocking operations not called inside async functions?', severity: 'major' },
        { text: 'Is `asyncio.gather()` used for concurrent async operations?', severity: 'minor' },
        { text: 'Are thread-safe data structures used for multi-threaded code?', severity: 'major' },
        { text: 'Is the GIL impact considered for CPU-bound operations (use multiprocessing)?', severity: 'minor' },
        { text: 'Are `concurrent.futures` used for thread/process pool management?', severity: 'minor' },
      ]
    },
    {
      title: 'Testing',
      items: [
        { text: 'Are there unit tests for new logic (pytest or unittest)?', severity: 'major' },
        { text: 'Are fixtures used for test setup instead of repeated setup code?', severity: 'minor' },
        { text: 'Are parametrized tests used for testing multiple inputs?', severity: 'minor' },
        { text: 'Are mocks used appropriately (not over-mocking)?', severity: 'minor' },
        { text: 'Are test names descriptive of the expected behavior?', severity: 'nit' },
        { text: 'Are edge cases covered (None, empty, boundary values)?', severity: 'major' },
        { text: 'Is test coverage adequate for the change?', severity: 'major' },
        { text: 'Are integration tests added for external service interactions?', severity: 'major' },
        { text: 'Are flaky tests avoided (no sleep-based waits, no ordering dependency)?', severity: 'major' },
      ]
    },
    {
      title: 'Dependencies & Packaging',
      items: [
        { text: 'Are new dependencies justified and vetted?', severity: 'minor' },
        { text: 'Are dependencies pinned (requirements.txt, poetry.lock, pipenv.lock)?', severity: 'minor' },
        { text: 'Are dev dependencies separated from production dependencies?', severity: 'minor' },
        { text: 'Is a `pyproject.toml` or `setup.py` properly configured?', severity: 'minor' },
        { text: 'Are virtual environments used (not installing globally)?', severity: 'minor' },
        { text: 'Are unused dependencies removed?', severity: 'nit' },
      ]
    },
    {
      title: 'Security',
      items: [
        { text: 'Is user input validated and sanitized?', severity: 'blocker' },
        { text: 'Are SQL queries parameterized (no string concatenation)?', severity: 'blocker' },
        { text: 'Are secrets loaded from environment variables, not hardcoded?', severity: 'blocker' },
        { text: 'Are `pickle` and `eval()` avoided with untrusted data?', severity: 'blocker' },
        { text: 'Are file path operations protected against traversal attacks?', severity: 'blocker' },
        { text: 'Are dependencies scanned for vulnerabilities (pip-audit, safety)?', severity: 'major' },
        { text: 'Are YAML loads using `safe_load()` instead of `load()`?', severity: 'blocker' },
        { text: 'Is subprocess usage avoiding shell=True with user input?', severity: 'blocker' },
      ]
    },
    {
      title: 'Performance',
      items: [
        { text: 'Are generators used instead of lists for large sequences?', severity: 'minor' },
        { text: 'Are `set` and `dict` used for O(1) lookups instead of list searches?', severity: 'minor' },
        { text: 'Is string concatenation in loops using `join()` instead of `+=`?', severity: 'minor' },
        { text: 'Are N+1 query patterns avoided in ORM usage?', severity: 'major' },
        { text: 'Is caching used for expensive computations (`functools.lru_cache`)?', severity: 'minor' },
        { text: 'Are database connections pooled and properly managed?', severity: 'minor' },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { text: 'Are docstrings added for public functions and classes (Google/NumPy style)?', severity: 'nit' },
        { text: 'Are complex algorithms or business rules explained in comments?', severity: 'nit' },
        { text: 'Is the README updated for new setup steps or dependencies?', severity: 'nit' },
        { text: 'Are breaking changes called out in the PR description?', severity: 'minor' },
      ]
    }
  ]
});

// 4. Ruby
createChecklist({
  id: 'ruby',
  title: 'Ruby',
  shortTitle: 'Ruby',
  description: 'Review checklist for Ruby and Rails projects',
  icon: '💎',
  sections: [
    {
      title: 'General Code Quality',
      items: [
        { text: 'Does the PR have a clear description of what it does and why?', severity: 'minor' },
        { text: 'Is the change scoped appropriately?', severity: 'minor' },
        { text: 'Are there any unrelated changes bundled in?', severity: 'minor' },
        { text: 'Is dead code removed rather than commented out?', severity: 'nit' },
        { text: 'Are TODO/FIXME comments accompanied by a tracking ticket?', severity: 'nit' },
        { text: 'Does the commit history tell a coherent story?', severity: 'minor' },
      ]
    },
    {
      title: 'Ruby Style & Idioms',
      subsections: [
        {
          title: 'Style',
          items: [
            { text: 'Does the code follow community style guide (Rubocop configured)?', severity: 'nit' },
            { text: 'Are methods short and focused (under ~10 lines)?', severity: 'minor' },
            { text: 'Are classes following Single Responsibility Principle?', severity: 'minor' },
            { text: 'Are naming conventions followed (snake_case methods, PascalCase classes)?', severity: 'nit' },
            { text: 'Are predicate methods named with `?` suffix?', severity: 'nit' },
            { text: 'Are destructive methods named with `!` suffix?', severity: 'nit' },
          ]
        },
        {
          title: 'Idioms',
          items: [
            { text: 'Are blocks, procs, and lambdas used idiomatically?', severity: 'minor' },
            { text: 'Is `&:method_name` shorthand used for simple block operations?', severity: 'nit' },
            { text: 'Are `freeze` used for string constants to prevent mutation?', severity: 'nit' },
            { text: 'Are `dig` and safe navigation (`&.`) used for nested access?', severity: 'minor' },
            { text: 'Are `Enumerable` methods used instead of manual iteration?', severity: 'minor' },
            { text: 'Is `raise` used instead of `fail` for exceptions?', severity: 'nit' },
            { text: 'Are heredocs used for multi-line strings?', severity: 'nit' },
            { text: 'Are `attr_reader`, `attr_writer`, `attr_accessor` used appropriately?', severity: 'nit' },
          ]
        }
      ]
    },
    {
      title: 'Rails Specific',
      items: [
        { text: 'Are database queries efficient (no N+1, proper eager loading)?', severity: 'major' },
        { text: 'Are migrations reversible?', severity: 'major' },
        { text: 'Are strong parameters used for mass assignment protection?', severity: 'blocker' },
        { text: 'Are callbacks used sparingly and for the right reasons?', severity: 'minor' },
        { text: 'Are concerns used to share behavior, not just reduce file size?', severity: 'minor' },
        { text: 'Are scopes used instead of class methods for query building?', severity: 'nit' },
        { text: 'Are background jobs used for long-running operations?', severity: 'minor' },
        { text: 'Are validations present for model data integrity?', severity: 'major' },
        { text: 'Are controllers thin (business logic in models/services)?', severity: 'minor' },
        { text: 'Are routes RESTful and following conventions?', severity: 'minor' },
        { text: 'Are partial views extracted for reusable UI components?', severity: 'nit' },
        { text: 'Are database indexes in place for queried columns?', severity: 'major' },
      ]
    },
    {
      title: 'Error Handling',
      items: [
        { text: 'Are exceptions rescued specifically, not bare `rescue`?', severity: 'major' },
        { text: 'Are custom error classes defined for domain-specific errors?', severity: 'minor' },
        { text: 'Is `ensure` used for cleanup code?', severity: 'minor' },
        { text: 'Are error responses consistent across the API?', severity: 'minor' },
        { text: 'Is error logging structured with context?', severity: 'minor' },
      ]
    },
    {
      title: 'Testing',
      items: [
        { text: 'Are there unit tests for new logic (RSpec or Minitest)?', severity: 'major' },
        { text: 'Are factories (FactoryBot) used instead of fixtures for test data?', severity: 'minor' },
        { text: 'Are request specs added for new API endpoints?', severity: 'major' },
        { text: 'Are tests using `let` and `subject` for DRY setup?', severity: 'nit' },
        { text: 'Are shared examples used for common behavior?', severity: 'nit' },
        { text: 'Are edge cases covered (nil, empty, boundary values)?', severity: 'major' },
        { text: 'Are test names descriptive of expected behavior?', severity: 'nit' },
        { text: 'Is test coverage adequate for the change?', severity: 'major' },
      ]
    },
    {
      title: 'Security',
      items: [
        { text: 'Is user input sanitized to prevent XSS and SQL injection?', severity: 'blocker' },
        { text: 'Are CSRF tokens verified for state-changing requests?', severity: 'blocker' },
        { text: 'Are secrets loaded from environment variables (not hardcoded)?', severity: 'blocker' },
        { text: 'Are Brakeman warnings addressed?', severity: 'major' },
        { text: 'Are file uploads validated (type, size, content)?', severity: 'major' },
        { text: 'Are authorization checks in place (Pundit, CanCanCan)?', severity: 'blocker' },
        { text: 'Are sensitive data not logged?', severity: 'major' },
        { text: 'Are dependency vulnerabilities checked (bundler-audit)?', severity: 'major' },
      ]
    },
    {
      title: 'Performance',
      items: [
        { text: 'Are database queries optimized (explain, indexes)?', severity: 'minor' },
        { text: 'Is caching used appropriately (fragment, action, low-level)?', severity: 'minor' },
        { text: 'Are bulk operations used instead of iterating with individual saves?', severity: 'minor' },
        { text: 'Are counter caches used for has_many counts?', severity: 'nit' },
        { text: 'Is pagination used for large collections?', severity: 'minor' },
      ]
    },
    {
      title: 'Dependencies & Documentation',
      items: [
        { text: 'Are new gems justified and vetted?', severity: 'minor' },
        { text: 'Is Gemfile.lock committed?', severity: 'minor' },
        { text: 'Are YARD or RDoc comments added for public APIs?', severity: 'nit' },
        { text: 'Is the README updated for setup changes?', severity: 'nit' },
        { text: 'Are breaking changes called out?', severity: 'minor' },
      ]
    }
  ]
});

// 5. Lua
createChecklist({
  id: 'lua',
  title: 'Lua',
  shortTitle: 'Lua',
  description: 'Review checklist for Lua projects (scripting, game dev, embedded)',
  icon: '🌙',
  sections: [
    {
      title: 'General Code Quality',
      items: [
        { text: 'Does the PR have a clear description of what it does and why?', severity: 'minor' },
        { text: 'Is the change scoped appropriately?', severity: 'minor' },
        { text: 'Are there any unrelated changes bundled in?', severity: 'minor' },
        { text: 'Is dead code removed rather than commented out?', severity: 'nit' },
        { text: 'Are TODO/FIXME comments accompanied by a tracking ticket?', severity: 'nit' },
      ]
    },
    {
      title: 'Lua Style & Idioms',
      items: [
        { text: 'Are local variables used instead of globals wherever possible?', severity: 'major' },
        { text: 'Are variable and function names descriptive and consistent?', severity: 'nit' },
        { text: 'Are modules structured using the return-table pattern?', severity: 'minor' },
        { text: 'Is `local` keyword used for loop variables and temporary values?', severity: 'minor' },
        { text: 'Are metatables used correctly and not overcomplicating simple structures?', severity: 'minor' },
        { text: 'Are string concatenation operations using `table.concat()` for performance?', severity: 'minor' },
        { text: 'Are numeric for-loops used with correct step values?', severity: 'minor' },
        { text: 'Is `ipairs` used for arrays and `pairs` for hash tables?', severity: 'nit' },
        { text: 'Are varargs (`...`) handled correctly with `select()` or table packing?', severity: 'minor' },
        { text: 'Are `nil` comparisons explicit rather than relying on truthiness?', severity: 'minor' },
      ]
    },
    {
      title: 'Tables & Data Structures',
      items: [
        { text: 'Are tables used as arrays not mixed with hash keys?', severity: 'minor' },
        { text: 'Is `#` operator used correctly (only reliable for sequence tables)?', severity: 'minor' },
        { text: 'Are table keys consistent types (don\'t mix string and integer keys)?', severity: 'minor' },
        { text: 'Are object-oriented patterns using metatables consistent?', severity: 'minor' },
        { text: 'Are table constructors used for initialization instead of sequential assignment?', severity: 'nit' },
        { text: 'Are weak tables used where garbage collection of values is needed?', severity: 'minor' },
      ]
    },
    {
      title: 'Error Handling',
      items: [
        { text: 'Are `pcall` and `xpcall` used for protected calls?', severity: 'major' },
        { text: 'Are error messages descriptive with relevant context?', severity: 'minor' },
        { text: 'Are `error()` calls using level parameter correctly?', severity: 'minor' },
        { text: 'Is the ok, err pattern used consistently for error propagation?', severity: 'minor' },
        { text: 'Are assertion failures (`assert()`) appropriate for the context?', severity: 'minor' },
      ]
    },
    {
      title: 'Performance',
      items: [
        { text: 'Are hot-path locals cached from global lookups (e.g., `local math_sin = math.sin`)?', severity: 'minor' },
        { text: 'Are tables pre-allocated when size is known?', severity: 'minor' },
        { text: 'Are string patterns used efficiently (avoiding backtracking)?', severity: 'minor' },
        { text: 'Are closures not created unnecessarily in loops?', severity: 'minor' },
        { text: 'Is tail-call optimization leveraged where appropriate?', severity: 'nit' },
        { text: 'Are LuaJIT-specific optimizations considered (FFI, tracing)?', severity: 'nit' },
      ]
    },
    {
      title: 'C Integration & FFI',
      items: [
        { text: 'Are C API calls using proper stack management (push/pop balance)?', severity: 'major' },
        { text: 'Are userdata types validated before use?', severity: 'major' },
        { text: 'Is memory management correct for C-allocated resources?', severity: 'blocker' },
        { text: 'Are LuaJIT FFI declarations matching C headers exactly?', severity: 'major' },
      ]
    },
    {
      title: 'Testing & Security',
      items: [
        { text: 'Are there unit tests for new logic (busted, luaunit)?', severity: 'major' },
        { text: 'Are test cases covering edge cases (nil, empty tables, boundary values)?', severity: 'major' },
        { text: 'Is user input from external sources validated?', severity: 'blocker' },
        { text: 'Is `loadstring`/`load` avoided with untrusted input?', severity: 'blocker' },
        { text: 'Are sandboxing techniques used for running untrusted scripts?', severity: 'major' },
        { text: 'Are file paths validated to prevent directory traversal?', severity: 'major' },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { text: 'Are LDoc or LuaDoc comments added for public APIs?', severity: 'nit' },
        { text: 'Are complex algorithms explained in comments?', severity: 'nit' },
        { text: 'Is the README updated for API changes?', severity: 'nit' },
      ]
    }
  ]
});

// 6. C
createChecklist({
  id: 'c-lang',
  title: 'C',
  shortTitle: 'C',
  description: 'Review checklist for C projects (systems, embedded, libraries)',
  icon: '⚙️',
  sections: [
    {
      title: 'General Code Quality',
      items: [
        { text: 'Does the PR have a clear description of what it does and why?', severity: 'minor' },
        { text: 'Is the change scoped appropriately?', severity: 'minor' },
        { text: 'Are there any unrelated changes bundled in?', severity: 'minor' },
        { text: 'Is dead code removed rather than commented out?', severity: 'nit' },
        { text: 'Are TODO/FIXME comments accompanied by a tracking ticket?', severity: 'nit' },
        { text: 'Does the commit history tell a coherent story?', severity: 'minor' },
      ]
    },
    {
      title: 'Memory Management',
      items: [
        { text: 'Is every `malloc`/`calloc`/`realloc` paired with a `free`?', severity: 'blocker' },
        { text: 'Are double-free bugs prevented?', severity: 'blocker' },
        { text: 'Are use-after-free bugs prevented (pointer set to NULL after free)?', severity: 'blocker' },
        { text: 'Is `realloc` return value checked (may return NULL on failure)?', severity: 'blocker' },
        { text: 'Are buffer sizes tracked and bounds checked?', severity: 'blocker' },
        { text: 'Is stack allocation used for small, fixed-size buffers?', severity: 'minor' },
        { text: 'Are VLAs (Variable Length Arrays) avoided?', severity: 'major' },
        { text: 'Are Valgrind/AddressSanitizer findings addressed?', severity: 'major' },
        { text: 'Is memory zeroed before free for sensitive data?', severity: 'major' },
        { text: 'Are ownership semantics clear (who allocates, who frees)?', severity: 'major' },
      ]
    },
    {
      title: 'Pointers & Arrays',
      items: [
        { text: 'Are pointer parameters checked for NULL before dereferencing?', severity: 'blocker' },
        { text: 'Are array bounds checked before access?', severity: 'blocker' },
        { text: 'Is pointer arithmetic correct and within bounds?', severity: 'blocker' },
        { text: 'Are `const` pointers used for read-only parameters?', severity: 'minor' },
        { text: 'Are function pointers validated before calling?', severity: 'major' },
        { text: 'Is `sizeof(*ptr)` used instead of `sizeof(type)` for allocation?', severity: 'minor' },
        { text: 'Are void pointers cast correctly with proper alignment?', severity: 'major' },
      ]
    },
    {
      title: 'String Handling',
      items: [
        { text: 'Are `strncpy`, `snprintf` used instead of `strcpy`, `sprintf`?', severity: 'blocker' },
        { text: 'Are strings properly null-terminated?', severity: 'blocker' },
        { text: 'Are buffer sizes sufficient for string operations (including null terminator)?', severity: 'blocker' },
        { text: 'Is `strlcpy`/`strlcat` used where available?', severity: 'minor' },
        { text: 'Are format string vulnerabilities prevented (no user input as format string)?', severity: 'blocker' },
        { text: 'Are string comparison functions used correctly (`strcmp` vs `strncmp`)?', severity: 'minor' },
      ]
    },
    {
      title: 'Error Handling',
      items: [
        { text: 'Are return values checked for all system and library calls?', severity: 'major' },
        { text: 'Is `errno` checked and handled appropriately?', severity: 'major' },
        { text: 'Are error paths cleaning up allocated resources (goto cleanup pattern)?', severity: 'major' },
        { text: 'Are error messages descriptive with relevant context?', severity: 'minor' },
        { text: 'Are error codes defined and documented?', severity: 'minor' },
        { text: 'Is the cleanup pattern consistent (goto, nested ifs, or wrapper functions)?', severity: 'minor' },
      ]
    },
    {
      title: 'Types & Integers',
      items: [
        { text: 'Are integer overflow/underflow possibilities considered?', severity: 'blocker' },
        { text: 'Are signed/unsigned conversions explicit and correct?', severity: 'major' },
        { text: 'Are `size_t` and `ssize_t` used for sizes and counts?', severity: 'minor' },
        { text: 'Are fixed-width types (`int32_t`, `uint64_t`) used where portability matters?', severity: 'minor' },
        { text: 'Are bit operations using unsigned types?', severity: 'minor' },
        { text: 'Are enum values explicitly numbered where stability matters?', severity: 'minor' },
        { text: 'Is `bool` from `<stdbool.h>` used instead of int for boolean values?', severity: 'nit' },
      ]
    },
    {
      title: 'Concurrency & Threading',
      items: [
        { text: 'Are shared data structures protected with mutexes or atomics?', severity: 'blocker' },
        { text: 'Is lock ordering consistent to prevent deadlocks?', severity: 'blocker' },
        { text: 'Are atomic operations used for simple counters and flags?', severity: 'minor' },
        { text: 'Are thread-local variables used where appropriate?', severity: 'minor' },
        { text: 'Are condition variables used correctly (spurious wakeup handling)?', severity: 'major' },
        { text: 'Are signals handled safely (only async-signal-safe functions in handlers)?', severity: 'major' },
      ]
    },
    {
      title: 'API & Header Design',
      items: [
        { text: 'Are header guards (`#ifndef`/`#define`/`#endif`) or `#pragma once` present?', severity: 'minor' },
        { text: 'Are public APIs minimal and well-documented?', severity: 'minor' },
        { text: 'Are internal functions declared `static`?', severity: 'minor' },
        { text: 'Are `extern "C"` guards used for C++ compatibility?', severity: 'minor' },
        { text: 'Are opaque types used to hide implementation details?', severity: 'minor' },
        { text: 'Are function parameters ordered consistently (output last or context first)?', severity: 'nit' },
        { text: 'Are macros minimized in favor of inline functions or const variables?', severity: 'minor' },
      ]
    },
    {
      title: 'Build & Portability',
      items: [
        { text: 'Are compiler warnings enabled (-Wall -Wextra -Werror)?', severity: 'minor' },
        { text: 'Are platform-specific features guarded with preprocessor checks?', severity: 'minor' },
        { text: 'Are endianness assumptions avoided or handled?', severity: 'minor' },
        { text: 'Are alignment requirements respected for structures?', severity: 'minor' },
        { text: 'Is undefined behavior avoided (null dereference, signed overflow, etc.)?', severity: 'blocker' },
        { text: 'Are sanitizers (ASan, UBSan, TSan) run in CI?', severity: 'major' },
      ]
    },
    {
      title: 'Security',
      items: [
        { text: 'Is user input validated and size-bounded?', severity: 'blocker' },
        { text: 'Are format string vulnerabilities prevented?', severity: 'blocker' },
        { text: 'Is stack buffer overflow prevented?', severity: 'blocker' },
        { text: 'Are ASLR/stack canaries/PIE not disabled?', severity: 'major' },
        { text: 'Are secrets zeroed from memory after use?', severity: 'major' },
        { text: 'Is `rand()` not used for security-sensitive random numbers?', severity: 'blocker' },
        { text: 'Are time-of-check-to-time-of-use (TOCTOU) races prevented?', severity: 'major' },
        { text: 'Are file operations using safe open flags (O_NOFOLLOW, O_CREAT|O_EXCL)?', severity: 'minor' },
      ]
    },
    {
      title: 'Testing',
      items: [
        { text: 'Are there unit tests for new functions?', severity: 'major' },
        { text: 'Are edge cases tested (NULL, 0, INT_MAX, empty buffers)?', severity: 'major' },
        { text: 'Are memory-related tests run under Valgrind/ASan?', severity: 'major' },
        { text: 'Are test names descriptive?', severity: 'nit' },
        { text: 'Is fuzzing used for input parsing code?', severity: 'minor' },
        { text: 'Are regression tests added for fixed bugs?', severity: 'major' },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { text: 'Are public functions documented with parameter and return descriptions?', severity: 'nit' },
        { text: 'Are header files documenting the public API contract?', severity: 'nit' },
        { text: 'Are complex algorithms or data structures explained?', severity: 'nit' },
        { text: 'Are breaking API changes called out?', severity: 'minor' },
      ]
    }
  ]
});

console.log('\nAll checklists created!');
