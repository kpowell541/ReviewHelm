module.exports = {
  // ── General Code Quality ──
  "web-devops-config.general-code-quality.does-the-pr-have-a-clear-description": {
    whatItMeans: "The PR includes a summary of what changed and why, giving reviewers context before reading the diff.",
    whyItMatters: "Web/DevOps changes span many technologies (HTML, CSS, Shell, Docker, Groovy, XSLT). Without context, reviewers can't tell which technology concern drives the change.",
    howToVerify: "- Read the PR description — does it explain motivation and approach?\n- Check for links to related issues or design documents\n- Verify the description matches actual changes",
    exampleComment: "Could you add a description explaining why this Dockerfile was restructured? The diff changes layer ordering but the reason isn't clear.",
    codeExamples: [],
    keyTakeaway: "A good PR description is essential when changes span multiple technologies.",
    references: []
  },
  "web-devops-config.general-code-quality.is-the-change-scoped-appropriately": {
    whatItMeans: "The PR contains a single logical change — not mixing unrelated Dockerfile, CSS, and shell script changes.",
    whyItMatters: "Cross-technology PRs are hard to review because each file type requires different expertise. Keep changes scoped to one concern.",
    howToVerify: "- Check the diff — are all changes related to one concern?\n- Verify HTML, CSS, Shell, and Docker changes are logically connected\n- Check if the PR could be split by technology",
    exampleComment: "This PR updates the Dockerfile AND rewrites the CI shell scripts. Could we split these so each can be reviewed by the appropriate expert?",
    codeExamples: [],
    keyTakeaway: "Scope PRs by concern, especially when spanning multiple technologies.",
    references: []
  },
  "web-devops-config.general-code-quality.are-there-any-unrelated-changes-bundled-in": {
    whatItMeans: "The PR doesn't mix unrelated fixes or formatting changes with the primary change.",
    whyItMatters: "Bundled changes make reviews harder, complicate reverts, and obscure git blame history.",
    howToVerify: "- Scan the file list for unrelated files\n- Look for stray formatting or whitespace changes\n- Check for drive-by fixes mixed in",
    exampleComment: "The CSS formatting changes are unrelated to the Docker security fixes. Could you move them to a separate PR?",
    codeExamples: [],
    keyTakeaway: "Keep PRs focused — unrelated changes belong in separate PRs.",
    references: []
  },
  "web-devops-config.general-code-quality.is-dead-code-removed-rather-than-commented-out": {
    whatItMeans: "Unused code is deleted rather than commented out. Git history preserves deleted code.",
    whyItMatters: "Commented-out code in shell scripts and Dockerfiles is especially confusing because it looks like disabled configuration.",
    howToVerify: "- Search for commented-out blocks in scripts, Dockerfiles, and config files\n- Check for unused CSS rules or HTML sections\n- Look for old configuration left as comments",
    exampleComment: "The commented-out RUN commands in the Dockerfile look like disabled steps. If they're no longer needed, delete them — git has the history.",
    codeExamples: [],
    keyTakeaway: "Delete dead code and config — commented-out Dockerfile steps are especially confusing.",
    references: []
  },
  "web-devops-config.general-code-quality.are-todofixme-comments-accompanied-by-a-tracking-ticket": {
    whatItMeans: "TODO and FIXME comments reference a ticket so the work is tracked.",
    whyItMatters: "Untracked TODOs in DevOps scripts are especially dangerous — they often mark security concerns or missing error handling.",
    howToVerify: "- Search for TODO, FIXME, HACK, XXX in the diff\n- Verify each has a ticket reference\n- Check that referenced tickets exist",
    exampleComment: "The `# TODO: add SSL` in the Dockerfile needs a ticket. This is a security concern that shouldn't be forgotten.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "# TODO: fix this later" },
      { label: "Good", language: "bash", code: "# TODO(OPS-456): Add health check endpoint for load balancer" }
    ],
    keyTakeaway: "Track every TODO with a ticket — especially security-related ones in DevOps code.",
    references: []
  },

  // ── HTML: Structure & Semantics ──
  "web-devops-config.html.structure-semantics.are-semantic-html-elements-used-header-nav-main-article-section-footer": {
    whatItMeans: "Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`) are used instead of generic `<div>` elements.",
    whyItMatters: "Semantic elements provide meaning to screen readers, search engines, and other tools. They improve accessibility, SEO, and code readability.",
    howToVerify: "- Check for `<div>` elements that should be semantic elements\n- Verify `<main>` is used once per page for primary content\n- Check that `<nav>` wraps navigation links\n- Verify `<article>` is used for self-contained content",
    exampleComment: "The page uses `<div class=\"header\">` and `<div class=\"nav\">` instead of `<header>` and `<nav>`. Semantic elements provide built-in accessibility and SEO benefits.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<div class=\"header\">\n  <div class=\"nav\">...</div>\n</div>\n<div class=\"content\">...</div>\n<div class=\"footer\">...</div>" },
      { label: "Good", language: "html", code: "<header>\n  <nav>...</nav>\n</header>\n<main>...</main>\n<footer>...</footer>" }
    ],
    keyTakeaway: "Use semantic HTML elements — they're accessible, SEO-friendly, and more readable than div soup.",
    references: [
      { title: "HTML Semantic Elements", url: "https://developer.mozilla.org/en-US/docs/Glossary/Semantics#semantics_in_html" }
    ]
  },
  "web-devops-config.html.structure-semantics.is-the-document-structure-valid-proper-nesting-required-elements": {
    whatItMeans: "The HTML document has proper structure: doctype, html, head, body, correct nesting, and required elements.",
    whyItMatters: "Invalid HTML causes inconsistent rendering across browsers, accessibility failures, and SEO penalties. Validators catch issues early.",
    howToVerify: "- Check for `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>` elements\n- Verify proper nesting (no `<div>` inside `<p>`, no `<p>` inside `<p>`)\n- Run through the W3C HTML validator\n- Check that `<head>` includes `<title>` and charset meta",
    exampleComment: "The `<p>` tag contains a `<div>`, which is invalid nesting. Block elements can't be inside inline elements. Use a `<div>` as the outer container instead.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<p>\n  <div>Block inside inline — invalid!</div>\n</p>" },
      { label: "Good", language: "html", code: "<div>\n  <p>Paragraph text</p>\n  <div>Block content</div>\n</div>" }
    ],
    keyTakeaway: "Validate HTML structure — proper nesting ensures consistent rendering and accessibility.",
    references: [
      { title: "W3C HTML Validator", url: "https://validator.w3.org/" }
    ]
  },
  "web-devops-config.html.structure-semantics.are-heading-levels-sequential-and-not-skipped-h1---h2---h3": {
    whatItMeans: "Heading levels follow a logical hierarchy (h1 → h2 → h3) without skipping levels.",
    whyItMatters: "Screen readers use heading hierarchy for navigation. Skipped levels (h1 → h3) confuse users and break the document outline.",
    howToVerify: "- Check that headings follow sequential order\n- Verify only one `<h1>` per page\n- Look for heading tags used for styling instead of semantic structure",
    exampleComment: "The page jumps from `<h1>` to `<h3>`, skipping `<h2>`. Screen readers use heading levels for navigation — please add the missing level.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<h1>Page Title</h1>\n<h3>Subsection</h3>  <!-- Skipped h2! -->" },
      { label: "Good", language: "html", code: "<h1>Page Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>" }
    ],
    keyTakeaway: "Keep heading levels sequential — they define the document outline for accessibility.",
    references: []
  },
  "web-devops-config.html.structure-semantics.are-ids-unique-within-the-document": {
    whatItMeans: "Each `id` attribute value appears only once in the HTML document.",
    whyItMatters: "Duplicate IDs cause JavaScript `getElementById` to return unexpected results, break label-input associations, and fail accessibility checks.",
    howToVerify: "- Search for duplicate id values in the document\n- Check dynamically generated HTML for potential duplicates\n- Verify fragment links (`#id`) point to unique elements",
    exampleComment: "The id `user-form` appears twice — once in the modal and once in the main content. This breaks `getElementById` and label associations.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<div id=\"content\">...</div>\n<div id=\"content\">...</div>  <!-- Duplicate! -->" },
      { label: "Good", language: "html", code: "<div id=\"main-content\">...</div>\n<div id=\"sidebar-content\">...</div>" }
    ],
    keyTakeaway: "IDs must be unique — use classes for styling shared elements, IDs for unique references.",
    references: []
  },
  "web-devops-config.html.structure-semantics.are-forms-using-proper-input-types-email-tel-number-date": {
    whatItMeans: "Form inputs use specific HTML5 input types (`email`, `tel`, `number`, `date`, `url`) instead of generic `text` inputs.",
    whyItMatters: "Proper input types trigger appropriate mobile keyboards, enable browser validation, and improve form usability.",
    howToVerify: "- Check that email fields use `type=\"email\"`\n- Verify phone fields use `type=\"tel\"`\n- Check numeric fields use `type=\"number\"` with min/max\n- Look for date fields using `type=\"date\"`",
    exampleComment: "The email input uses `type=\"text\"`. Changing to `type=\"email\"` enables browser validation and shows the email keyboard on mobile.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<input type=\"text\" name=\"email\" placeholder=\"Email\">\n<input type=\"text\" name=\"phone\">\n<input type=\"text\" name=\"age\">" },
      { label: "Good", language: "html", code: "<input type=\"email\" name=\"email\" placeholder=\"user@example.com\" required>\n<input type=\"tel\" name=\"phone\" pattern=\"[0-9]{10}\">\n<input type=\"number\" name=\"age\" min=\"0\" max=\"150\">" }
    ],
    keyTakeaway: "Use specific input types — they improve UX, enable validation, and show proper mobile keyboards.",
    references: []
  },
  "web-devops-config.html.structure-semantics.are-form-inputs-associated-with-labels": {
    whatItMeans: "Every form input has an associated `<label>` element using the `for` attribute or wrapping the input.",
    whyItMatters: "Labels are essential for accessibility — screen readers announce the label when the input is focused. They also increase click targets for better usability.",
    howToVerify: "- Check that every input has a `<label>` with matching `for`/`id`\n- Verify labels have descriptive text (not just 'Input 1')\n- Check for inputs with only `placeholder` and no label",
    exampleComment: "The email input has a placeholder but no `<label>`. Placeholders disappear on focus and aren't announced by screen readers. Add a `<label for=\"email\">`.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<input type=\"email\" placeholder=\"Email\">  <!-- No label! -->" },
      { label: "Good", language: "html", code: "<label for=\"email\">Email address</label>\n<input type=\"email\" id=\"email\" placeholder=\"user@example.com\">" }
    ],
    keyTakeaway: "Every input needs a label — placeholders are not labels and disappear on focus.",
    references: []
  },

  // ── HTML: Accessibility ──
  "web-devops-config.html.accessibility.are-images-with-content-meaning-given-alt-text-decorative-images-have-alt": {
    whatItMeans: "Content images have descriptive `alt` text. Decorative images have empty `alt=\"\"` to be hidden from screen readers.",
    whyItMatters: "Screen readers announce alt text for images. Missing alt makes images invisible. Wrong alt (or decorative images announced) creates noise.",
    howToVerify: "- Check that every `<img>` has an `alt` attribute\n- Verify content images have descriptive alt text\n- Check decorative images have `alt=\"\"`\n- Look for `alt=\"image\"` or `alt=\"photo\"` — not useful",
    exampleComment: "The product image has `alt=\"image\"` which isn't descriptive. Could you change it to `alt=\"Red leather wallet, front view\"`?",
    codeExamples: [
      { label: "Bad", language: "html", code: "<img src=\"product.jpg\">  <!-- No alt! -->\n<img src=\"icon.svg\" alt=\"icon\">  <!-- Not descriptive -->" },
      { label: "Good", language: "html", code: "<img src=\"product.jpg\" alt=\"Red leather wallet, front view\">\n<img src=\"divider.svg\" alt=\"\">  <!-- Decorative: empty alt -->" }
    ],
    keyTakeaway: "Descriptive alt for content images, empty alt for decorative — never omit the alt attribute.",
    references: [
      { title: "Alt Text Decision Tree", url: "https://www.w3.org/WAI/tutorials/images/decision-tree/" }
    ]
  },
  "web-devops-config.html.accessibility.are-aria-attributes-used-correctly-and-not-redundant-with-semantic-html": {
    whatItMeans: "ARIA attributes are used only when semantic HTML doesn't convey the needed information, and aren't redundant with native semantics.",
    whyItMatters: "Misused ARIA is worse than no ARIA — it can override correct native semantics and confuse assistive technology.",
    howToVerify: "- Check for `role=\"button\"` on `<button>` elements (redundant)\n- Look for `role=\"navigation\"` on `<nav>` (redundant)\n- Verify custom widgets have appropriate ARIA roles and states\n- Check that `aria-label` isn't duplicating visible text",
    exampleComment: "The `<nav role=\"navigation\">` is redundant — `<nav>` already has the navigation role. Remove the ARIA attribute.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<nav role=\"navigation\">...</nav>  <!-- Redundant -->\n<button role=\"button\">Click</button>  <!-- Redundant -->" },
      { label: "Good", language: "html", code: "<nav aria-label=\"Main navigation\">...</nav>\n<div role=\"tablist\">\n  <button role=\"tab\" aria-selected=\"true\">Tab 1</button>\n</div>" }
    ],
    keyTakeaway: "Use semantic HTML first. Only add ARIA when native elements can't express the interaction.",
    references: [
      { title: "WAI-ARIA Authoring Practices", url: "https://www.w3.org/WAI/ARIA/apg/" }
    ]
  },
  "web-devops-config.html.accessibility.is-keyboard-navigation-supported-for-interactive-elements": {
    whatItMeans: "All interactive elements (buttons, links, form controls, custom widgets) are keyboard accessible — focusable and operable without a mouse.",
    whyItMatters: "Many users navigate with keyboards, switch devices, or screen readers. Non-keyboard-accessible controls are completely inaccessible to them.",
    howToVerify: "- Tab through the page — can you reach every interactive element?\n- Verify custom clickable elements are `<button>` or have `tabindex=\"0\"` and keyboard handlers\n- Check that focus indicators are visible\n- Test that Enter/Space activates buttons and links",
    exampleComment: "The `<div onclick=\"...\">` is not keyboard accessible. Use a `<button>` element instead, which has built-in keyboard support.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<div class=\"card\" onclick=\"openDetail()\">Click me</div>" },
      { label: "Good", language: "html", code: "<button class=\"card\" onclick=\"openDetail()\">Click me</button>\n<!-- Or if div is needed: -->\n<div class=\"card\" role=\"button\" tabindex=\"0\"\n     onclick=\"openDetail()\" onkeydown=\"if(event.key==='Enter') openDetail()\">" }
    ],
    keyTakeaway: "Use `<button>` for clickable elements — they have built-in keyboard and accessibility support.",
    references: []
  },
  "web-devops-config.html.accessibility.are-color-contrast-ratios-sufficient-wcag-aa": {
    whatItMeans: "Text and interactive elements meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).",
    whyItMatters: "Low contrast text is unreadable for users with low vision, color blindness, or in bright/dim lighting conditions.",
    howToVerify: "- Check contrast ratios using browser DevTools or online checkers\n- Verify text on images or gradients has sufficient contrast\n- Check that focus indicators have visible contrast\n- Test with color blindness simulation tools",
    exampleComment: "The light gray text (#999) on white background (#fff) has a 2.8:1 contrast ratio — below the 4.5:1 WCAG AA requirement. Could you darken it to at least #767676?",
    codeExamples: [
      { label: "Bad", language: "css", code: "/* Contrast ratio: 2.8:1 — fails WCAG AA */\ncolor: #999;\nbackground: #fff;" },
      { label: "Good", language: "css", code: "/* Contrast ratio: 4.5:1 — passes WCAG AA */\ncolor: #767676;\nbackground: #fff;" }
    ],
    keyTakeaway: "Maintain 4.5:1 contrast ratio for normal text — check with DevTools' accessibility panel.",
    references: [
      { title: "WebAIM Contrast Checker", url: "https://webaim.org/resources/contrastchecker/" }
    ]
  },
  "web-devops-config.html.accessibility.is-the-language-attribute-set-on-the-html-element": {
    whatItMeans: "The `<html>` element has a `lang` attribute specifying the page's primary language.",
    whyItMatters: "The `lang` attribute helps screen readers use correct pronunciation, enables proper hyphenation, and assists translation tools.",
    howToVerify: "- Check that `<html lang=\"en\">` (or appropriate language code) is present\n- Verify the language code is correct for the content\n- Check for `lang` attributes on sections in different languages",
    exampleComment: "The `<html>` element is missing the `lang` attribute. Please add `lang=\"en\"` for English content.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<html>  <!-- Missing lang attribute -->" },
      { label: "Good", language: "html", code: "<html lang=\"en\">" }
    ],
    keyTakeaway: "Always set `lang` on `<html>` — screen readers need it for correct pronunciation.",
    references: []
  },

  // ── HTML: Performance & SEO ──
  "web-devops-config.html.performance-seo.are-scripts-deferred-or-placed-at-the-bottom-of-the-body": {
    whatItMeans: "JavaScript files use `defer` or `async` attributes, or are placed at the bottom of `<body>`, to avoid blocking page rendering.",
    whyItMatters: "Scripts in `<head>` without defer block HTML parsing and rendering, causing the page to appear blank until scripts load.",
    howToVerify: "- Check for `<script>` tags in `<head>` without `defer` or `async`\n- Verify critical scripts use `defer` (maintains execution order)\n- Check that non-critical scripts use `async` or are loaded dynamically",
    exampleComment: "The `<script src=\"analytics.js\">` in `<head>` blocks rendering. Add `defer` to load it without blocking: `<script defer src=\"analytics.js\">`.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<head>\n  <script src=\"app.js\"></script>  <!-- Blocks rendering! -->\n</head>" },
      { label: "Good", language: "html", code: "<head>\n  <script defer src=\"app.js\"></script>\n</head>" }
    ],
    keyTakeaway: "Use `defer` for scripts — they load in parallel and execute after parsing, never blocking rendering.",
    references: []
  },
  "web-devops-config.html.performance-seo.are-meta-tags-viewport-description-charset-present-and-correct": {
    whatItMeans: "Essential meta tags (viewport, description, charset) are present and correctly configured.",
    whyItMatters: "Missing viewport meta breaks mobile rendering. Missing charset can cause encoding issues. Description affects SEO and social sharing.",
    howToVerify: "- Check for `<meta charset=\"utf-8\">`\n- Verify `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`\n- Check for `<meta name=\"description\" content=\"...\">`\n- Verify `<title>` is present and descriptive",
    exampleComment: "The page is missing the viewport meta tag, which breaks mobile rendering. Add `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<head>\n  <title>My Page</title>\n  <!-- Missing charset, viewport, description -->\n</head>" },
      { label: "Good", language: "html", code: "<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"description\" content=\"A brief description of the page for SEO\">\n  <title>My Page — Site Name</title>\n</head>" }
    ],
    keyTakeaway: "Include charset, viewport, description, and title — they're essential for rendering, SEO, and sharing.",
    references: []
  },
  "web-devops-config.html.performance-seo.are-open-graph-and-social-meta-tags-included-where-applicable": {
    whatItMeans: "Open Graph and Twitter Card meta tags are included for pages that will be shared on social media.",
    whyItMatters: "Without OG tags, social platforms generate poor previews with missing images and generic descriptions, reducing click-through rates.",
    howToVerify: "- Check for `og:title`, `og:description`, `og:image`, `og:url` meta tags\n- Verify Twitter Card tags are present (`twitter:card`, `twitter:title`)\n- Test with social sharing preview tools",
    exampleComment: "This page will be shared publicly but has no Open Graph tags. When shared on LinkedIn/Twitter, it'll show a blank preview. Could you add og:title, og:description, and og:image?",
    codeExamples: [
      { label: "Bad", language: "html", code: "<!-- No social meta tags — generic preview on sharing -->" },
      { label: "Good", language: "html", code: "<meta property=\"og:title\" content=\"Article Title\">\n<meta property=\"og:description\" content=\"Brief description\">\n<meta property=\"og:image\" content=\"https://example.com/image.jpg\">\n<meta property=\"og:url\" content=\"https://example.com/article\">\n<meta name=\"twitter:card\" content=\"summary_large_image\">" }
    ],
    keyTakeaway: "Add Open Graph tags for shareable pages — they control how your content appears on social platforms.",
    references: []
  },
  "web-devops-config.html.performance-seo.is-inline-styling-avoided-in-favor-of-external-stylesheets": {
    whatItMeans: "Styles are defined in external CSS files or `<style>` blocks, not as inline `style` attributes on HTML elements.",
    whyItMatters: "Inline styles can't be cached, can't use media queries, have highest specificity (hard to override), and mix presentation with structure.",
    howToVerify: "- Search for `style=` attributes in HTML\n- Check that styling uses classes and external stylesheets\n- Allow inline styles only for dynamic values set by JavaScript",
    exampleComment: "The `style=\"color: red; font-size: 18px;\"` should be a CSS class. Inline styles can't be cached and are hard to maintain.",
    codeExamples: [
      { label: "Bad", language: "html", code: "<p style=\"color: red; font-size: 18px; margin-bottom: 10px;\">Error</p>" },
      { label: "Good", language: "html", code: "<p class=\"error-message\">Error</p>\n<!-- In CSS: .error-message { color: red; font-size: 18px; } -->" }
    ],
    keyTakeaway: "Use CSS classes instead of inline styles — they're cacheable, reusable, and maintainable.",
    references: []
  },

  // ── CSS: Organization ──
  "web-devops-config.css.organization-maintainability.are-styles-organized-logically-by-component-by-page-by-concern": {
    whatItMeans: "CSS is organized into logical sections or files — by component, page, or concern — rather than dumped into one massive stylesheet.",
    whyItMatters: "Organized CSS is maintainable. A single 5000-line stylesheet becomes impossible to navigate and causes unintended side effects.",
    howToVerify: "- Check that CSS files have clear sections with comments\n- Verify component styles are co-located or in dedicated files\n- Look for a logical organization pattern (ITCSS, SMACSS, or component-based)",
    exampleComment: "The styles.css file is 3000 lines with no organization. Could we split it into component files (header.css, card.css, form.css)?",
    codeExamples: [],
    keyTakeaway: "Organize CSS by component or concern — avoid monolithic stylesheets.",
    references: []
  },
  "web-devops-config.css.organization-maintainability.are-css-custom-properties-variables-used-for-repeated-values": {
    whatItMeans: "CSS custom properties (`--color-primary`, `--spacing-md`) are used for values repeated across the stylesheet.",
    whyItMatters: "Custom properties enable consistent theming, easy updates, and dark mode support. Changing a color in one place updates it everywhere.",
    howToVerify: "- Look for repeated color values, spacing, and font sizes\n- Check that a `:root` block defines design tokens\n- Verify custom properties have descriptive names",
    exampleComment: "The color `#3b82f6` appears 23 times in the stylesheet. A custom property `--color-primary: #3b82f6` would make updates trivial.",
    codeExamples: [
      { label: "Bad", language: "css", code: ".header { background: #3b82f6; }\n.button { background: #3b82f6; }\n.link { color: #3b82f6; }" },
      { label: "Good", language: "css", code: ":root { --color-primary: #3b82f6; }\n.header { background: var(--color-primary); }\n.button { background: var(--color-primary); }\n.link { color: var(--color-primary); }" }
    ],
    keyTakeaway: "Use CSS custom properties for repeated values — they're the foundation of maintainable CSS.",
    references: []
  },
  "web-devops-config.css.organization-maintainability.are-magic-numbers-avoided-in-favor-of-design-tokens-or-variables": {
    whatItMeans: "Hard-coded pixel values, colors, and spacing are replaced with design tokens or CSS custom properties.",
    whyItMatters: "Magic numbers like `margin-left: 37px` are meaningless and fragile. Design tokens create a consistent, intentional spacing/sizing system.",
    howToVerify: "- Look for arbitrary pixel values (37px, 13px) that don't follow a system\n- Check for hardcoded colors that aren't in the design token set\n- Verify spacing follows a consistent scale",
    exampleComment: "The `margin-left: 37px` is a magic number. Could you use a spacing variable from our scale (`var(--spacing-lg)`) instead?",
    codeExamples: [
      { label: "Bad", language: "css", code: ".card { padding: 13px; margin: 37px; border-radius: 7px; }" },
      { label: "Good", language: "css", code: ".card {\n  padding: var(--spacing-sm);\n  margin: var(--spacing-lg);\n  border-radius: var(--radius-md);\n}" }
    ],
    keyTakeaway: "Replace magic numbers with design tokens — they create consistency and intentional design.",
    references: []
  },
  "web-devops-config.css.organization-maintainability.are-selectors-specific-but-not-over-specific-avoid-long-selector-chains": {
    whatItMeans: "CSS selectors are specific enough to target the intended elements but not so specific that they're brittle and hard to override.",
    whyItMatters: "Over-specific selectors (`div.container > ul.nav > li.item > a.link`) are fragile — any HTML structure change breaks them. They also create specificity wars.",
    howToVerify: "- Check for selectors longer than 3 levels\n- Look for ID selectors used for styling (too specific)\n- Verify classes are preferred over element + descendant selectors",
    exampleComment: "The selector `div.main > section.content > div.wrapper > ul.list > li` is too specific. A class like `.content-list-item` would be more maintainable.",
    codeExamples: [
      { label: "Bad", language: "css", code: "div.main > section.content > div.wrapper > ul.list > li { color: red; }" },
      { label: "Good", language: "css", code: ".content-list-item { color: red; }" }
    ],
    keyTakeaway: "Keep selectors shallow — prefer single classes over long descendant chains.",
    references: []
  },
  "web-devops-config.css.organization-maintainability.are-important-declarations-avoided-except-for-utility-overrides": {
    whatItMeans: "`!important` is avoided in regular styles and only used in utility classes that are explicitly designed to override any other styles.",
    whyItMatters: "`!important` breaks the cascade and creates specificity dead ends. Once used, the only way to override is another `!important`, leading to an arms race.",
    howToVerify: "- Search for `!important` in the diff\n- Verify it's only used in utility classes (like `.hidden { display: none !important; }`)\n- Check if the specificity issue can be solved by restructuring selectors",
    exampleComment: "The `color: red !important` is a specificity hack. Could you increase the selector specificity or restructure to avoid `!important`?",
    codeExamples: [
      { label: "Bad", language: "css", code: ".card-title { color: red !important; }  /* Specificity war */" },
      { label: "Good", language: "css", code: ".card .card-title { color: red; }  /* Higher specificity, no !important */\n/* Or utility: */\n.text-danger { color: red !important; }  /* Intentional utility override */" }
    ],
    keyTakeaway: "Avoid `!important` — fix specificity through better selectors, not by forcing overrides.",
    references: []
  },
  "web-devops-config.css.organization-maintainability.are-naming-conventions-consistent-bem-utility-first-etc": {
    whatItMeans: "CSS class names follow a consistent naming convention (BEM, utility-first, or another documented system) across the codebase.",
    whyItMatters: "Consistent naming makes CSS predictable. When you see `.card__title--active`, you know it's a BEM modifier on the title element of a card block.",
    howToVerify: "- Check that class names follow the project's naming convention\n- Look for mixed naming styles (BEM + camelCase + random)\n- Verify new classes match existing patterns",
    exampleComment: "The new classes use camelCase (`cardTitle`, `mainWrapper`) but the project uses BEM (`card__title`, `main__wrapper`). Could you align with BEM?",
    codeExamples: [
      { label: "Bad", language: "css", code: ".cardTitle { ... }\n.main-wrapper { ... }\n.Card__header { ... }  /* Mixed conventions! */" },
      { label: "Good", language: "css", code: ".card__title { ... }\n.card__title--active { ... }\n.main__wrapper { ... }  /* Consistent BEM */" }
    ],
    keyTakeaway: "Pick a naming convention and use it consistently — BEM is a popular, well-documented choice.",
    references: [
      { title: "BEM Methodology", url: "https://getbem.com/" }
    ]
  },

  // ── CSS: Layout & Responsiveness ──
  "web-devops-config.css.layout-responsiveness.are-modern-layout-techniques-used-flexbox-grid-instead-of-floatstables": {
    whatItMeans: "Flexbox and CSS Grid are used for layout instead of legacy techniques like floats, tables, and absolute positioning hacks.",
    whyItMatters: "Flexbox and Grid are designed for layout — they handle alignment, distribution, and responsiveness naturally. Floats and tables are hacks that require clearfix workarounds.",
    howToVerify: "- Look for `float: left/right` used for layout (use flex instead)\n- Check for `<table>` used for non-tabular layout (use grid instead)\n- Verify flexbox/grid is used appropriately (flex for 1D, grid for 2D)",
    exampleComment: "The sidebar layout uses `float: left` with clearfix. Flexbox (`display: flex`) would be cleaner and handle responsive behavior naturally.",
    codeExamples: [
      { label: "Bad", language: "css", code: ".sidebar { float: left; width: 250px; }\n.content { margin-left: 260px; }\n.clearfix::after { content: ''; clear: both; display: table; }" },
      { label: "Good", language: "css", code: ".layout {\n  display: flex;\n  gap: 1rem;\n}\n.sidebar { flex: 0 0 250px; }\n.content { flex: 1; }" }
    ],
    keyTakeaway: "Use Flexbox for 1D layouts, Grid for 2D — floats and tables are legacy hacks.",
    references: []
  },
  "web-devops-config.css.layout-responsiveness.is-the-layout-responsive-with-appropriate-breakpoints": {
    whatItMeans: "The layout adapts to different screen sizes using media queries with appropriate breakpoints.",
    whyItMatters: "Over 50% of web traffic is mobile. Fixed-width layouts are unusable on small screens and waste space on large ones.",
    howToVerify: "- Resize the browser to check layout at different widths\n- Verify breakpoints match common device sizes\n- Check that content is readable and usable at every breakpoint\n- Look for horizontal scrolling on mobile",
    exampleComment: "The page has a fixed 1200px width that causes horizontal scrolling on mobile. Could you add responsive breakpoints?",
    codeExamples: [
      { label: "Bad", language: "css", code: ".container { width: 1200px; }  /* Fixed width — breaks on mobile */" },
      { label: "Good", language: "css", code: ".container {\n  max-width: 1200px;\n  width: 100%;\n  padding: 0 1rem;\n  margin: 0 auto;\n}" }
    ],
    keyTakeaway: "Use relative units and max-width — fixed widths break on mobile devices.",
    references: []
  },
  "web-devops-config.css.layout-responsiveness.are-mobile-first-media-queries-used": {
    whatItMeans: "CSS starts with mobile styles as the default and adds complexity for larger screens using `min-width` media queries.",
    whyItMatters: "Mobile-first ensures the base CSS works on the smallest screens. Desktop-first (`max-width`) requires overriding styles, leading to bloat.",
    howToVerify: "- Check if media queries use `min-width` (mobile-first) or `max-width` (desktop-first)\n- Verify base styles work on mobile without any media query\n- Look for excessive `max-width` overrides that undo desktop styles",
    exampleComment: "The CSS uses `max-width` (desktop-first) media queries. Mobile-first with `min-width` produces cleaner, more maintainable responsive styles.",
    codeExamples: [
      { label: "Bad", language: "css", code: "/* Desktop-first — base is desktop, override for mobile */\n.nav { display: flex; }\n@media (max-width: 768px) { .nav { display: block; } }" },
      { label: "Good", language: "css", code: "/* Mobile-first — base is mobile, enhance for desktop */\n.nav { display: block; }\n@media (min-width: 768px) { .nav { display: flex; } }" }
    ],
    keyTakeaway: "Write mobile-first CSS — start simple and add complexity for larger screens.",
    references: []
  },
  "web-devops-config.css.layout-responsiveness.are-units-appropriate-remem-for-text-px-for-borders-or-vwvh-for-layout": {
    whatItMeans: "CSS units are chosen appropriately: `rem`/`em` for text (respects user settings), `px` for borders, `vw`/`vh`/`%` for fluid layout.",
    whyItMatters: "Using `px` for font sizes ignores user accessibility preferences. Using `vw` for text without limits creates unreadable sizes on extreme screens.",
    howToVerify: "- Check that font sizes use `rem` or `em`, not `px`\n- Verify borders and shadows can use `px` (they don't need to scale)\n- Check that fluid layouts use `%`, `vw`, or `fr`",
    exampleComment: "The `font-size: 16px` doesn't respect user accessibility settings. Using `font-size: 1rem` scales with the user's preferred font size.",
    codeExamples: [
      { label: "Bad", language: "css", code: "body { font-size: 16px; }  /* Ignores user settings */\n.hero { height: 100vh; font-size: 5vw; }  /* No min/max */" },
      { label: "Good", language: "css", code: "body { font-size: 1rem; }  /* Respects user preferences */\n.hero { height: 100vh; font-size: clamp(1.5rem, 4vw, 3rem); }" }
    ],
    keyTakeaway: "Use `rem` for text, `px` for borders, and `clamp()` for fluid sizing with limits.",
    references: []
  },
  "web-devops-config.css.layout-responsiveness.are-animations-using-transform-and-opacity-for-performance": {
    whatItMeans: "CSS animations use `transform` and `opacity` properties, which are GPU-accelerated, instead of properties that trigger layout reflow.",
    whyItMatters: "Animating `width`, `height`, `top`, `left`, or `margin` triggers expensive layout recalculations. `transform` and `opacity` skip layout and paint.",
    howToVerify: "- Check that animations use `transform` (translate, scale, rotate) not position properties\n- Verify `opacity` is used for fade effects, not `visibility` or `display`\n- Look for `will-change` hints on animated elements",
    exampleComment: "Animating `left` triggers layout reflow on every frame. Use `transform: translateX()` instead for smooth 60fps animation.",
    codeExamples: [
      { label: "Bad", language: "css", code: ".slide-in { animation: slide 0.3s; }\n@keyframes slide {\n  from { left: -100%; }  /* Triggers layout! */\n  to { left: 0; }\n}" },
      { label: "Good", language: "css", code: ".slide-in { animation: slide 0.3s; }\n@keyframes slide {\n  from { transform: translateX(-100%); }  /* GPU-accelerated */\n  to { transform: translateX(0); }\n}" }
    ],
    keyTakeaway: "Animate `transform` and `opacity` only — they're GPU-accelerated and skip layout reflow.",
    references: []
  },

  // ── CSS: Browser Compatibility ──
  "web-devops-config.css.browser-compatibility.are-vendor-prefixes-handled-or-autoprefixer-configured": {
    whatItMeans: "Vendor prefixes are handled automatically by Autoprefixer (or manually added) for CSS features that need them.",
    whyItMatters: "Some CSS features require vendor prefixes in older browsers. Autoprefixer adds them based on your browser support targets.",
    howToVerify: "- Check if Autoprefixer is in the build pipeline (PostCSS config)\n- Look for manual vendor prefixes that Autoprefixer could handle\n- Verify browser targets are configured (`.browserslistrc`)",
    exampleComment: "The `display: flex` doesn't have `-webkit-` prefix for Safari 8. Is Autoprefixer configured? If not, consider adding it to your PostCSS pipeline.",
    codeExamples: [
      { label: "Bad", language: "css", code: "/* No Autoprefixer, no manual prefixes */\n.flex { display: flex; }" },
      { label: "Good", language: "json", code: "// postcss.config.js\nmodule.exports = { plugins: [require('autoprefixer')] }\n\n// .browserslistrc\n> 0.5%, last 2 versions, not dead" }
    ],
    keyTakeaway: "Configure Autoprefixer with browserslist — it handles vendor prefixes automatically.",
    references: []
  },
  "web-devops-config.css.browser-compatibility.are-fallbacks-provided-for-newer-css-features": {
    whatItMeans: "Newer CSS features have fallback styles for browsers that don't support them.",
    whyItMatters: "Using cutting-edge CSS without fallbacks creates broken experiences in older browsers. Progressive enhancement ensures a baseline experience.",
    howToVerify: "- Check that newer features (container queries, :has, subgrid) have fallbacks\n- Verify `@supports` is used to detect feature support\n- Test in the project's target browsers",
    exampleComment: "The `container-type: inline-size` is great but has no fallback. Older browsers will lose the responsive behavior. Add a `@supports` block with a media query fallback.",
    codeExamples: [
      { label: "Bad", language: "css", code: ".card { container-type: inline-size; }  /* No fallback */" },
      { label: "Good", language: "css", code: "/* Fallback for all browsers */\n.card-content { font-size: 1rem; }\n\n/* Enhancement for supporting browsers */\n@supports (container-type: inline-size) {\n  .card { container-type: inline-size; }\n  @container (min-width: 400px) {\n    .card-content { font-size: 1.25rem; }\n  }\n}" }
    ],
    keyTakeaway: "Provide fallbacks for new CSS features — use `@supports` for progressive enhancement.",
    references: []
  },
  "web-devops-config.css.browser-compatibility.are-css-features-checked-against-browser-support-targets": {
    whatItMeans: "New CSS features are checked against the project's browser support targets before use.",
    whyItMatters: "Using features not supported by your target browsers creates broken experiences. Can I Use makes checking easy.",
    howToVerify: "- Check new CSS features on caniuse.com against project targets\n- Verify `.browserslistrc` reflects actual user browser distribution\n- Look for features with less than 90% support in target browsers",
    exampleComment: "The `:has()` selector only has 87% browser support and our targets include older Firefox. Could you add a fallback or wait for broader support?",
    codeExamples: [],
    keyTakeaway: "Check caniuse.com before using new CSS features — ensure they're supported by your target browsers.",
    references: [
      { title: "Can I Use", url: "https://caniuse.com/" }
    ]
  },

  // ── Shell Scripts: Safety & Correctness ──
  "web-devops-config.shell-scripts.safety-correctness.does-the-script-start-with-a-proper-shebang-binbash-or-usrbinenv-bash": {
    whatItMeans: "Shell scripts start with a shebang line (`#!/bin/bash` or `#!/usr/bin/env bash`) specifying the interpreter.",
    whyItMatters: "Without a shebang, the script runs with whatever shell the user is using (could be sh, dash, zsh). Bash-specific features may break silently.",
    howToVerify: "- Check that the first line is a shebang\n- Verify `#!/usr/bin/env bash` is used for portability\n- Check that the script uses features compatible with the specified shell",
    exampleComment: "This script uses bash arrays but has no shebang. When run under `sh` or `dash`, arrays aren't supported and the script fails silently. Add `#!/usr/bin/env bash`.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "# No shebang — runs with whatever shell\necho \"Hello\"" },
      { label: "Good", language: "bash", code: "#!/usr/bin/env bash\necho \"Hello\"" }
    ],
    keyTakeaway: "Always add a shebang — `#!/usr/bin/env bash` is the most portable choice.",
    references: []
  },
  "web-devops-config.shell-scripts.safety-correctness.is-set--euo-pipefail-used-for-strict-error-handling": {
    whatItMeans: "Scripts use `set -euo pipefail` for strict error handling: exit on error, error on undefined variables, and catch pipe failures.",
    whyItMatters: "Without strict mode, scripts continue after errors, potentially running dangerous commands with wrong data. `set -e` stops on first failure.",
    howToVerify: "- Check for `set -euo pipefail` near the top of the script\n- Verify there are no commands that intentionally fail without error handling\n- Check that `|| true` is used for commands that may fail acceptably",
    exampleComment: "This deployment script has no `set -euo pipefail`. If `docker build` fails, the script continues and pushes the old image. Add strict mode to fail fast.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "#!/usr/bin/env bash\ndocker build -t app .\n# If build fails, push still runs!\ndocker push app" },
      { label: "Good", language: "bash", code: "#!/usr/bin/env bash\nset -euo pipefail\ndocker build -t app .  # Script stops here if build fails\ndocker push app" }
    ],
    keyTakeaway: "Always use `set -euo pipefail` — scripts should fail fast, not continue after errors.",
    references: [
      { title: "Bash Strict Mode", url: "http://redsymbol.net/articles/unofficial-bash-strict-mode/" }
    ]
  },
  "web-devops-config.shell-scripts.safety-correctness.are-all-variables-quoted-to-prevent-word-splitting-and-globbing": {
    whatItMeans: "All variable expansions are double-quoted (`\"$var\"`) to prevent word splitting and glob expansion.",
    whyItMatters: "Unquoted variables cause bugs when values contain spaces, wildcards, or special characters. `rm $file` with `file=\"my file.txt\"` deletes `my` and `file.txt` separately!",
    howToVerify: "- Check that all `$var` usages are quoted: `\"$var\"`\n- Run ShellCheck to catch unquoted variables\n- Look for `for f in $files` instead of `for f in \"${files[@]}\"`",
    exampleComment: "The unquoted `$filename` will break if the path contains spaces. Use `\"$filename\"` everywhere.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "cp $source $destination  # Breaks on spaces!\nif [ -f $config ]; then  # Breaks on spaces!" },
      { label: "Good", language: "bash", code: "cp \"$source\" \"$destination\"\nif [ -f \"$config\" ]; then" }
    ],
    keyTakeaway: "Always double-quote variables — `\"$var\"` prevents word splitting and glob bugs.",
    references: []
  },
  "web-devops-config.shell-scripts.safety-correctness.are-user-inputs-validated-and-sanitized": {
    whatItMeans: "Script arguments and user inputs are validated before use, especially before being passed to commands or used in file paths.",
    whyItMatters: "Unvalidated input in scripts can lead to command injection, path traversal, and data destruction. `rm -rf \"$user_input\"` is terrifying.",
    howToVerify: "- Check that script arguments are validated (non-empty, expected format)\n- Look for user input used in `rm`, `mv`, `cp` commands without validation\n- Verify inputs aren't passed to `eval` or used in command construction",
    exampleComment: "The `$1` argument is used directly in `rm -rf \"/data/$1\"`. If someone passes `../`, this deletes `/data/../`. Validate the input first.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "rm -rf \"/data/$1\"  # What if $1 is \"../../\"?" },
      { label: "Good", language: "bash", code: "if [[ ! \"$1\" =~ ^[a-zA-Z0-9_-]+$ ]]; then\n  echo \"Invalid directory name: $1\" >&2\n  exit 1\nfi\nrm -rf \"/data/$1\"" }
    ],
    keyTakeaway: "Validate all script inputs — especially before destructive commands like `rm`.",
    references: []
  },
  "web-devops-config.shell-scripts.safety-correctness.is-shellcheck-passing-with-no-warnings": {
    whatItMeans: "The script passes ShellCheck, a static analysis tool that catches common shell scripting bugs.",
    whyItMatters: "ShellCheck catches real bugs: unquoted variables, globbing issues, POSIX incompatibilities, and incorrect syntax. Its warnings are almost always correct.",
    howToVerify: "- Run `shellcheck script.sh` on changed shell scripts\n- Check CI for ShellCheck integration\n- Verify any disabled warnings have documentation",
    exampleComment: "ShellCheck reports SC2086 (unquoted variable) on line 15 and SC2034 (unused variable) on line 3. Could you address these warnings?",
    codeExamples: [
      { label: "Bad", language: "bash", code: "# shellcheck disabled without justification\n# shellcheck disable=SC2086\necho $unquoted_var" },
      { label: "Good", language: "bash", code: "echo \"$quoted_var\"\n# shellcheck disable=SC2086 # Intentional: word splitting needed for flags\n$cmd $flags" }
    ],
    keyTakeaway: "Run ShellCheck on all scripts — it catches bugs that even experienced shell programmers miss.",
    references: [
      { title: "ShellCheck", url: "https://www.shellcheck.net/" }
    ]
  },
  "web-devops-config.shell-scripts.safety-correctness.are-temporary-files-created-with-mktemp-and-cleaned-up-with-traps": {
    whatItMeans: "Temporary files are created with `mktemp` (safe, unique names) and cleaned up with `trap` to handle script interruptions.",
    whyItMatters: "Predictable temp file names enable symlink attacks. Without `trap` cleanup, interrupted scripts leave temp files behind.",
    howToVerify: "- Check that `mktemp` is used instead of hardcoded temp file names\n- Verify `trap` is set up to clean up on EXIT, INT, TERM\n- Look for temp files in `/tmp` with predictable names",
    exampleComment: "The temp file `/tmp/myapp_data.txt` has a predictable name. Use `mktemp` for a unique name and add a `trap` for cleanup.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "tmpfile=\"/tmp/myapp_data.txt\"  # Predictable name — symlink attack!\nprocess > \"$tmpfile\"" },
      { label: "Good", language: "bash", code: "tmpfile=$(mktemp)\ntrap 'rm -f \"$tmpfile\"' EXIT\nprocess > \"$tmpfile\"" }
    ],
    keyTakeaway: "Use `mktemp` for temp files and `trap 'cleanup' EXIT` for guaranteed cleanup.",
    references: []
  },
  "web-devops-config.shell-scripts.safety-correctness.are-exit-codes-used-meaningfully": {
    whatItMeans: "Scripts return meaningful exit codes: 0 for success, non-zero for specific failure types.",
    whyItMatters: "Exit codes are how scripts communicate success/failure to callers, CI systems, and other scripts. Incorrect codes cause silent failures in pipelines.",
    howToVerify: "- Check that the script exits with non-zero on error\n- Verify different error types have different exit codes\n- Look for missing `exit 1` in error handling branches",
    exampleComment: "The error handling prints an error message but exits with code 0 (success). The calling CI pipeline thinks it succeeded. Add `exit 1`.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "if ! docker build -t app .; then\n  echo \"Build failed\"\n  # Missing exit 1! Script continues or exits 0\nfi" },
      { label: "Good", language: "bash", code: "if ! docker build -t app .; then\n  echo \"Build failed\" >&2\n  exit 1\nfi" }
    ],
    keyTakeaway: "Exit with non-zero on error — callers depend on exit codes to detect failures.",
    references: []
  },

  // ── Shell Scripts: Readability & Portability ──
  "web-devops-config.shell-scripts.readability-portability.are-functions-used-to-organize-complex-logic": {
    whatItMeans: "Complex scripts use functions to organize logic into named, reusable, testable units.",
    whyItMatters: "A 200-line monolithic script is hard to understand and maintain. Functions with descriptive names make the flow clear.",
    howToVerify: "- Check that scripts over ~50 lines use functions\n- Verify a `main` function orchestrates the flow\n- Look for repeated code that could be extracted into functions",
    exampleComment: "This 150-line deploy script would be clearer with functions: `build_image()`, `push_image()`, `deploy_to_k8s()`, `verify_health()`.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "#!/usr/bin/env bash\nset -euo pipefail\n# 150 lines of mixed build, push, deploy, verify logic..." },
      { label: "Good", language: "bash", code: "#!/usr/bin/env bash\nset -euo pipefail\n\nbuild_image() { docker build -t \"$IMAGE\" .; }\npush_image() { docker push \"$IMAGE\"; }\ndeploy() { kubectl apply -f deploy.yml; }\nverify() { curl -sf \"$HEALTH_URL\"; }\n\nmain() {\n  build_image\n  push_image\n  deploy\n  verify\n}\nmain \"$@\"" }
    ],
    keyTakeaway: "Use functions in scripts — they make the flow readable and logic reusable.",
    references: []
  },
  "web-devops-config.shell-scripts.readability-portability.are-variable-names-descriptive-and-in-uppercase-for-exports-lowercase-for-local": {
    whatItMeans: "Variable names are descriptive, with UPPERCASE for exported/environment variables and lowercase for local script variables.",
    whyItMatters: "This convention prevents accidentally overwriting environment variables and makes it clear which variables are local vs. exported.",
    howToVerify: "- Check that local variables use lowercase: `local file_path`\n- Verify exported variables use UPPERCASE: `export DATABASE_URL`\n- Look for single-letter variable names outside of loops",
    exampleComment: "The variable `D` should have a descriptive name like `deploy_dir`. Also, local variables should use lowercase to distinguish from environment variables.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "D=\"/opt/app\"\nP=8080\nfor x in $D/*; do echo $x; done" },
      { label: "Good", language: "bash", code: "deploy_dir=\"/opt/app\"\nport=8080\nexport APP_PORT=\"$port\"\nfor file in \"$deploy_dir\"/*; do echo \"$file\"; done" }
    ],
    keyTakeaway: "UPPERCASE for exports, lowercase for locals — descriptive names for both.",
    references: []
  },
  "web-devops-config.shell-scripts.readability-portability.are-complex-commands-commented-for-clarity": {
    whatItMeans: "Complex commands (long pipes, obscure flags, regex patterns) have comments explaining what they do.",
    whyItMatters: "Shell commands can be cryptic. A comment explaining `find . -name '*.log' -mtime +30 -delete` saves the next reader minutes of investigation.",
    howToVerify: "- Look for complex pipes, find commands, awk/sed one-liners without comments\n- Check that regex patterns are explained\n- Verify non-obvious flags are documented",
    exampleComment: "The `tar czf - . | ssh remote 'cat > /backup/app.tar.gz'` is not obvious. Could you add a comment explaining that this creates a compressed tar and streams it to the remote server?",
    codeExamples: [
      { label: "Bad", language: "bash", code: "find /var/log -name '*.log' -mtime +30 -exec gzip {} \\;" },
      { label: "Good", language: "bash", code: "# Compress log files older than 30 days to save disk space\nfind /var/log -name '*.log' -mtime +30 -exec gzip {} \\;" }
    ],
    keyTakeaway: "Comment complex shell commands — they're write-once, read-many.",
    references: []
  },
  "web-devops-config.shell-scripts.readability-portability.are-posix-compatible-constructs-used-where-portability-matters": {
    whatItMeans: "Scripts that need to run on different systems use POSIX-compatible constructs instead of Bash-specific features.",
    whyItMatters: "Bash isn't available everywhere — Alpine containers use ash, Debian uses dash for /bin/sh. POSIX scripts work on all Unix-like systems.",
    howToVerify: "- Check if the script needs to be portable (CI, Docker, embedded)\n- If using `#!/bin/sh`, verify only POSIX features are used\n- If Bash-specific features are needed, use `#!/bin/bash`",
    exampleComment: "This script uses `#!/bin/sh` but uses Bash arrays and `[[ ]]`. Either change to `#!/bin/bash` or use POSIX equivalents.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "#!/bin/sh\narr=(1 2 3)  # Bash-only!\nif [[ \"$x\" =~ regex ]]; then  # Bash-only!" },
      { label: "Good", language: "bash", code: "#!/bin/sh\n# POSIX-compatible\nif [ \"$x\" = \"value\" ]; then\n  echo \"match\"\nfi" }
    ],
    keyTakeaway: "Match the shebang to the features used — `#!/bin/sh` means POSIX only.",
    references: []
  },
  "web-devops-config.shell-scripts.readability-portability.is-used-instead-of-for-conditional-expressions-in-bash": {
    whatItMeans: "Bash scripts use `[[ ]]` for conditional expressions instead of `[ ]`, gaining regex support, pattern matching, and safer behavior.",
    whyItMatters: "`[[ ]]` handles word splitting, glob expansion, and unquoted variables safely. `[ ]` is more error-prone with special characters.",
    howToVerify: "- Check that Bash scripts use `[[ ]]` for conditions, not `[ ]`\n- Verify POSIX scripts stick with `[ ]` (no `[[ ]]`)\n- Look for common `[ ]` pitfalls (unquoted variables, wrong operators)",
    exampleComment: "In Bash, `[[ -n $var ]]` is safer than `[ -n $var ]` because `[[ ]]` doesn't do word splitting. Since we're using `#!/bin/bash`, prefer `[[ ]]`.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "#!/bin/bash\nif [ -n $var ]; then  # Breaks if var is empty or has spaces" },
      { label: "Good", language: "bash", code: "#!/bin/bash\nif [[ -n \"$var\" ]]; then  # Safe in all cases" }
    ],
    keyTakeaway: "Use `[[ ]]` in Bash scripts — it's safer than `[ ]` for all comparisons.",
    references: []
  },
  "web-devops-config.shell-scripts.readability-portability.are-heredocs-or-printf-used-instead-of-echo-for-multi-line-output": {
    whatItMeans: "Multi-line output uses heredocs or `printf` instead of multiple `echo` calls, which handles special characters inconsistently.",
    whyItMatters: "`echo` behavior varies across shells (handling of `-n`, `-e`, backslashes). `printf` and heredocs are portable and predictable.",
    howToVerify: "- Look for multiple sequential `echo` calls that could be a heredoc\n- Check for `echo -e` (not portable) — use `printf` instead\n- Verify heredocs use appropriate quoting (quoted delimiter prevents expansion)",
    exampleComment: "The `echo -e` flag isn't portable. Use `printf` or a heredoc for multi-line output with special characters.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "echo -e \"Line 1\\nLine 2\\nLine 3\"  # -e not portable" },
      { label: "Good", language: "bash", code: "cat <<EOF\nLine 1\nLine 2\nLine 3\nEOF" }
    ],
    keyTakeaway: "Use heredocs for multi-line output and `printf` for formatted strings — avoid `echo -e`.",
    references: []
  },

  // ── Shell Scripts: Security ──
  "web-devops-config.shell-scripts.security.are-secrets-not-hardcoded-in-scripts": {
    whatItMeans: "Passwords, API keys, and tokens are not hardcoded in shell scripts. They're loaded from environment variables or secret managers.",
    whyItMatters: "Shell scripts are often committed to version control. Hardcoded secrets in scripts end up in git history and are easily discovered.",
    howToVerify: "- Search for hardcoded passwords, API keys, tokens in scripts\n- Check that secrets use environment variables\n- Verify `.env` files are in `.gitignore`",
    exampleComment: "The `API_KEY='sk_live_...'` is hardcoded in the deploy script. Move it to an environment variable or CI secret.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "API_KEY=\"sk_live_abc123\"\ncurl -H \"Authorization: Bearer $API_KEY\" https://api.example.com" },
      { label: "Good", language: "bash", code: "if [[ -z \"${API_KEY:-}\" ]]; then\n  echo \"Error: API_KEY not set\" >&2\n  exit 1\nfi\ncurl -H \"Authorization: Bearer $API_KEY\" https://api.example.com" }
    ],
    keyTakeaway: "Never hardcode secrets in scripts — use environment variables and verify they're set.",
    references: []
  },
  "web-devops-config.shell-scripts.security.are-file-permissions-set-correctly-not-world-writable": {
    whatItMeans: "Files created by scripts have appropriate permissions — not world-writable, not world-readable for sensitive files.",
    whyItMatters: "World-writable files can be modified by any user on the system, enabling privilege escalation. Sensitive files should be owner-only.",
    howToVerify: "- Check `chmod` calls for appropriate permissions\n- Verify config files with secrets use `600` (owner read/write only)\n- Look for `777` or `666` permissions — these are almost always wrong",
    exampleComment: "The `chmod 777` on the config file makes it world-readable and writable. Use `chmod 600` for files with credentials.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "chmod 777 /etc/app/config.yml  # World-readable and writable!" },
      { label: "Good", language: "bash", code: "chmod 600 /etc/app/config.yml  # Owner read/write only" }
    ],
    keyTakeaway: "Use restrictive permissions — `600` for secrets, `755` for executables, never `777`.",
    references: []
  },
  "web-devops-config.shell-scripts.security.is-eval-avoided-or-used-with-extreme-caution": {
    whatItMeans: "`eval` is avoided because it executes arbitrary strings as code, enabling command injection.",
    whyItMatters: "`eval \"$user_input\"` executes whatever the user provides as shell commands. This is a critical security vulnerability.",
    howToVerify: "- Search for `eval` in the diff — almost always avoidable\n- If `eval` is used, verify the input is completely controlled (never user input)\n- Check for indirect command execution patterns",
    exampleComment: "The `eval \"$cmd\"` executes arbitrary commands from a variable. If this variable is influenced by user input, this is a command injection vulnerability.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "eval \"$user_command\"  # Command injection!" },
      { label: "Good", language: "bash", code: "# Use arrays for dynamic commands\ncmd=(docker build -t \"$tag\" .)\n\"${cmd[@]}\"" }
    ],
    keyTakeaway: "Avoid `eval` — use arrays for dynamic commands and never evaluate user input as code.",
    references: []
  },
  "web-devops-config.shell-scripts.security.are-command-injection-vectors-prevented-when-using-user-input": {
    whatItMeans: "User input is never directly interpolated into command strings where shell metacharacters could be interpreted.",
    whyItMatters: "Command injection allows attackers to execute arbitrary commands. `grep \"$input\" file` with `input='; rm -rf /'` is devastating.",
    howToVerify: "- Check for user input in command strings without sanitization\n- Verify `--` is used to separate options from arguments\n- Look for user input passed to `sed`, `awk`, or `grep` patterns",
    exampleComment: "The `grep \"$search_term\"` can be exploited with malicious regex or shell metacharacters. Use `grep -F -- \"$search_term\"` for literal, safe matching.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "grep $user_input /var/log/app.log  # Injection risk!" },
      { label: "Good", language: "bash", code: "grep -F -- \"$user_input\" /var/log/app.log  # Fixed string, safe" }
    ],
    keyTakeaway: "Sanitize user input, use `--` to end options, and use `-F` for literal string matching.",
    references: []
  },
  "web-devops-config.shell-scripts.security.are-downloaded-scriptsbinaries-verified-with-checksums": {
    whatItMeans: "Scripts or binaries downloaded during builds or deployments are verified with checksums (SHA-256) to ensure integrity.",
    whyItMatters: "Downloading and executing unverified scripts is a supply chain attack vector. Checksum verification ensures the downloaded file hasn't been tampered with.",
    howToVerify: "- Check that downloaded files have SHA-256 checksums verified\n- Look for `curl | bash` patterns — always verify before executing\n- Verify the checksum is pinned in the script, not fetched from the same source",
    exampleComment: "The `curl -sSL https://install.example.com | bash` downloads and executes without verification. Please download, verify the checksum, then execute.",
    codeExamples: [
      { label: "Bad", language: "bash", code: "curl -sSL https://example.com/install.sh | bash  # No verification!" },
      { label: "Good", language: "bash", code: "curl -sSL -o install.sh https://example.com/install.sh\necho \"abc123...expected_sha256  install.sh\" | sha256sum -c -\nbash install.sh" }
    ],
    keyTakeaway: "Always verify checksums for downloaded files — never `curl | bash` without verification.",
    references: []
  },

  // ── Dockerfile: Build Efficiency ──
  "web-devops-config.dockerfile.build-efficiency.is-a-multi-stage-build-used-to-minimize-final-image-size": {
    whatItMeans: "The Dockerfile uses multi-stage builds to separate build-time dependencies from the final runtime image.",
    whyItMatters: "Build tools, compilers, and source code in the final image increase size by 5-10x and expand the attack surface. Multi-stage builds keep runtime images lean.",
    howToVerify: "- Check for multiple `FROM` statements (multi-stage)\n- Verify build tools are only in the builder stage\n- Check that the final stage copies only the compiled artifacts",
    exampleComment: "The final image includes gcc, make, and source code (800MB). A multi-stage build would produce a ~50MB runtime image with only the binary.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "FROM node:20\nCOPY . .\nRUN npm install && npm run build\nCMD [\"node\", \"dist/index.js\"]\n# Image: 1.2GB with all dev dependencies" },
      { label: "Good", language: "dockerfile", code: "FROM node:20 AS builder\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-slim\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules\nCMD [\"node\", \"dist/index.js\"]\n# Image: ~200MB" }
    ],
    keyTakeaway: "Use multi-stage builds — separate build tools from the runtime image.",
    references: [
      { title: "Multi-stage builds", url: "https://docs.docker.com/build/building/multi-stage/" }
    ]
  },
  "web-devops-config.dockerfile.build-efficiency.are-layers-ordered-for-optimal-cache-utilization-least-changing-first": {
    whatItMeans: "Dockerfile instructions are ordered so that least-frequently-changing layers come first, maximizing Docker's build cache.",
    whyItMatters: "Docker caches layers. When a layer changes, all subsequent layers are rebuilt. Putting `COPY package.json` before `COPY .` means source changes don't invalidate the dependency install layer.",
    howToVerify: "- Check that dependency files (package.json, requirements.txt) are copied before source code\n- Verify system package installs come before application code\n- Look for `COPY . .` that should be split into dependency files first",
    exampleComment: "The `COPY . .` before `RUN npm install` means every source change invalidates the npm install cache. Copy `package*.json` first, then install, then copy source.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "COPY . .  # Any change invalidates npm install cache\nRUN npm install" },
      { label: "Good", language: "dockerfile", code: "COPY package*.json ./\nRUN npm ci  # Cached unless package.json changes\nCOPY . ." }
    ],
    keyTakeaway: "Order layers from least to most frequently changing — dependencies before source code.",
    references: []
  },
  "web-devops-config.dockerfile.build-efficiency.are-copy-commands-specific-instead-of-copying-the-entire-context": {
    whatItMeans: "COPY commands specify exactly what files to copy instead of using `COPY . .` which copies the entire build context.",
    whyItMatters: "Copying everything includes test files, documentation, local configs, and potentially secrets. Specific copies reduce image size and improve cache efficiency.",
    howToVerify: "- Check for `COPY . .` that could be more specific\n- Verify `.dockerignore` excludes unnecessary files\n- Look for test files, docs, or local configs in the image",
    exampleComment: "The `COPY . .` copies test files, docs, and local configs into the image. Either use specific COPY commands or ensure `.dockerignore` excludes these.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "COPY . .  # Copies tests, docs, .env, node_modules..." },
      { label: "Good", language: "dockerfile", code: "COPY package*.json ./\nRUN npm ci --production\nCOPY src/ ./src/\nCOPY config/ ./config/" }
    ],
    keyTakeaway: "Be specific with COPY — or use `.dockerignore` to exclude unnecessary files.",
    references: []
  },
  "web-devops-config.dockerfile.build-efficiency.is-a-dockerignore-file-present-and-maintained": {
    whatItMeans: "A `.dockerignore` file excludes unnecessary files (node_modules, .git, tests, docs) from the Docker build context.",
    whyItMatters: "Without `.dockerignore`, the entire directory (including `.git`, `node_modules`, and large files) is sent to the Docker daemon, slowing builds dramatically.",
    howToVerify: "- Check that `.dockerignore` exists\n- Verify it excludes `.git`, `node_modules`, test files, docs, and `.env`\n- Check that it doesn't exclude files needed by the build",
    exampleComment: "There's no `.dockerignore` file. The 500MB `.git` directory and `node_modules` are being sent to the Docker daemon on every build.",
    codeExamples: [
      { label: "Bad", language: "text", code: "# No .dockerignore — everything is sent to daemon" },
      { label: "Good", language: "text", code: "# .dockerignore\n.git\nnode_modules\n*.md\ntests/\n.env\n.env.*\ncoverage/" }
    ],
    keyTakeaway: "Always have a `.dockerignore` — it dramatically speeds up builds and prevents leaking secrets.",
    references: []
  },
  "web-devops-config.dockerfile.build-efficiency.are-run-commands-combined-with-to-reduce-layers": {
    whatItMeans: "Related RUN commands are combined with `&&` to reduce the number of image layers and image size.",
    whyItMatters: "Each RUN creates a layer. Separate `apt-get update` and `apt-get install` layers mean the update layer is cached independently, potentially installing stale packages.",
    howToVerify: "- Check for separate RUN commands that should be combined\n- Verify `apt-get update && apt-get install` are in the same RUN\n- Look for cleanup commands in separate RUN layers (they don't reduce size)",
    exampleComment: "The `RUN apt-get update` and `RUN apt-get install` should be combined. Separate layers mean the package list can become stale.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "RUN apt-get update\nRUN apt-get install -y curl\nRUN rm -rf /var/lib/apt/lists/*  # Too late! Layer already saved" },
      { label: "Good", language: "dockerfile", code: "RUN apt-get update && \\\n    apt-get install -y --no-install-recommends curl && \\\n    rm -rf /var/lib/apt/lists/*" }
    ],
    keyTakeaway: "Combine related RUN commands — install and clean up in the same layer.",
    references: []
  },
  "web-devops-config.dockerfile.build-efficiency.are-package-manager-caches-cleaned-in-the-same-layer-as-install": {
    whatItMeans: "Package manager caches (apt, pip, npm) are cleaned in the same RUN layer as the install to actually reduce image size.",
    whyItMatters: "Cleaning in a separate layer doesn't reduce size — Docker layers are additive. The cache exists in the install layer even if removed in a later one.",
    howToVerify: "- Check that cleanup happens in the same RUN as install\n- Verify `apt-get clean && rm -rf /var/lib/apt/lists/*` is in the install RUN\n- Check for `pip install --no-cache-dir` for Python packages",
    exampleComment: "The `rm -rf /var/cache/apt` is in a separate RUN layer, so it doesn't save space. Move it into the same RUN as `apt-get install`.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "RUN pip install -r requirements.txt\nRUN rm -rf /root/.cache/pip  # Separate layer — doesn't save space!" },
      { label: "Good", language: "dockerfile", code: "RUN pip install --no-cache-dir -r requirements.txt" }
    ],
    keyTakeaway: "Clean caches in the same RUN layer as the install — separate layers don't save space.",
    references: []
  },

  // ── Dockerfile: Security ──
  "web-devops-config.dockerfile.security.is-the-base-image-pinned-to-a-specific-digest-or-version-tag-not-latest": {
    whatItMeans: "Base images use a specific version tag or SHA digest instead of `latest`, ensuring reproducible builds.",
    whyItMatters: "`latest` changes without warning. A build that worked yesterday may break or introduce vulnerabilities today. Pinned versions ensure reproducibility.",
    howToVerify: "- Check for `FROM image:latest` or `FROM image` (implicit latest)\n- Verify a specific version tag is used: `FROM node:20.11-slim`\n- For maximum reproducibility, use SHA digest: `FROM node@sha256:abc...`",
    exampleComment: "The `FROM python:latest` should be pinned to a specific version like `FROM python:3.12-slim`. `latest` changes without notice and may break your build.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "FROM python:latest\nFROM node" },
      { label: "Good", language: "dockerfile", code: "FROM python:3.12-slim\nFROM node:20.11-slim" }
    ],
    keyTakeaway: "Pin base image versions — `latest` is unpredictable and breaks reproducibility.",
    references: []
  },
  "web-devops-config.dockerfile.security.is-the-container-running-as-a-non-root-user": {
    whatItMeans: "The container runs as a non-root user, reducing the impact of container escape vulnerabilities.",
    whyItMatters: "If an attacker escapes a root container, they have root on the host. Non-root containers limit the blast radius of compromises.",
    howToVerify: "- Check for `USER` instruction in the Dockerfile\n- Verify a non-root user is created and switched to before CMD\n- Check that the application files are owned by the non-root user",
    exampleComment: "The container runs as root by default. Could you add a non-root user? `RUN adduser --system --no-create-home appuser` and `USER appuser`.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "FROM node:20-slim\nCOPY . .\nCMD [\"node\", \"index.js\"]  # Running as root!" },
      { label: "Good", language: "dockerfile", code: "FROM node:20-slim\nRUN adduser --system --no-create-home appuser\nCOPY --chown=appuser . .\nUSER appuser\nCMD [\"node\", \"index.js\"]" }
    ],
    keyTakeaway: "Always run containers as non-root — it's the single most impactful container security practice.",
    references: []
  },
  "web-devops-config.dockerfile.security.are-secrets-not-baked-into-the-image-use-build-secrets-or-runtime-injection": {
    whatItMeans: "Secrets are not embedded in Docker images via ENV, ARG, or COPY. They're injected at runtime or use BuildKit secrets.",
    whyItMatters: "Anyone with image access can extract secrets from ENV variables and layers. Secrets baked into images end up in registries and CI caches.",
    howToVerify: "- Check for `ENV SECRET=...` or `ARG SECRET=...` with real values\n- Look for COPY of `.env` or credential files into the image\n- Verify secrets use runtime injection or BuildKit `--mount=type=secret`",
    exampleComment: "The `ENV API_KEY=sk_live_...` bakes the secret into every layer of the image. Use runtime environment variables or Docker secrets instead.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "ENV API_KEY=sk_live_abc123  # Baked into image!\nCOPY .env /app/.env  # Secrets in image!" },
      { label: "Good", language: "dockerfile", code: "# Secrets injected at runtime:\n# docker run -e API_KEY=sk_live_abc123 myapp\n\n# Or with BuildKit secrets (build-time only):\nRUN --mount=type=secret,id=api_key cat /run/secrets/api_key" }
    ],
    keyTakeaway: "Never bake secrets into images — use runtime environment variables or Docker secrets.",
    references: []
  },
  "web-devops-config.dockerfile.security.are-unnecessary-tools-removed-from-the-final-image": {
    whatItMeans: "The final image doesn't contain unnecessary tools (compilers, debuggers, shells, package managers) that could aid attackers.",
    whyItMatters: "Attack tools like `curl`, `wget`, `nc`, and shells make it easier for attackers to pivot from a compromised container. Minimal images reduce attack surface.",
    howToVerify: "- Check if multi-stage builds exclude build tools from the final image\n- Look for unnecessary packages in the final stage\n- Verify distroless or slim base images are used where possible",
    exampleComment: "The final image includes gcc, make, and git from the build stage. Use a multi-stage build to keep only the runtime binary in the final image.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "FROM python:3.12\nRUN apt-get install -y gcc libpq-dev\n# gcc stays in final image" },
      { label: "Good", language: "dockerfile", code: "FROM python:3.12 AS builder\nRUN apt-get install -y gcc libpq-dev\nRUN pip install --no-cache-dir -r requirements.txt\n\nFROM python:3.12-slim\nCOPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12\n# No gcc in final image" }
    ],
    keyTakeaway: "Keep final images minimal — multi-stage builds exclude build tools from the runtime image.",
    references: []
  },
  "web-devops-config.dockerfile.security.is-the-image-scanned-for-vulnerabilities-trivy-snyk": {
    whatItMeans: "Docker images are scanned for known vulnerabilities using tools like Trivy, Snyk, or Grype.",
    whyItMatters: "Base images and installed packages often contain known CVEs. Scanning catches vulnerabilities before images reach production.",
    howToVerify: "- Check CI for image scanning steps\n- Run `trivy image myapp:latest` locally\n- Verify critical/high vulnerabilities are addressed",
    exampleComment: "The CI pipeline doesn't scan Docker images. Could you add a Trivy scan step? `trivy image --severity HIGH,CRITICAL myapp:latest`.",
    codeExamples: [
      { label: "Bad", language: "yaml", code: "# No image scanning in CI" },
      { label: "Good", language: "yaml", code: "# CI step:\n- run: trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest" }
    ],
    keyTakeaway: "Scan images in CI — Trivy catches CVEs in base images and installed packages.",
    references: [
      { title: "Trivy", url: "https://aquasecurity.github.io/trivy/" }
    ]
  },
  "web-devops-config.dockerfile.security.are-healthcheck-instructions-defined": {
    whatItMeans: "The Dockerfile includes a HEALTHCHECK instruction so Docker knows how to check if the container is healthy.",
    whyItMatters: "Without HEALTHCHECK, Docker can't detect if the application inside the container has crashed or become unresponsive. Orchestrators rely on health checks for restart decisions.",
    howToVerify: "- Check for `HEALTHCHECK` instruction in the Dockerfile\n- Verify the health check command actually tests application health\n- Check the interval, timeout, and retries settings",
    exampleComment: "The Dockerfile has no HEALTHCHECK. Docker can't detect if the app becomes unresponsive. Add `HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1`.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "# No health check — Docker can't detect unresponsive app" },
      { label: "Good", language: "dockerfile", code: "HEALTHCHECK --interval=30s --timeout=5s --retries=3 \\\n  CMD curl -f http://localhost:8080/health || exit 1" }
    ],
    keyTakeaway: "Add HEALTHCHECK to Dockerfiles — it enables Docker to detect and restart unhealthy containers.",
    references: []
  },

  // ── Dockerfile: Best Practices ──
  "web-devops-config.dockerfile.best-practices.are-entrypoint-and-cmd-used-correctly-exec-form-not-shell-form": {
    whatItMeans: "ENTRYPOINT and CMD use exec form (`[\"executable\", \"arg\"]`) instead of shell form (`executable arg`) so signals are handled correctly.",
    whyItMatters: "Shell form wraps the process in `/bin/sh -c`, which doesn't forward signals (SIGTERM). The process can't shut down gracefully on container stop.",
    howToVerify: "- Check that CMD and ENTRYPOINT use JSON array (exec) form\n- Verify the process receives SIGTERM directly (not through sh)\n- Test graceful shutdown: `docker stop` should exit within seconds",
    exampleComment: "The `CMD node index.js` (shell form) won't receive SIGTERM. Use `CMD [\"node\", \"index.js\"]` (exec form) for proper signal handling.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "CMD node index.js  # Shell form — signals not forwarded!" },
      { label: "Good", language: "dockerfile", code: "CMD [\"node\", \"index.js\"]  # Exec form — signals forwarded correctly" }
    ],
    keyTakeaway: "Use exec form `[\"cmd\", \"arg\"]` for CMD and ENTRYPOINT — shell form breaks signal handling.",
    references: []
  },
  "web-devops-config.dockerfile.best-practices.are-expose-ports-documented-and-correct": {
    whatItMeans: "EXPOSE instructions document which ports the container listens on, and the values are correct.",
    whyItMatters: "EXPOSE doesn't publish ports but documents them. Correct EXPOSE instructions help operators understand which ports to publish with `-p`.",
    howToVerify: "- Check that EXPOSE matches the port the application actually listens on\n- Verify the protocol is specified if not TCP (e.g., `EXPOSE 53/udp`)\n- Look for applications listening on different ports than documented",
    exampleComment: "The app listens on port 3000 but the Dockerfile has `EXPOSE 8080`. Could you update it to match?",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "EXPOSE 8080  # But app listens on 3000!" },
      { label: "Good", language: "dockerfile", code: "EXPOSE 3000  # Matches the app's configured port" }
    ],
    keyTakeaway: "EXPOSE documents the port — make sure it matches what the application actually uses.",
    references: []
  },
  "web-devops-config.dockerfile.best-practices.are-environment-variables-used-for-configuration-not-hardcoded-values": {
    whatItMeans: "Application configuration uses environment variables rather than hardcoded values, making the image configurable at runtime.",
    whyItMatters: "Hardcoded config requires rebuilding the image for each environment. Environment variables allow the same image in dev, staging, and production.",
    howToVerify: "- Check for hardcoded URLs, ports, or config values in the Dockerfile\n- Verify ENV defaults are appropriate for production\n- Look for config files baked into the image that could be templated",
    exampleComment: "The database URL is hardcoded in the Dockerfile. Use `ENV DATABASE_URL=` with a default, then override at runtime with `-e`.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "ENV DATABASE_URL=postgres://prod-db:5432/app  # Hardcoded!" },
      { label: "Good", language: "dockerfile", code: "ENV PORT=3000\nENV NODE_ENV=production\n# DATABASE_URL injected at runtime:\n# docker run -e DATABASE_URL=... myapp" }
    ],
    keyTakeaway: "Use environment variables for configuration — build once, deploy everywhere.",
    references: []
  },
  "web-devops-config.dockerfile.best-practices.is-label-used-for-image-metadata-maintainer-version": {
    whatItMeans: "LABEL instructions provide metadata (maintainer, version, description) for the Docker image.",
    whyItMatters: "Labels help identify images in registries, debugging, and automation. They're queryable with `docker inspect` and filtering.",
    howToVerify: "- Check for LABEL with maintainer, version, and description\n- Verify labels follow the OCI annotation standard\n- Look for deprecated MAINTAINER instruction (use LABEL instead)",
    exampleComment: "Could you add LABELs for maintainer and version? They help with image identification in the registry.",
    codeExamples: [
      { label: "Bad", language: "dockerfile", code: "FROM node:20-slim\n# No metadata" },
      { label: "Good", language: "dockerfile", code: "FROM node:20-slim\nLABEL org.opencontainers.image.title=\"My App\"\nLABEL org.opencontainers.image.version=\"1.2.3\"\nLABEL org.opencontainers.image.authors=\"team@example.com\"" }
    ],
    keyTakeaway: "Add LABELs for image metadata — they help with identification, debugging, and automation.",
    references: []
  },
  "web-devops-config.dockerfile.best-practices.are-signals-handled-correctly-for-graceful-shutdown-sigterm": {
    whatItMeans: "The application handles SIGTERM for graceful shutdown — finishing in-flight requests, closing connections, and cleaning up.",
    whyItMatters: "Docker sends SIGTERM on `docker stop`. If not handled, Docker waits 10 seconds then kills the process with SIGKILL, potentially corrupting data.",
    howToVerify: "- Check that the application has a SIGTERM handler\n- Verify exec form is used for CMD (shell form doesn't forward signals)\n- Test: `docker stop container` should exit within a few seconds",
    exampleComment: "The Node.js app doesn't handle SIGTERM. When `docker stop` is called, connections are killed ungracefully. Add a SIGTERM handler to finish in-flight requests.",
    codeExamples: [
      { label: "Bad", language: "javascript", code: "// No signal handling — SIGTERM kills immediately\napp.listen(3000);" },
      { label: "Good", language: "javascript", code: "const server = app.listen(3000);\nprocess.on('SIGTERM', () => {\n  console.log('SIGTERM received, shutting down gracefully');\n  server.close(() => process.exit(0));\n});" }
    ],
    keyTakeaway: "Handle SIGTERM for graceful shutdown — finish in-flight work before exiting.",
    references: []
  },

  // ── Groovy / Jenkins ──
  "web-devops-config.groovy.are-groovy-scripts-using-safe-navigation-operator-for-null-safety": {
    whatItMeans: "Groovy scripts use the safe navigation operator (`?.`) to prevent NullPointerExceptions when accessing properties on potentially null objects.",
    whyItMatters: "NullPointerExceptions in Jenkins pipelines cause cryptic build failures. Safe navigation prevents crashes from null values in dynamic pipeline data.",
    howToVerify: "- Look for chained property access without null checks\n- Check for `?.` usage on dynamic data (API responses, environment variables)\n- Verify that null cases are handled with elvis operator (`?:`) for defaults",
    exampleComment: "The `env.BUILD_INFO.version` will throw NPE if `BUILD_INFO` is null. Use `env.BUILD_INFO?.version ?: 'unknown'`.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "def version = env.BUILD_INFO.version  // NPE if BUILD_INFO is null!" },
      { label: "Good", language: "groovy", code: "def version = env.BUILD_INFO?.version ?: 'unknown'" }
    ],
    keyTakeaway: "Use `?.` for null safety and `?:` for defaults — NullPointerExceptions crash pipelines.",
    references: []
  },
  "web-devops-config.groovy.are-jenkinsfile-pipelines-using-declarative-syntax-where-possible": {
    whatItMeans: "Jenkins pipelines use declarative syntax (`pipeline { ... }`) instead of scripted syntax, for clarity and built-in validation.",
    whyItMatters: "Declarative pipelines are easier to read, validate before execution, and support Blue Ocean visualization. Scripted pipelines are harder to maintain.",
    howToVerify: "- Check that the pipeline starts with `pipeline {` (declarative)\n- Verify `script { }` blocks are used sparingly for complex logic\n- Look for fully scripted pipelines that could be declarative",
    exampleComment: "This fully scripted pipeline would be clearer as declarative syntax. The standard build-test-deploy flow maps directly to declarative stages.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "node {\n  stage('Build') { sh 'make' }\n  stage('Test') { sh 'make test' }\n}" },
      { label: "Good", language: "groovy", code: "pipeline {\n  agent any\n  stages {\n    stage('Build') { steps { sh 'make' } }\n    stage('Test') { steps { sh 'make test' } }\n  }\n}" }
    ],
    keyTakeaway: "Prefer declarative pipelines — they're validated, readable, and supported by Blue Ocean.",
    references: []
  },
  "web-devops-config.groovy.are-shared-libraries-versioned-and-tested": {
    whatItMeans: "Jenkins shared libraries are version-pinned in pipeline configs and have their own tests.",
    whyItMatters: "Unversioned shared libraries can break all pipelines when updated. Versioning and testing prevent widespread pipeline failures.",
    howToVerify: "- Check that `@Library('mylib@version')` pins a specific version\n- Look for `@Library('mylib')` without version (uses default branch)\n- Verify the shared library has unit tests",
    exampleComment: "The `@Library('deploy-utils')` doesn't pin a version. A breaking change in the library could break all pipelines. Use `@Library('deploy-utils@1.2.3')`.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "@Library('deploy-utils')  // Unpinned — uses default branch" },
      { label: "Good", language: "groovy", code: "@Library('deploy-utils@1.2.3') _  // Pinned version" }
    ],
    keyTakeaway: "Pin shared library versions — unversioned libraries can break all pipelines at once.",
    references: []
  },
  "web-devops-config.groovy.are-credentials-accessed-via-jenkins-credentials-store-not-hardcoded": {
    whatItMeans: "Credentials are loaded from Jenkins' credential store using `credentials()` or `withCredentials()`, never hardcoded.",
    whyItMatters: "Hardcoded credentials in Jenkinsfiles are visible in source control. Jenkins' credential store masks values in logs and manages rotation.",
    howToVerify: "- Check for hardcoded passwords, tokens, or API keys in Jenkinsfiles\n- Verify `credentials()` or `withCredentials()` is used\n- Look for credentials echoed in log output",
    exampleComment: "The API token is hardcoded in the Jenkinsfile. Use `credentials('api-token-id')` to load it from Jenkins' secure credential store.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "sh \"curl -H 'Authorization: Bearer sk_live_abc123' ...\"" },
      { label: "Good", language: "groovy", code: "environment {\n  API_TOKEN = credentials('api-token-id')\n}\nsteps {\n  sh 'curl -H \"Authorization: Bearer $API_TOKEN\" ...'\n}" }
    ],
    keyTakeaway: "Use Jenkins credentials store — it masks secrets in logs and supports rotation.",
    references: []
  },
  "web-devops-config.groovy.are-pipeline-stages-named-clearly-and-logically-ordered": {
    whatItMeans: "Pipeline stages have clear, descriptive names and are ordered logically (checkout → build → test → deploy).",
    whyItMatters: "Clear stage names appear in Jenkins UI and Blue Ocean. Logical ordering makes pipeline flow understandable at a glance.",
    howToVerify: "- Check that stage names describe what they do\n- Verify stages are in logical order\n- Look for stages that could be parallelized",
    exampleComment: "The stages 'Step 1', 'Step 2', 'Step 3' are not descriptive. Could you rename them to 'Build', 'Test', 'Deploy'?",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "stage('Step 1') { ... }\nstage('Step 2') { ... }\nstage('Do stuff') { ... }" },
      { label: "Good", language: "groovy", code: "stage('Checkout') { ... }\nstage('Build') { ... }\nstage('Unit Tests') { ... }\nstage('Integration Tests') { ... }\nstage('Deploy to Staging') { ... }" }
    ],
    keyTakeaway: "Name stages descriptively — they appear in the Jenkins UI and should be self-explanatory.",
    references: []
  },
  "web-devops-config.groovy.are-noncps-annotations-used-for-methods-that-cannot-be-serialized": {
    whatItMeans: "Methods that use non-serializable objects (closures, iterators) are annotated with `@NonCPS` to prevent Jenkins CPS transformation errors.",
    whyItMatters: "Jenkins serializes pipeline state for durability. Non-serializable objects cause `NotSerializableException`. `@NonCPS` opts out of serialization for specific methods.",
    howToVerify: "- Check for `NotSerializableException` in build logs\n- Look for methods using closures, `collect`, `find`, or iterators without `@NonCPS`\n- Verify `@NonCPS` methods don't call pipeline steps",
    exampleComment: "The `transform()` method uses `.collect{}` which requires `@NonCPS`. Without it, Jenkins throws `NotSerializableException` when saving pipeline state.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "def transform(items) {\n  items.collect { it.toUpperCase() }  // NotSerializableException!\n}" },
      { label: "Good", language: "groovy", code: "@NonCPS\ndef transform(items) {\n  items.collect { it.toUpperCase() }  // Works with @NonCPS\n}" }
    ],
    keyTakeaway: "Use `@NonCPS` for methods with closures or iterators — Jenkins can't serialize them.",
    references: []
  },
  "web-devops-config.groovy.are-timeout-and-retry-blocks-used-for-external-calls": {
    whatItMeans: "External calls (HTTP requests, deployments, approval gates) use `timeout` and `retry` blocks to prevent indefinite hangs.",
    whyItMatters: "Without timeouts, a stuck external call can block a pipeline forever, consuming an executor. Retries handle transient failures gracefully.",
    howToVerify: "- Check that external calls have `timeout` blocks\n- Verify `retry` is used for operations that may transiently fail\n- Look for HTTP calls, deployment waits, and approval gates without timeouts",
    exampleComment: "The deployment wait has no timeout. If the deployment hangs, the pipeline blocks forever. Add `timeout(time: 10, unit: 'MINUTES')`.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "stage('Deploy') {\n  steps { sh 'kubectl rollout status deployment/app' }  // May hang forever!\n}" },
      { label: "Good", language: "groovy", code: "stage('Deploy') {\n  steps {\n    timeout(time: 10, unit: 'MINUTES') {\n      retry(3) {\n        sh 'kubectl rollout status deployment/app'\n      }\n    }\n  }\n}" }
    ],
    keyTakeaway: "Add timeout and retry to external calls — prevent indefinite hangs and handle transient failures.",
    references: []
  },
  "web-devops-config.groovy.are-post-build-actions-always-success-failure-defined": {
    whatItMeans: "Pipeline `post` blocks define handlers for `always`, `success`, and `failure` to handle cleanup, notifications, and reporting.",
    whyItMatters: "Without post blocks, failed builds may not send notifications, cleanup may be skipped, and artifacts may not be archived.",
    howToVerify: "- Check for `post { always { ... } }` for cleanup\n- Verify `failure { ... }` sends notifications\n- Check that `success { ... }` archives artifacts or triggers downstream jobs",
    exampleComment: "The pipeline has no `post` block. Build failures go unnoticed. Add `post { failure { slackSend ... } }` for notifications.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "pipeline { stages { ... } }  // No post block — no cleanup or notifications" },
      { label: "Good", language: "groovy", code: "pipeline {\n  stages { ... }\n  post {\n    always { junit 'reports/**/*.xml' }\n    success { archiveArtifacts 'dist/**' }\n    failure { slackSend color: 'danger', message: \"Build failed: ${env.JOB_NAME}\" }\n  }\n}" }
    ],
    keyTakeaway: "Define post blocks for always (cleanup), success (artifacts), and failure (notifications).",
    references: []
  },
  "web-devops-config.groovy.are-script-approvals-minimized-in-jenkins-sandbox-mode": {
    whatItMeans: "Pipeline scripts minimize the need for Jenkins sandbox script approvals by using approved methods and declarative syntax.",
    whyItMatters: "Frequent script approval requests slow development and frustrate teams. Using approved APIs and declarative syntax avoids the sandbox approval bottleneck.",
    howToVerify: "- Check for methods that require sandbox approval\n- Verify declarative syntax is used where possible\n- Look for `new` constructors that could use pipeline step alternatives",
    exampleComment: "Using `new URL(...)` requires script approval. The `httpRequest` pipeline step is pre-approved and achieves the same result.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "def url = new URL('https://api.example.com')  // Requires approval!" },
      { label: "Good", language: "groovy", code: "def response = httpRequest 'https://api.example.com'  // Pre-approved step" }
    ],
    keyTakeaway: "Use pipeline steps instead of raw Groovy APIs — they're pre-approved and purpose-built.",
    references: []
  },
  "web-devops-config.groovy.are-environment-variables-used-instead-of-hardcoded-paths-and-urls": {
    whatItMeans: "Pipeline scripts use environment variables for paths, URLs, and configuration instead of hardcoding them.",
    whyItMatters: "Hardcoded values break when the pipeline runs on different agents or environments. Environment variables make pipelines portable.",
    howToVerify: "- Check for hardcoded file paths, server URLs, or version numbers\n- Verify `environment { }` block is used for configuration\n- Look for values that differ between environments",
    exampleComment: "The deploy URL `https://prod.example.com` is hardcoded. Use an environment variable so the same pipeline works for staging and production.",
    codeExamples: [
      { label: "Bad", language: "groovy", code: "sh 'scp dist/* deploy@prod.example.com:/var/www/'  // Hardcoded!" },
      { label: "Good", language: "groovy", code: "environment {\n  DEPLOY_HOST = \"${params.ENVIRONMENT == 'prod' ? 'prod' : 'staging'}.example.com\"\n}\nsteps {\n  sh \"scp dist/* deploy@${DEPLOY_HOST}:/var/www/\"\n}" }
    ],
    keyTakeaway: "Use environment variables for configuration — make pipelines work across environments.",
    references: []
  },

  // ── XSLT ──
  "web-devops-config.xslt.is-the-xslt-version-specified-and-appropriate-for-the-use-case": {
    whatItMeans: "The XSLT stylesheet specifies its version (1.0 or 2.0) and uses features compatible with that version.",
    whyItMatters: "XSLT 1.0 and 2.0 have different feature sets. Using 2.0 features in a 1.0 stylesheet fails silently or causes processor errors.",
    howToVerify: "- Check the `version` attribute on `<xsl:stylesheet>`\n- Verify features match the version (grouping, regex only in 2.0+)\n- Check that the XSLT processor supports the specified version",
    exampleComment: "The stylesheet uses `xsl:for-each-group` which is XSLT 2.0, but the version attribute says 1.0. Update to `version=\"2.0\"` or rewrite the grouping logic.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<xsl:stylesheet version=\"1.0\">\n  <xsl:for-each-group ... />  <!-- 2.0 only! -->" },
      { label: "Good", language: "xml", code: "<xsl:stylesheet version=\"2.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\">\n  <xsl:for-each-group select=\"item\" group-by=\"@category\">" }
    ],
    keyTakeaway: "Specify the correct XSLT version and use only features available in that version.",
    references: []
  },
  "web-devops-config.xslt.are-xpath-expressions-efficient-and-not-overly-broad-avoid-when-possible": {
    whatItMeans: "XPath expressions are specific and efficient, avoiding `//` (descendant-or-self) which scans the entire document tree.",
    whyItMatters: "`//node` searches the entire document for every match, which is O(n) per use. Specific paths like `/root/items/item` are much faster.",
    howToVerify: "- Look for `//` in XPath expressions — can they use specific paths?\n- Check for nested `//` patterns which compound the performance hit\n- Verify context-relative paths (`.//`) when needed instead of document-root `//`",
    exampleComment: "The `//product` XPath searches the entire document. If products are always under `/catalog/products/product`, use the specific path for better performance.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<xsl:for-each select=\"//product\">  <!-- Scans entire document! -->" },
      { label: "Good", language: "xml", code: "<xsl:for-each select=\"/catalog/products/product\">  <!-- Specific path -->" }
    ],
    keyTakeaway: "Use specific XPath paths instead of `//` — avoid scanning the entire document tree.",
    references: []
  },
  "web-devops-config.xslt.are-named-templates-used-for-reusable-logic-instead-of-duplicated-patterns": {
    whatItMeans: "Reusable transformation logic is extracted into named templates (`<xsl:template name=\"...\">`) instead of being duplicated.",
    whyItMatters: "Duplicated transformation patterns are hard to maintain — a change in formatting must be updated in every copy.",
    howToVerify: "- Look for duplicated `<xsl:template match=\"...\">` patterns\n- Check for repeated formatting logic that could be a named template\n- Verify named templates use parameters for flexibility",
    exampleComment: "The date formatting logic is duplicated in 4 templates. Could you extract it into a named template `format-date` and call it with `<xsl:call-template>`?",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<!-- Duplicated in multiple templates -->\n<xsl:value-of select=\"concat(substring(date,1,4),'-',substring(date,5,2))\" />" },
      { label: "Good", language: "xml", code: "<xsl:template name=\"format-date\">\n  <xsl:param name=\"date\" />\n  <xsl:value-of select=\"concat(substring($date,1,4),'-',substring($date,5,2))\" />\n</xsl:template>\n\n<xsl:call-template name=\"format-date\">\n  <xsl:with-param name=\"date\" select=\"@date\" />\n</xsl:call-template>" }
    ],
    keyTakeaway: "Extract reusable logic into named templates — DRY applies to XSLT too.",
    references: []
  },
  "web-devops-config.xslt.are-variables-used-to-avoid-redundant-xpath-evaluations": {
    whatItMeans: "XPath expressions that are evaluated multiple times are stored in `<xsl:variable>` elements to avoid redundant computation.",
    whyItMatters: "Complex XPath expressions can be expensive. Evaluating the same expression multiple times wastes processing time when the result doesn't change.",
    howToVerify: "- Look for the same XPath expression used multiple times\n- Check for complex expressions in conditions that are also used in output\n- Verify variables have descriptive names",
    exampleComment: "The XPath `catalog/products/product[@featured='true']` is evaluated three times. Could you store it in an `<xsl:variable>` and reference that?",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<xsl:if test=\"catalog/products/product[@featured='true']\">\n  <xsl:value-of select=\"count(catalog/products/product[@featured='true'])\" />\n  <xsl:for-each select=\"catalog/products/product[@featured='true']\">" },
      { label: "Good", language: "xml", code: "<xsl:variable name=\"featured\" select=\"catalog/products/product[@featured='true']\" />\n<xsl:if test=\"$featured\">\n  <xsl:value-of select=\"count($featured)\" />\n  <xsl:for-each select=\"$featured\">" }
    ],
    keyTakeaway: "Cache repeated XPath expressions in variables — evaluate once, use many times.",
    references: []
  },
  "web-devops-config.xslt.is-the-output-method-specified-correctly-xml-html-text": {
    whatItMeans: "The `<xsl:output>` element specifies the correct output method (xml, html, text) and encoding.",
    whyItMatters: "Wrong output method causes incorrect serialization. HTML output with xml method produces self-closing tags (`<br/>`) that some parsers reject.",
    howToVerify: "- Check that `<xsl:output method=\"...\">` matches the intended output format\n- Verify encoding is specified (usually utf-8)\n- Check indentation settings for readability",
    exampleComment: "The stylesheet generates HTML but uses `method=\"xml\"`. This produces `<br/>` instead of `<br>`. Change to `method=\"html\"`.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<!-- Generating HTML but using XML output method -->\n<xsl:output method=\"xml\" />  <!-- Produces <br/> not <br> -->" },
      { label: "Good", language: "xml", code: "<xsl:output method=\"html\" encoding=\"utf-8\" indent=\"yes\" />" }
    ],
    keyTakeaway: "Match the output method to the format — xml for XML, html for HTML, text for plain text.",
    references: []
  },
  "web-devops-config.xslt.are-namespace-declarations-correct-and-consistent": {
    whatItMeans: "XML namespace declarations are correct, consistent, and namespace prefixes are used properly throughout the stylesheet.",
    whyItMatters: "Incorrect namespaces cause XPath expressions to silently match nothing. This is one of the most common and confusing XSLT debugging issues.",
    howToVerify: "- Check that namespace URIs match between the stylesheet and input document\n- Verify namespace prefixes are declared on the stylesheet element\n- Look for XPath expressions that should use namespace prefixes but don't",
    exampleComment: "The input XML uses namespace `http://example.com/products` but the stylesheet XPath `//product` doesn't use a namespace prefix. It matches nothing. Declare the namespace and use the prefix.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<!-- Input: <p:product xmlns:p=\"http://example.com/products\"> -->\n<xsl:for-each select=\"//product\">  <!-- Matches nothing! -->" },
      { label: "Good", language: "xml", code: "<xsl:stylesheet xmlns:p=\"http://example.com/products\" ...>\n  <xsl:for-each select=\"//p:product\">  <!-- Matches correctly -->" }
    ],
    keyTakeaway: "Always match namespace URIs and use prefixes in XPath — silent no-match is the #1 XSLT pitfall.",
    references: []
  },
  "web-devops-config.xslt.is-whitespace-handling-intentional-xslstrip-space-normalize-space": {
    whatItMeans: "Whitespace handling is explicitly controlled using `<xsl:strip-space>`, `<xsl:preserve-space>`, and `normalize-space()` function.",
    whyItMatters: "XSLT preserves whitespace by default, which can produce unexpected blank lines and indentation in output. Explicit control prevents formatting surprises.",
    howToVerify: "- Check for `<xsl:strip-space elements=\"*\"/>` if clean output is needed\n- Look for `normalize-space()` on text values that may have extra whitespace\n- Verify output formatting is intentional and consistent",
    exampleComment: "The output has unexpected blank lines between elements. Adding `<xsl:strip-space elements=\"*\"/>` would remove the whitespace-only text nodes.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<!-- No whitespace control — extra blank lines in output -->\n<xsl:stylesheet ...>" },
      { label: "Good", language: "xml", code: "<xsl:stylesheet ...>\n  <xsl:strip-space elements=\"*\" />\n  <xsl:output method=\"xml\" indent=\"yes\" />" }
    ],
    keyTakeaway: "Control whitespace explicitly — use `strip-space` and `normalize-space` for clean output.",
    references: []
  },
  "web-devops-config.xslt.are-edge-cases-handled-empty-nodes-missing-attributes-null-values": {
    whatItMeans: "The stylesheet handles edge cases: empty nodes, missing attributes, empty text content, and documents with no matching elements.",
    whyItMatters: "Real-world XML data is messy. Missing attributes or empty nodes can cause blank output, broken formatting, or incorrect data in the transformation result.",
    howToVerify: "- Check for `<xsl:if>` or `<xsl:choose>` guards on optional data\n- Look for attribute access that may not exist\n- Test with minimal and empty input documents\n- Verify default values are provided for optional elements",
    exampleComment: "The template accesses `@price` without checking if it exists. Products without a price attribute will produce empty output. Add a fallback.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<td><xsl:value-of select=\"@price\" /></td>  <!-- Empty if no price! -->" },
      { label: "Good", language: "xml", code: "<td>\n  <xsl:choose>\n    <xsl:when test=\"@price\"><xsl:value-of select=\"@price\" /></xsl:when>\n    <xsl:otherwise>N/A</xsl:otherwise>\n  </xsl:choose>\n</td>" }
    ],
    keyTakeaway: "Handle missing data with defaults — real-world XML always has edge cases.",
    references: []
  },
  "web-devops-config.xslt.is-the-transformation-testable-with-known-inputoutput-pairs": {
    whatItMeans: "The XSLT transformation has test cases with known input/output pairs that verify correct behavior.",
    whyItMatters: "XSLT bugs are hard to debug. Test cases with known inputs and expected outputs catch regressions and document the transformation's behavior.",
    howToVerify: "- Check for test input XML files and expected output files\n- Verify tests are run in CI\n- Look for edge case test inputs (empty, minimal, large documents)",
    exampleComment: "The transformation has no tests. Could you add test XML inputs with expected outputs? It would catch regressions when the stylesheet is modified.",
    codeExamples: [],
    keyTakeaway: "Test XSLT with input/output pairs — they're the most effective way to prevent regressions.",
    references: []
  },
  "web-devops-config.xslt.are-security-considerations-addressed-no-user-input-in-xpath-without-sanitizatio": {
    whatItMeans: "User-provided values are not directly interpolated into XPath expressions, preventing XPath injection attacks.",
    whyItMatters: "XPath injection allows attackers to modify query logic, potentially accessing unauthorized data or causing denial of service.",
    howToVerify: "- Check that user input isn't concatenated into XPath strings\n- Verify parameterized XPath is used instead of string building\n- Look for `document()` function usage with external URLs",
    exampleComment: "The XPath `//user[@name='` + userInput + `']` is vulnerable to injection. Use XSLT parameters instead of string concatenation.",
    codeExamples: [
      { label: "Bad", language: "xml", code: "<!-- XPath injection if searchTerm contains ' or \" -->\n<xsl:for-each select=\"//product[name='$searchTerm']\">" },
      { label: "Good", language: "xml", code: "<xsl:param name=\"searchTerm\" />\n<xsl:for-each select=\"//product[name=$searchTerm]\">" }
    ],
    keyTakeaway: "Use XSLT parameters for dynamic values — never concatenate user input into XPath.",
    references: []
  }
};
