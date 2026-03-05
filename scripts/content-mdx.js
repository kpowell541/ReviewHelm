module.exports = {
  "js-ts-react-node.frontend-specific-concerns.mdx-content.are-mdx-files-using-proper-frontmatter-schema-with-required-fields": {
    whatItMeans: "MDX files should have valid frontmatter (YAML between --- delimiters) with all required fields like title, description, date, and author consistently defined.",
    whyItMatters: "Frontmatter drives metadata for SEO, navigation, and content indexing. Missing or malformed fields can break builds or produce pages with missing titles and descriptions.",
    howToVerify: "- Check that every MDX file starts with a --- frontmatter block\n- Verify required fields (title, description, slug) are present\n- Look for a shared schema or type definition that validates frontmatter at build time",
    exampleComment: "This MDX file is missing the `description` field in frontmatter. Our content schema requires it for SEO meta tags. Could you add a brief description?",
    codeExamples: [
      { label: "Bad", language: "mdx", code: "---\ntitle: My Post\n---\n\n# Content here" },
      { label: "Good", language: "mdx", code: "---\ntitle: My Post\ndescription: A guide to setting up MDX in Next.js\ndate: 2024-01-15\nauthor: team\ntags: [mdx, nextjs]\n---\n\n# Content here" }
    ],
    keyTakeaway: "Define a consistent frontmatter schema and validate it at build time to catch missing fields early.",
    references: [
      { title: "MDX Frontmatter", url: "https://mdxjs.com/guides/frontmatter/" },
      { title: "Content Collections (Astro)", url: "https://docs.astro.build/en/guides/content-collections/" }
    ]
  },
  "js-ts-react-node.frontend-specific-concerns.mdx-content.are-jsx-components-imported-and-used-correctly-within-mdx-content": {
    whatItMeans: "JSX components used inside MDX files must be properly imported or provided via an MDXProvider, with correct prop usage and no runtime errors.",
    whyItMatters: "Incorrect imports or misused components cause build failures or runtime crashes in documentation and content pages, breaking the reader's experience.",
    howToVerify: "- Check that imported components exist and are exported from their modules\n- Verify props match the component's interface\n- Confirm the component renders correctly in the MDX context (no hydration mismatches)",
    exampleComment: "The `<CodeBlock>` component is imported from `@/components/CodeBlock` but that module exports `CodeExample` instead. Could you update the import?",
    codeExamples: [
      { label: "Bad", language: "mdx", code: "import { Chart } from './components'\n\n<Chart data={myData} />\n// myData is not defined in scope" },
      { label: "Good", language: "mdx", code: "import { Chart } from '../components/Chart'\n\nexport const data = [10, 20, 30]\n\n<Chart data={data} title=\"Monthly Sales\" />" }
    ],
    keyTakeaway: "Treat MDX component imports with the same rigor as regular JSX — verify paths, props, and runtime behavior.",
    references: [
      { title: "Using MDX", url: "https://mdxjs.com/docs/using-mdx/" }
    ]
  },
  "js-ts-react-node.frontend-specific-concerns.mdx-content.are-mdx-custom-components-headings-code-blocks-links-mapped-via-mdxprovider": {
    whatItMeans: "Custom component mappings (replacing default HTML elements like h1, code, a with styled React components) should be configured via MDXProvider or the components prop.",
    whyItMatters: "Without proper component mapping, MDX renders plain HTML elements that miss your design system's styling, syntax highlighting, and interactive features like copy-to-clipboard on code blocks.",
    howToVerify: "- Check that an MDXProvider (or useMDXComponents) wraps the MDX content\n- Verify mappings exist for key elements: h1-h6, code, pre, a, img, table\n- Test that code blocks render with syntax highlighting",
    exampleComment: "I notice code blocks in this MDX page render as plain `<pre>` tags without syntax highlighting. Could we map `pre` and `code` to our `CodeBlock` component via the MDX components config?",
    codeExamples: [
      { label: "Bad", language: "tsx", code: "// No component mapping — plain HTML output\n<MDXContent />" },
      { label: "Good", language: "tsx", code: "import { MDXProvider } from '@mdx-js/react'\nimport { Heading, CodeBlock, Link } from './mdx-components'\n\nconst components = { h1: Heading, pre: CodeBlock, a: Link }\n\n<MDXProvider components={components}>\n  <MDXContent />\n</MDXProvider>" }
    ],
    keyTakeaway: "Map MDX elements to your design system components via MDXProvider to ensure consistent styling and functionality.",
    references: [
      { title: "MDX Provider", url: "https://mdxjs.com/docs/using-mdx/#mdx-provider" },
      { title: "Next.js MDX Components", url: "https://nextjs.org/docs/pages/building-your-application/configuring/mdx" }
    ]
  },
  "js-ts-react-node.frontend-specific-concerns.mdx-content.is-mdx-content-separated-from-layout-logic-content-vs-presentation": {
    whatItMeans: "MDX files should focus on content (text, examples, data) while layout, navigation, and page chrome live in separate layout components or templates.",
    whyItMatters: "Mixing layout logic into content files makes content harder to reuse, redesign, and maintain. Authors should write content without worrying about page structure.",
    howToVerify: "- Check that MDX files don't contain layout wrappers, sidebars, or navigation components\n- Verify that page layout is handled by a parent component or layout template\n- Ensure frontmatter-driven layout selection (e.g., `layout: docs`) is used instead of inline layout code",
    exampleComment: "This MDX file includes the `<DocsLayout>` wrapper and sidebar navigation directly. Could we move the layout to a template component and let the MDX focus on content only?",
    codeExamples: [
      { label: "Bad", language: "mdx", code: "import Layout from '../layouts/DocsLayout'\nimport Sidebar from '../components/Sidebar'\n\n<Layout>\n  <Sidebar />\n  <main>\n    # My Content\n    Some text here.\n  </main>\n</Layout>" },
      { label: "Good", language: "mdx", code: "---\ntitle: My Content\nlayout: docs\n---\n\n# My Content\n\nSome text here." }
    ],
    keyTakeaway: "Keep MDX files as pure content — delegate layout and page chrome to templates or layout components.",
    references: [
      { title: "MDX Layouts", url: "https://mdxjs.com/docs/using-mdx/#layouts" }
    ]
  },
  "js-ts-react-node.frontend-specific-concerns.mdx-content.are-interactive-elements-in-mdx-demos-playgrounds-lazy-loaded": {
    whatItMeans: "Heavy interactive components embedded in MDX (code playgrounds, charts, interactive demos) should be lazy-loaded so they don't block the initial page render.",
    whyItMatters: "Interactive components often bundle large dependencies (Monaco editor, chart libraries). Loading them eagerly increases page weight and degrades performance, especially on content-heavy pages.",
    howToVerify: "- Check that interactive components use dynamic import or React.lazy\n- Verify a loading fallback is shown while the component loads\n- Test that the page's static content renders before interactive elements hydrate",
    exampleComment: "The `<LiveCodeEditor>` bundles ~500KB of Monaco editor on every page load. Could we lazy-load it with `dynamic(() => import(...), { ssr: false })` so the page content renders first?",
    codeExamples: [
      { label: "Bad", language: "mdx", code: "import LiveEditor from '../components/LiveEditor'\n\n# Tutorial\n\n<LiveEditor code={`console.log('hello')`} />" },
      { label: "Good", language: "mdx", code: "import dynamic from 'next/dynamic'\nconst LiveEditor = dynamic(() => import('../components/LiveEditor'), {\n  loading: () => <p>Loading editor...</p>,\n  ssr: false\n})\n\n# Tutorial\n\n<LiveEditor code={`console.log('hello')`} />" }
    ],
    keyTakeaway: "Lazy-load heavy interactive components in MDX to keep content pages fast and lightweight.",
    references: [
      { title: "Next.js Dynamic Imports", url: "https://nextjs.org/docs/advanced-features/dynamic-import" },
      { title: "React.lazy", url: "https://react.dev/reference/react/lazy" }
    ]
  },
  "js-ts-react-node.frontend-specific-concerns.mdx-content.are-mdx-files-linted-for-broken-links-missing-images-and-invalid-jsx": {
    whatItMeans: "MDX files should be checked by linting tools for broken internal links, missing image files, and invalid JSX syntax that would cause build or runtime errors.",
    whyItMatters: "Broken links and missing images create a poor reader experience and hurt SEO. Invalid JSX in MDX silently breaks pages or causes confusing build errors.",
    howToVerify: "- Check if a link-checking tool (remark-lint-no-dead-urls, markdown-link-check) is configured\n- Verify image paths resolve to actual files in the repository\n- Confirm MDX files pass the MDX compiler without JSX syntax errors",
    exampleComment: "This MDX file links to `/docs/old-page` which was renamed to `/docs/updated-page` in the last restructure. Could you update the link? Consider adding `remark-lint-no-dead-urls` to catch these automatically.",
    codeExamples: [
      { label: "Bad", language: "mdx", code: "Check out the [setup guide](/docs/old-setup).\n\n![Diagram](./images/arch.png)\n// arch.png was deleted last sprint" },
      { label: "Good", language: "mdx", code: "Check out the [setup guide](/docs/getting-started).\n\n![Architecture Diagram](./images/architecture-v2.png)\n// Verified: file exists, link resolves" }
    ],
    keyTakeaway: "Automate link and image validation in your CI pipeline to catch broken references before they reach production.",
    references: [
      { title: "remark-lint", url: "https://github.com/remarkjs/remark-lint" },
      { title: "markdown-link-check", url: "https://github.com/tcort/markdown-link-check" }
    ]
  }
};
