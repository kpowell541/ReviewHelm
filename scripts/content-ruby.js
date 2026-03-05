module.exports = {
  // ── General Code Quality ──
  "ruby.general-code-quality.does-the-pr-have-a-clear-description": {
    whatItMeans: "The pull request includes a summary of what changed and why, giving reviewers context before reading code.",
    whyItMatters: "Without context, reviewers waste time reverse-engineering intent from diffs. A clear description speeds up review and catches misaligned requirements early.",
    howToVerify: "- Read the PR description — does it explain the motivation and approach?\n- Check for links to related issues or design documents\n- Verify the description matches the actual code changes",
    exampleComment: "Could you add a brief description of why this migration was needed? It'll help future developers understand the context when reading git history.",
    codeExamples: [
      { label: "Bad", language: "markdown", code: "PR title: \"Update user model\"\nDescription: (empty)" },
      { label: "Good", language: "markdown", code: "PR title: \"Add email verification to user registration\"\nDescription: Adds a verified_at column and sends a confirmation email on signup. Resolves #234." }
    ],
    keyTakeaway: "A good PR description saves more time in review than it takes to write.",
    references: [
      { title: "Writing Good PR Descriptions", url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests" }
    ]
  },
  "ruby.general-code-quality.is-the-change-scoped-appropriately": {
    whatItMeans: "The PR contains a single logical change — not too large to review meaningfully, not split so small that pieces don't make sense alone.",
    whyItMatters: "Oversized PRs get rubber-stamped. Undersized PRs lack context. Well-scoped PRs get thorough, fast reviews.",
    howToVerify: "- Check the diff size — ideally under 400 lines of meaningful changes\n- Verify all changes relate to the stated purpose\n- Check whether the PR could be split into independent, reviewable units",
    exampleComment: "This PR adds the new API endpoint and refactors the authentication middleware. Could we split the auth refactor into a separate PR so each can be reviewed on its own merits?",
    codeExamples: [],
    keyTakeaway: "One logical change per PR leads to better reviews and safer merges.",
    references: []
  },
  "ruby.general-code-quality.are-there-any-unrelated-changes-bundled-in": {
    whatItMeans: "The PR doesn't mix unrelated fixes, refactors, or formatting changes with the primary feature or bug fix.",
    whyItMatters: "Bundled changes make reviews harder, complicate reverts, and obscure git blame history.",
    howToVerify: "- Scan the file list for files that seem unrelated to the PR's purpose\n- Look for stray formatting changes or import reordering\n- Check for drive-by fixes mixed in",
    exampleComment: "The RuboCop formatting changes in `app/helpers/` are unrelated to the payment integration. Could you move those to a separate PR?",
    codeExamples: [],
    keyTakeaway: "Keep PRs focused — unrelated changes belong in separate PRs.",
    references: []
  },
  "ruby.general-code-quality.is-dead-code-removed-rather-than-commented-out": {
    whatItMeans: "Unused code is deleted outright rather than left as commented-out blocks cluttering the source.",
    whyItMatters: "Commented-out code creates confusion about whether it's needed, planned, or forgotten. Git history preserves deleted code if it's ever needed again.",
    howToVerify: "- Search for large commented-out blocks in the diff\n- Check for methods that are no longer called\n- Look for feature flag checks for flags that have been fully rolled out",
    exampleComment: "This commented-out `legacy_sync` method appears to be replaced by the new implementation. Safe to delete it — git history has the old version if we ever need it.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# def legacy_sync\n#   OldClient.sync(data)\n# end\n\ndef sync\n  NewClient.sync(data)\nend" },
      { label: "Good", language: "ruby", code: "def sync\n  NewClient.sync(data)\nend" }
    ],
    keyTakeaway: "Delete dead code — version control is your backup.",
    references: []
  },
  "ruby.general-code-quality.are-todofixme-comments-accompanied-by-a-tracking-ticket": {
    whatItMeans: "TODO and FIXME comments reference a ticket or issue number so the work is tracked and not forgotten.",
    whyItMatters: "Untracked TODOs accumulate as tech debt that nobody owns. Linking to a ticket ensures the work gets prioritized and completed.",
    howToVerify: "- Search the diff for TODO, FIXME, HACK, XXX comments\n- Verify each has a ticket reference (e.g., JIRA-123, #456)\n- Check that referenced tickets are open and assigned",
    exampleComment: "This `# TODO: handle edge case` should reference a ticket so it doesn't get lost. Could you create one and add the reference?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# TODO: refactor this later" },
      { label: "Good", language: "ruby", code: "# TODO(PROJ-456): Extract shared validation logic into a concern" }
    ],
    keyTakeaway: "Every TODO needs an owner — link it to a tracked issue.",
    references: []
  },
  "ruby.general-code-quality.does-the-commit-history-tell-a-coherent-story": {
    whatItMeans: "Commits are logically organized with clear messages, telling a narrative of how the change was built rather than a jumble of 'fix' and 'wip' commits.",
    whyItMatters: "Good commit history helps future developers understand why changes were made. It also makes bisecting bugs and reverting changes much easier.",
    howToVerify: "- Read commit messages in order — do they tell a logical story?\n- Check for WIP, fixup, or squash-me commits that should have been cleaned up\n- Verify each commit compiles and passes tests independently",
    exampleComment: "The 'fix' and 'wip' commits should be squashed before merging. Consider organizing into logical commits like 'Add migration', 'Add model validations', 'Add controller endpoint'.",
    codeExamples: [],
    keyTakeaway: "Clean commit history is documentation — make each commit a meaningful unit of change.",
    references: []
  },

  // ── Ruby Style & Idioms: Style ──
  "ruby.ruby-style-idioms.style.does-the-code-follow-community-style-guide-rubocop": {
    whatItMeans: "The code follows the Ruby community style guide and passes RuboCop linting with the project's configured rules.",
    whyItMatters: "Consistent style reduces cognitive load during review and eliminates style debates. RuboCop catches common mistakes and enforces conventions automatically.",
    howToVerify: "- Run `bundle exec rubocop` on changed files\n- Check that no new offenses are introduced\n- Verify the .rubocop.yml configuration is up to date",
    exampleComment: "RuboCop is flagging `Style/StringLiterals` on several lines. Could you run `rubocop -a` on the changed files to auto-correct?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def calculate( x,y )\n  return x+y\nend" },
      { label: "Good", language: "ruby", code: "def calculate(x, y)\n  x + y\nend" }
    ],
    keyTakeaway: "Let RuboCop enforce style so reviewers can focus on logic and design.",
    references: [
      { title: "Ruby Style Guide", url: "https://rubystyle.guide/" },
      { title: "RuboCop", url: "https://docs.rubocop.org/" }
    ]
  },
  "ruby.ruby-style-idioms.style.are-methods-short-and-focused-under-10-lines": {
    whatItMeans: "Methods are concise, doing one thing well. Long methods are broken into smaller, well-named methods.",
    whyItMatters: "Short methods are easier to read, test, and reuse. Long methods often hide multiple responsibilities and are harder to debug.",
    howToVerify: "- Check that new methods are under ~10 lines of logic\n- Look for methods that could be extracted from long blocks\n- RuboCop's `Metrics/MethodLength` cop can enforce this",
    exampleComment: "This `process_order` method is 40 lines long with multiple responsibilities. Could we extract `validate_inventory`, `calculate_total`, and `send_confirmation` into separate methods?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def process_order(order)\n  # 40 lines of validation, calculation,\n  # database updates, email sending...\nend" },
      { label: "Good", language: "ruby", code: "def process_order(order)\n  validate_inventory(order)\n  total = calculate_total(order)\n  charge_payment(order, total)\n  send_confirmation(order)\nend" }
    ],
    keyTakeaway: "Extract methods until each one does exactly one thing.",
    references: []
  },
  "ruby.ruby-style-idioms.style.are-classes-following-single-responsibility-principle": {
    whatItMeans: "Each class has one reason to change — it handles one concept or responsibility, not a grab-bag of unrelated behaviors.",
    whyItMatters: "Classes with multiple responsibilities are hard to test, hard to name, and hard to change safely. SRP leads to more modular, maintainable code.",
    howToVerify: "- Can you describe the class's purpose in one sentence without 'and'?\n- Does the class have methods that operate on unrelated data?\n- Would changes to one feature require touching unrelated methods in this class?",
    exampleComment: "The `UserService` class handles registration, password resets, and report generation. Could we extract `PasswordResetService` and `ReportGenerator` to follow single responsibility?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class UserService\n  def register(params) ... end\n  def reset_password(email) ... end\n  def generate_monthly_report ... end\n  def send_marketing_email ... end\nend" },
      { label: "Good", language: "ruby", code: "class RegistrationService\n  def register(params) ... end\nend\n\nclass PasswordResetService\n  def reset(email) ... end\nend" }
    ],
    keyTakeaway: "If a class needs 'and' in its description, it probably needs splitting.",
    references: []
  },
  "ruby.ruby-style-idioms.style.are-naming-conventions-followed-snakecase-methods-pascalcase-classes": {
    whatItMeans: "Ruby naming conventions are followed: `snake_case` for methods/variables, `PascalCase` for classes/modules, `SCREAMING_SNAKE_CASE` for constants.",
    whyItMatters: "Consistent naming follows Ruby community expectations, making code immediately readable to any Rubyist. Non-standard naming creates friction.",
    howToVerify: "- Check that method and variable names use `snake_case`\n- Check that class and module names use `PascalCase`\n- Check that constants use `SCREAMING_SNAKE_CASE`\n- RuboCop's `Naming` cops catch these automatically",
    exampleComment: "The method `getUserById` should be `get_user_by_id` (or better, `find_user`) to follow Ruby's snake_case convention.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class orderProcessor\n  def processOrder(orderData)\n    maxRetries = 3\n  end\nend" },
      { label: "Good", language: "ruby", code: "class OrderProcessor\n  MAX_RETRIES = 3\n\n  def process_order(order_data)\n    # ...\n  end\nend" }
    ],
    keyTakeaway: "Follow Ruby naming conventions — snake_case methods, PascalCase classes, SCREAMING_SNAKE_CASE constants.",
    references: [
      { title: "Ruby Naming Conventions", url: "https://rubystyle.guide/#naming" }
    ]
  },
  "ruby.ruby-style-idioms.style.are-predicate-methods-named-with-suffix": {
    whatItMeans: "Methods that return a boolean value end with a `?` suffix, following Ruby convention.",
    whyItMatters: "The `?` suffix immediately communicates that the method returns true/false, making code more readable and self-documenting.",
    howToVerify: "- Check that boolean-returning methods end with `?`\n- Check that `?` methods only return true/false (not other values)\n- Look for methods like `is_valid`, `has_items`, `can_edit` that should use `?` instead",
    exampleComment: "The `is_active` method returns a boolean — could you rename it to `active?` to follow Ruby conventions?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def is_valid\n  errors.empty?\nend\n\ndef has_permission(user)\n  user.admin || user.editor\nend" },
      { label: "Good", language: "ruby", code: "def valid?\n  errors.empty?\nend\n\ndef permitted?(user)\n  user.admin? || user.editor?\nend" }
    ],
    keyTakeaway: "Use `?` suffix for predicate methods — it's one of Ruby's most expressive conventions.",
    references: []
  },
  "ruby.ruby-style-idioms.style.are-destructive-methods-named-with-suffix": {
    whatItMeans: "Methods that modify the receiver in place (mutating methods) end with a `!` suffix, with a non-bang counterpart available.",
    whyItMatters: "The `!` convention warns callers that the method mutates state or may raise exceptions, preventing surprises and bugs from unexpected mutation.",
    howToVerify: "- Check that in-place mutation methods use `!` suffix\n- Verify a non-bang version exists when appropriate\n- Look for methods that mutate `self` or arguments without the `!` warning",
    exampleComment: "The `normalize` method modifies the string in place but doesn't have a `!` suffix. Could you rename it to `normalize!` and provide a non-mutating `normalize` that returns a new value?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def clean_data\n  @data.strip!\n  @data.downcase!\n  @data.gsub!(/[^a-z]/, '')\nend" },
      { label: "Good", language: "ruby", code: "def clean_data\n  data.strip.downcase.gsub(/[^a-z]/, '')\nend\n\ndef clean_data!\n  @data = clean_data\nend" }
    ],
    keyTakeaway: "Use `!` to signal danger — mutation, exceptions, or irreversible side effects.",
    references: []
  },

  // ── Ruby Style & Idioms: Idioms ──
  "ruby.ruby-style-idioms.idioms.are-blocks-procs-and-lambdas-used-idiomatically": {
    whatItMeans: "Blocks, Procs, and lambdas are used in their appropriate contexts — blocks for iteration and DSLs, lambdas for callable objects, Procs sparingly.",
    whyItMatters: "Using the right construct improves readability. Blocks are Ruby's primary iteration pattern; lambdas enforce arity and have intuitive return behavior; Proc.new has surprising return semantics.",
    howToVerify: "- Check that blocks are used for simple iteration and callbacks\n- Verify lambdas are used when storing or passing callable objects\n- Look for Proc.new usage that could be replaced with lambdas\n- Check for `&method(:name)` usage where a simple block would be clearer",
    exampleComment: "This `Proc.new` could be a lambda instead — lambdas check argument count and have less surprising `return` behavior.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "validator = Proc.new { |x| x > 0 }\nitems.each { |i| puts(i) }" },
      { label: "Good", language: "ruby", code: "validator = ->(x) { x > 0 }\nitems.each { |item| puts(item) }" }
    ],
    keyTakeaway: "Use blocks for iteration, lambdas for callable objects, and avoid bare Proc.new.",
    references: [
      { title: "Ruby Blocks, Procs, and Lambdas", url: "https://ruby-doc.org/core/Proc.html" }
    ]
  },
  "ruby.ruby-style-idioms.idioms.is-methodname-shorthand-used-for-simple-block-operations": {
    whatItMeans: "The `&:method_name` shorthand is used instead of verbose blocks when calling a single method on each element.",
    whyItMatters: "The Symbol#to_proc shorthand is concise and idiomatic Ruby. It reduces noise and makes the intent clearer for simple transformations.",
    howToVerify: "- Look for blocks like `{ |x| x.to_s }` that could be `(&:to_s)`\n- Check that the shorthand isn't forced when additional arguments or logic are needed\n- Verify readability isn't sacrificed for brevity",
    exampleComment: "The block `{ |user| user.name }` can be simplified to `(&:name)` for readability.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "users.map { |user| user.name }\nnumbers.select { |n| n.even? }\nstrings.reject { |s| s.empty? }" },
      { label: "Good", language: "ruby", code: "users.map(&:name)\nnumbers.select(&:even?)\nstrings.reject(&:empty?)" }
    ],
    keyTakeaway: "Use `&:method_name` for simple single-method blocks — it's idiomatic and concise.",
    references: []
  },
  "ruby.ruby-style-idioms.idioms.are-freeze-used-for-string-constants-to-prevent-mutation": {
    whatItMeans: "String constants are frozen to prevent accidental mutation and enable string interning for memory efficiency.",
    whyItMatters: "Unfrozen string constants can be mutated, causing subtle bugs. Frozen strings are also faster because Ruby can share the same object in memory.",
    howToVerify: "- Check that string constants use `.freeze`\n- Look for `# frozen_string_literal: true` magic comment at the top of files\n- Verify RuboCop's `Style/FrozenStringLiteralComment` is enabled",
    exampleComment: "Consider adding `# frozen_string_literal: true` at the top of this file. It freezes all string literals by default, preventing accidental mutation and improving performance.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "DEFAULT_STATUS = 'pending'\nERROR_MESSAGE = 'Something went wrong'" },
      { label: "Good", language: "ruby", code: "# frozen_string_literal: true\n\nDEFAULT_STATUS = 'pending'\nERROR_MESSAGE = 'Something went wrong'" }
    ],
    keyTakeaway: "Use `# frozen_string_literal: true` in every file — it prevents bugs and improves performance.",
    references: [
      { title: "Frozen String Literals", url: "https://freelancing-gods.com/2017/07/27/an-introduction-to-frozen-string-literals.html" }
    ]
  },
  "ruby.ruby-style-idioms.idioms.are-dig-and-safe-navigation-used-for-nested-access": {
    whatItMeans: "Hash#dig and the safe navigation operator (`&.`) are used for safely accessing nested data instead of long chains of nil checks.",
    whyItMatters: "Chained `&&` checks and manual nil guards are verbose and error-prone. `dig` and `&.` express the intent clearly and handle nil gracefully.",
    howToVerify: "- Look for chains like `a && a.b && a.b.c` — replace with `a&.b&.c`\n- Look for nested hash access like `h[:a] && h[:a][:b]` — replace with `h.dig(:a, :b)`\n- Check that `&.` isn't overused on values that should never be nil",
    exampleComment: "This nested hash access `response[:data] && response[:data][:user] && response[:data][:user][:name]` can be simplified to `response.dig(:data, :user, :name)`.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "name = nil\nif response[:data]\n  if response[:data][:user]\n    name = response[:data][:user][:name]\n  end\nend" },
      { label: "Good", language: "ruby", code: "name = response.dig(:data, :user, :name)" }
    ],
    keyTakeaway: "Use `dig` for nested hash access and `&.` for method chains that may hit nil.",
    references: []
  },
  "ruby.ruby-style-idioms.idioms.are-enumerable-methods-used-instead-of-manual-iteration": {
    whatItMeans: "Ruby's rich Enumerable methods (`map`, `select`, `reject`, `find`, `reduce`, `each_with_object`, etc.) are used instead of manual loops with accumulators.",
    whyItMatters: "Enumerable methods are more expressive, less error-prone, and communicate intent better than manual iteration with temporary variables.",
    howToVerify: "- Look for `each` with manual accumulation that could be `map`, `select`, or `reduce`\n- Check for manual counter patterns that could use `count` or `tally`\n- Look for `each` + `push` patterns that should be `map` or `flat_map`",
    exampleComment: "This `each` loop with `results << ...` is a `map` pattern. Using `map` makes the transformation intent clearer.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "results = []\nusers.each do |user|\n  results << user.name if user.active?\nend" },
      { label: "Good", language: "ruby", code: "results = users.select(&:active?).map(&:name)" }
    ],
    keyTakeaway: "Master Enumerable methods — they're one of Ruby's greatest strengths.",
    references: [
      { title: "Ruby Enumerable", url: "https://ruby-doc.org/core/Enumerable.html" }
    ]
  },
  "ruby.ruby-style-idioms.idioms.is-raise-used-instead-of-fail-for-exceptions": {
    whatItMeans: "The `raise` keyword is used consistently for throwing exceptions, rather than mixing `raise` and `fail`.",
    whyItMatters: "While `raise` and `fail` are aliases, the community convention is to use `raise`. Mixing them creates inconsistency. RuboCop enforces this by default.",
    howToVerify: "- Search the diff for `fail` keyword used to raise exceptions\n- Check RuboCop's `Style/SignalException` configuration\n- Verify consistency across the codebase",
    exampleComment: "Could you use `raise` instead of `fail` here? The project convention (and RuboCop default) is to use `raise` consistently.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "fail ArgumentError, 'invalid input'" },
      { label: "Good", language: "ruby", code: "raise ArgumentError, 'invalid input'" }
    ],
    keyTakeaway: "Use `raise` consistently — it's the community standard for throwing exceptions.",
    references: []
  },
  "ruby.ruby-style-idioms.idioms.are-heredocs-used-for-multi-line-strings": {
    whatItMeans: "Heredoc syntax (`<<~HEREDOC`) is used for multi-line strings instead of string concatenation or `\\n` escapes.",
    whyItMatters: "Heredocs are more readable for multi-line content like SQL queries, email templates, or error messages. The `~` variant strips leading whitespace for clean indentation.",
    howToVerify: "- Look for multi-line string concatenation with `+` or `\\`\n- Look for strings with multiple `\\n` escapes\n- Check that `<<~` (squiggly heredoc) is used for proper indentation",
    exampleComment: "This multi-line SQL string would be much more readable as a heredoc. The `<<~SQL` syntax preserves readability while stripping indentation.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "query = \"SELECT users.* \" \\\n        \"FROM users \" \\\n        \"WHERE users.active = true \" \\\n        \"ORDER BY created_at DESC\"" },
      { label: "Good", language: "ruby", code: "query = <<~SQL\n  SELECT users.*\n  FROM users\n  WHERE users.active = true\n  ORDER BY created_at DESC\nSQL" }
    ],
    keyTakeaway: "Use squiggly heredocs (`<<~`) for multi-line strings — they're readable and properly indented.",
    references: []
  },
  "ruby.ruby-style-idioms.idioms.are-attrreader-attrwriter-attraccessor-used-appropriately": {
    whatItMeans: "Attribute accessors (`attr_reader`, `attr_writer`, `attr_accessor`) are used instead of manually writing getter/setter methods, with the most restrictive accessor chosen.",
    whyItMatters: "Manual getters and setters add boilerplate. Using the most restrictive accessor (prefer `attr_reader` over `attr_accessor`) communicates intent and prevents unintended mutation.",
    howToVerify: "- Look for manual getter methods that should be `attr_reader`\n- Check that `attr_accessor` isn't used when `attr_reader` would suffice\n- Verify that mutable attributes are intentionally writable",
    exampleComment: "These manual getter methods can be replaced with `attr_reader :name, :email`. Also, `attr_accessor :status` could be `attr_reader :status` if we only set it in the constructor.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class User\n  def name\n    @name\n  end\n\n  def email\n    @email\n  end\nend" },
      { label: "Good", language: "ruby", code: "class User\n  attr_reader :name, :email\n  attr_accessor :status\n\n  def initialize(name, email)\n    @name = name\n    @email = email\n    @status = :pending\n  end\nend" }
    ],
    keyTakeaway: "Use the most restrictive attr_* accessor — prefer `attr_reader` unless mutation is needed.",
    references: []
  },

  // ── Rails-Specific ──
  "ruby.rails-specific.are-database-queries-efficient-no-n1-proper-eager-loading": {
    whatItMeans: "Database queries avoid N+1 patterns by using eager loading (`includes`, `preload`, `eager_load`) when accessing associations in loops.",
    whyItMatters: "N+1 queries cause one query per record in a collection, turning a page load from 2 queries into 102 queries. This devastates performance at scale.",
    howToVerify: "- Look for association access inside `.each` loops without prior eager loading\n- Check `bullet` gem warnings in development logs\n- Use `explain` on queries to verify join strategies\n- Run the request and check query counts in the log",
    exampleComment: "This iterates over `@posts` and calls `post.author.name` inside the loop, triggering an N+1. Adding `.includes(:author)` to the query will eager-load authors in a single query.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "@posts = Post.all\n@posts.each do |post|\n  puts post.author.name  # N+1: one query per post\nend" },
      { label: "Good", language: "ruby", code: "@posts = Post.includes(:author).all\n@posts.each do |post|\n  puts post.author.name  # No extra queries\nend" }
    ],
    keyTakeaway: "Always eager-load associations accessed in loops — use the Bullet gem to catch N+1s automatically.",
    references: [
      { title: "Active Record Eager Loading", url: "https://guides.rubyonrails.org/active_record_querying.html#eager-loading-associations" },
      { title: "Bullet Gem", url: "https://github.com/flyerhzm/bullet" }
    ]
  },
  "ruby.rails-specific.are-migrations-reversible": {
    whatItMeans: "Database migrations can be rolled back safely, either via the default `change` method or explicit `up`/`down` methods.",
    whyItMatters: "Irreversible migrations block rollbacks during deploy failures. Reversible migrations are essential for safe, confident deployments.",
    howToVerify: "- Check that `change` method is used (auto-reversible) or `up`/`down` are both defined\n- Look for irreversible operations: `execute`, `remove_column` without type, `change_column`\n- Test by running `rake db:migrate` then `rake db:rollback`",
    exampleComment: "The `remove_column` in this migration won't be reversible because it doesn't specify the column type. Could you add the type so rollback works? `remove_column :users, :legacy_id, :integer`",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def change\n  remove_column :users, :legacy_id  # Not reversible!\nend" },
      { label: "Good", language: "ruby", code: "def change\n  remove_column :users, :legacy_id, :integer, null: true\nend" }
    ],
    keyTakeaway: "Always make migrations reversible — specify column types in remove_column and use up/down for complex changes.",
    references: [
      { title: "Active Record Migrations", url: "https://guides.rubyonrails.org/active_record_migrations.html" }
    ]
  },
  "ruby.rails-specific.are-strong-parameters-used-for-mass-assignment-protection": {
    whatItMeans: "Controllers use `params.require(:model).permit(:allowed_fields)` to whitelist attributes for mass assignment, preventing unauthorized parameter injection.",
    whyItMatters: "Without strong parameters, attackers can inject unexpected fields (like `admin: true`) through form submissions, leading to privilege escalation.",
    howToVerify: "- Check that controller actions use `params.require().permit()` before creating/updating records\n- Verify only intended attributes are permitted\n- Look for `params.permit!` which permits everything (dangerous)",
    exampleComment: "Using `params.permit!` permits all parameters including `admin` and `role`. Please switch to explicit permitting: `params.require(:user).permit(:name, :email)`.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def create\n  User.create(params[:user])  # Mass assignment vulnerability\nend" },
      { label: "Good", language: "ruby", code: "def create\n  User.create(user_params)\nend\n\nprivate\n\ndef user_params\n  params.require(:user).permit(:name, :email, :bio)\nend" }
    ],
    keyTakeaway: "Always use strong parameters — never pass raw params to create/update.",
    references: [
      { title: "Strong Parameters", url: "https://guides.rubyonrails.org/action_controller_overview.html#strong-parameters" }
    ]
  },
  "ruby.rails-specific.are-callbacks-used-sparingly-and-for-the-right-reasons": {
    whatItMeans: "ActiveRecord callbacks (`before_save`, `after_create`, etc.) are used only for simple, model-intrinsic concerns, not complex business logic or external side effects.",
    whyItMatters: "Overusing callbacks creates hidden, hard-to-debug execution flows. Callbacks run silently on every save, making it difficult to understand what happens when a record changes.",
    howToVerify: "- Check that callbacks handle model-intrinsic concerns (normalization, default values)\n- Look for callbacks that trigger emails, API calls, or complex business logic\n- Verify callbacks don't create circular or cascading chains",
    exampleComment: "The `after_create` callback sends a welcome email and creates a Stripe customer. These side effects should be in a service object, not a callback — they make testing harder and can fail silently.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class User < ApplicationRecord\n  after_create :send_welcome_email\n  after_create :create_stripe_customer\n  after_create :notify_admin\n  after_create :enqueue_onboarding\nend" },
      { label: "Good", language: "ruby", code: "class User < ApplicationRecord\n  before_save :normalize_email\nend\n\n# In the controller or service:\nclass RegistrationService\n  def register(params)\n    user = User.create!(params)\n    WelcomeMailer.send(user)\n    StripeService.create_customer(user)\n  end\nend" }
    ],
    keyTakeaway: "Keep callbacks simple and model-intrinsic — move business logic to service objects.",
    references: []
  },
  "ruby.rails-specific.are-concerns-used-to-share-behavior-not-just-reduce-file-size": {
    whatItMeans: "ActiveSupport::Concern modules share genuine cross-cutting behavior between models, not just split a large model into smaller files for cosmetic reasons.",
    whyItMatters: "Concerns that are only used by one model add indirection without benefit. True concerns share behavior (Searchable, Archivable) that multiple models need.",
    howToVerify: "- Check if the concern is used by multiple models\n- Verify the concern represents a cohesive behavior, not just moved code\n- Look for concerns that are really just the model split into multiple files",
    exampleComment: "The `Processable` concern is only included in `Order`. If it's not shared, the code would be clearer as methods directly on the Order model.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Only used by User model — just splitting the file\nmodule Concerns::UserHelpers\n  extend ActiveSupport::Concern\n  def full_name = \"#{first_name} #{last_name}\"\nend" },
      { label: "Good", language: "ruby", code: "# Shared by User, Organization, Team\nmodule Searchable\n  extend ActiveSupport::Concern\n  included do\n    scope :search, ->(q) { where('name ILIKE ?', \"%#{q}%\") }\n  end\nend" }
    ],
    keyTakeaway: "Concerns should share behavior across models, not just organize code within one model.",
    references: []
  },
  "ruby.rails-specific.are-scopes-used-instead-of-class-methods-for-query-building": {
    whatItMeans: "Named scopes are used for reusable query fragments, enabling chainable, composable database queries.",
    whyItMatters: "Scopes are chainable and return an ActiveRecord::Relation even when the condition doesn't match (returning `all`). Class methods may return `nil` or arrays, breaking chains.",
    howToVerify: "- Check that reusable query logic uses `scope` declarations\n- Verify scopes return relations, not arrays\n- Look for class methods that build queries and could be scopes instead",
    exampleComment: "The `self.active_users` class method would work better as `scope :active, -> { where(active: true) }` so it can be chained with other scopes like `User.active.recent`.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class User < ApplicationRecord\n  def self.active_users\n    where(active: true).to_a  # Returns array, not chainable\n  end\nend" },
      { label: "Good", language: "ruby", code: "class User < ApplicationRecord\n  scope :active, -> { where(active: true) }\n  scope :recent, -> { order(created_at: :desc) }\nend\n\n# Chainable:\nUser.active.recent.limit(10)" }
    ],
    keyTakeaway: "Use scopes for query building — they're chainable, reusable, and always return relations.",
    references: [
      { title: "Active Record Scopes", url: "https://guides.rubyonrails.org/active_record_querying.html#scopes" }
    ]
  },
  "ruby.rails-specific.are-background-jobs-used-for-long-running-operations": {
    whatItMeans: "Operations that take significant time (email sending, file processing, API calls, reports) are handled by background jobs rather than in the request cycle.",
    whyItMatters: "Long-running operations in request handlers block the web worker, cause timeouts, degrade user experience, and can bring down the whole app under load.",
    howToVerify: "- Look for slow operations (email, PDF generation, external API calls) in controllers\n- Check that `perform_later` (not `perform_now`) is used for async execution\n- Verify the background job system (Sidekiq, Delayed Job) is configured",
    exampleComment: "The PDF report generation in this controller action could take 30+ seconds. Could you move it to a background job and redirect the user to a status page?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def create\n  @report = Report.create!(report_params)\n  ReportGenerator.generate(@report)  # Takes 30 seconds\n  UserMailer.report_ready(@report).deliver_now\n  redirect_to @report\nend" },
      { label: "Good", language: "ruby", code: "def create\n  @report = Report.create!(report_params)\n  GenerateReportJob.perform_later(@report.id)\n  redirect_to @report, notice: 'Report is being generated...'\nend" }
    ],
    keyTakeaway: "Move anything that takes more than a few hundred milliseconds to a background job.",
    references: [
      { title: "Active Job Basics", url: "https://guides.rubyonrails.org/active_job_basics.html" }
    ]
  },
  "ruby.rails-specific.are-validations-present-for-model-data-integrity": {
    whatItMeans: "ActiveRecord validations ensure data integrity at the model level, catching invalid data before it reaches the database.",
    whyItMatters: "Without validations, invalid data silently enters the database, causing bugs downstream. Model validations are the last line of defense before persistence.",
    howToVerify: "- Check that new columns have appropriate validations (presence, format, uniqueness)\n- Verify uniqueness validations have corresponding database indexes\n- Check for custom validations on complex business rules",
    exampleComment: "The new `email` column doesn't have a format validation. Could you add `validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }`?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class User < ApplicationRecord\n  # No validations — anything goes\nend" },
      { label: "Good", language: "ruby", code: "class User < ApplicationRecord\n  validates :name, presence: true, length: { maximum: 100 }\n  validates :email, presence: true, uniqueness: true,\n            format: { with: URI::MailTo::EMAIL_REGEXP }\n  validates :role, inclusion: { in: %w[admin editor viewer] }\nend" }
    ],
    keyTakeaway: "Validate at the model level — it's your last line of defense before data hits the database.",
    references: [
      { title: "Active Record Validations", url: "https://guides.rubyonrails.org/active_record_validations.html" }
    ]
  },
  "ruby.rails-specific.are-controllers-thin-business-logic-in-modelsservices": {
    whatItMeans: "Controllers handle HTTP concerns (params, routing, response format) and delegate business logic to models, service objects, or form objects.",
    whyItMatters: "Fat controllers are hard to test, hard to reuse, and tend to accumulate duplicated logic. Business logic in models or services can be tested independently.",
    howToVerify: "- Check that controller actions are under ~10 lines\n- Look for conditional logic, calculations, or multi-step workflows in controllers\n- Verify complex operations use service objects or model methods",
    exampleComment: "This `create` action has 30 lines of order processing logic. Could we extract a `CreateOrderService` that encapsulates the workflow?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def create\n  @order = Order.new(order_params)\n  @order.total = calculate_total(order_params[:items])\n  @order.tax = @order.total * tax_rate\n  @order.discount = find_discount(current_user)\n  if @order.save\n    send_confirmation(@order)\n    update_inventory(@order)\n    redirect_to @order\n  end\nend" },
      { label: "Good", language: "ruby", code: "def create\n  result = CreateOrderService.call(order_params, current_user)\n  if result.success?\n    redirect_to result.order\n  else\n    render :new, status: :unprocessable_entity\n  end\nend" }
    ],
    keyTakeaway: "Keep controllers thin — they should orchestrate, not implement business logic.",
    references: []
  },
  "ruby.rails-specific.are-routes-restful-and-following-conventions": {
    whatItMeans: "Routes follow RESTful conventions with standard HTTP verbs mapping to standard controller actions (index, show, new, create, edit, update, destroy).",
    whyItMatters: "RESTful routes are predictable and self-documenting. Non-standard routes lead to inconsistent APIs and make the app harder to understand.",
    howToVerify: "- Check that new routes use `resources` or `resource` declarations\n- Look for custom routes that could be standard RESTful actions on a new resource\n- Verify nested routes don't go deeper than 2 levels",
    exampleComment: "The custom route `post '/orders/:id/cancel'` would be more RESTful as `resources :orders do resource :cancellation, only: [:create] end`.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "get '/get_users', to: 'users#get_all'\npost '/create_user', to: 'users#make'\npost '/orders/:id/cancel', to: 'orders#cancel'" },
      { label: "Good", language: "ruby", code: "resources :users, only: [:index, :create, :show]\nresources :orders do\n  resource :cancellation, only: [:create]\nend" }
    ],
    keyTakeaway: "Use RESTful resources — when you need custom actions, model them as resources too.",
    references: [
      { title: "Rails Routing", url: "https://guides.rubyonrails.org/routing.html" }
    ]
  },
  "ruby.rails-specific.are-partial-views-extracted-for-reusable-ui-components": {
    whatItMeans: "Repeated view markup is extracted into partials (`_partial.html.erb`) rather than duplicated across templates.",
    whyItMatters: "Duplicated view code leads to inconsistencies when one copy is updated but not others. Partials keep views DRY and maintainable.",
    howToVerify: "- Look for repeated markup across templates in the diff\n- Check that new partials use local variables, not instance variables\n- Verify partials are small and focused on one UI concern",
    exampleComment: "The user card markup is duplicated in `index.html.erb` and `search.html.erb`. Could we extract a `_user_card.html.erb` partial?",
    codeExamples: [
      { label: "Bad", language: "erb", code: "<!-- Duplicated in index.html.erb AND show.html.erb -->\n<div class=\"user-card\">\n  <h3><%= user.name %></h3>\n  <p><%= user.email %></p>\n</div>" },
      { label: "Good", language: "erb", code: "<!-- _user_card.html.erb -->\n<div class=\"user-card\">\n  <h3><%= user.name %></h3>\n  <p><%= user.email %></p>\n</div>\n\n<!-- index.html.erb -->\n<%= render partial: 'user_card', collection: @users, as: :user %>" }
    ],
    keyTakeaway: "Extract partials for reusable UI — pass data via locals, not instance variables.",
    references: []
  },
  "ruby.rails-specific.are-database-indexes-in-place-for-queried-columns": {
    whatItMeans: "Columns used in WHERE clauses, JOINs, ORDER BY, and uniqueness validations have corresponding database indexes.",
    whyItMatters: "Missing indexes cause full table scans that become progressively slower as data grows. Adding indexes is cheap; missing them is expensive at scale.",
    howToVerify: "- Check that uniqueness validations have matching unique indexes\n- Look for `where`, `find_by`, `order` calls on columns without indexes\n- Check migration files for `add_index` on new columns that will be queried\n- Review foreign keys — they typically need indexes",
    exampleComment: "The `validates :email, uniqueness: true` validation needs a matching `add_index :users, :email, unique: true` in the migration to prevent race conditions and ensure performance.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Migration adds column without index\nadd_column :orders, :customer_email, :string\n\n# Model queries by email\nOrder.where(customer_email: email)" },
      { label: "Good", language: "ruby", code: "add_column :orders, :customer_email, :string\nadd_index :orders, :customer_email" }
    ],
    keyTakeaway: "Every queried column needs an index — add them in the same migration that adds the column.",
    references: []
  },

  // ── Error Handling ──
  "ruby.error-handling.are-exceptions-rescued-specifically-not-bare-rescue": {
    whatItMeans: "Rescue blocks catch specific exception classes instead of using bare `rescue` (which catches `StandardError`) or `rescue Exception` (which catches everything including system signals).",
    whyItMatters: "Bare rescue swallows unexpected errors, hiding bugs. `rescue Exception` catches `Interrupt` and `SystemExit`, making the process unkillable. Always rescue the most specific class.",
    howToVerify: "- Search for bare `rescue` or `rescue => e` without a class\n- Search for `rescue Exception` — this is almost always wrong\n- Verify each rescue block catches the narrowest applicable exception class",
    exampleComment: "This bare `rescue` will silently swallow `NoMethodError`, `TypeError`, and other bugs. Could you rescue `ActiveRecord::RecordNotFound` specifically?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "begin\n  user = User.find(id)\nrescue\n  nil  # Swallows ALL errors\nend" },
      { label: "Good", language: "ruby", code: "begin\n  user = User.find(id)\nrescue ActiveRecord::RecordNotFound => e\n  Rails.logger.warn(\"User not found: #{id}\")\n  nil\nend" }
    ],
    keyTakeaway: "Always rescue specific exceptions — bare rescue hides bugs, rescue Exception breaks signals.",
    references: [
      { title: "Ruby Exception Hierarchy", url: "https://ruby-doc.org/core/Exception.html" }
    ]
  },
  "ruby.error-handling.are-custom-error-classes-defined-for-domain-specific-errors": {
    whatItMeans: "Domain-specific error conditions use custom exception classes rather than generic `StandardError` or strings, enabling precise rescue and meaningful error handling.",
    whyItMatters: "Custom exceptions allow callers to rescue specific failure modes and handle them differently. They also improve error messages in logs and monitoring.",
    howToVerify: "- Check that domain errors have custom exception classes\n- Verify custom exceptions inherit from `StandardError` (not `Exception`)\n- Look for `raise 'message'` (raises RuntimeError) that should use a custom class",
    exampleComment: "Raising `RuntimeError` with a message string loses the semantic meaning. A `PaymentDeclinedError` would let callers handle payment failures specifically.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "raise 'Payment was declined'\nraise StandardError, 'Insufficient inventory'" },
      { label: "Good", language: "ruby", code: "class PaymentDeclinedError < StandardError; end\nclass InsufficientInventoryError < StandardError; end\n\nraise PaymentDeclinedError, 'Card ending in 4242 was declined'\nraise InsufficientInventoryError, \"Only #{available} units in stock\"" }
    ],
    keyTakeaway: "Define custom exceptions for domain error conditions — they enable precise error handling.",
    references: []
  },
  "ruby.error-handling.is-ensure-used-for-cleanup-code": {
    whatItMeans: "The `ensure` block is used for cleanup that must run regardless of success or failure, such as closing files, releasing locks, or restoring state.",
    whyItMatters: "Without `ensure`, resource cleanup is skipped when exceptions occur, causing leaks, dangling locks, and inconsistent state.",
    howToVerify: "- Look for resources opened without `ensure` cleanup\n- Check for lock acquisitions without corresponding releases\n- Verify file handles, database connections, and temporary files are cleaned up",
    exampleComment: "If an exception occurs between acquiring the lock and releasing it, the lock is never released. Could you move the unlock to an `ensure` block?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def process_file(path)\n  file = File.open(path)\n  data = parse(file.read)  # May raise!\n  file.close  # Never reached on error\n  data\nend" },
      { label: "Good", language: "ruby", code: "def process_file(path)\n  file = File.open(path)\n  parse(file.read)\nensure\n  file&.close\nend\n\n# Or even better:\nFile.open(path) { |f| parse(f.read) }" }
    ],
    keyTakeaway: "Use `ensure` for cleanup, or better yet, use blocks and context managers that handle it automatically.",
    references: []
  },
  "ruby.error-handling.are-error-responses-consistent-across-the-api": {
    whatItMeans: "API error responses follow a consistent format (structure, status codes, error keys) across all endpoints.",
    whyItMatters: "Inconsistent error formats force API consumers to handle each endpoint differently, increasing client complexity and causing integration bugs.",
    howToVerify: "- Check that error responses use consistent JSON structure\n- Verify HTTP status codes are semantically correct (422 for validation, 404 for not found, etc.)\n- Look for a shared error rendering concern or base controller method",
    exampleComment: "This endpoint returns `{ error: 'message' }` but other endpoints use `{ errors: [{ detail: 'message' }] }`. Could we use the shared `render_error` helper for consistency?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Different error formats across endpoints:\nrender json: { error: 'Not found' }, status: 404\nrender json: { message: 'Invalid' }, status: 400\nrender json: { errors: ['Bad'] }, status: 422" },
      { label: "Good", language: "ruby", code: "# Consistent error format:\ndef render_error(message, status:)\n  render json: {\n    error: { message: message, status: status }\n  }, status: status\nend\n\nrender_error('User not found', status: :not_found)" }
    ],
    keyTakeaway: "Define a shared error response format and use it everywhere — API consumers will thank you.",
    references: []
  },
  "ruby.error-handling.is-error-logging-structured-with-context": {
    whatItMeans: "Error logs include structured context (user ID, request ID, operation name) rather than bare messages, making debugging and monitoring effective.",
    whyItMatters: "Generic error messages like 'something failed' are useless in production. Structured context enables filtering, alerting, and root cause analysis.",
    howToVerify: "- Check that rescue blocks log the exception class, message, and relevant context\n- Look for bare `puts` or `Rails.logger.error(e.message)` without context\n- Verify error monitoring (Sentry, Bugsnag) tags are applied",
    exampleComment: "This `Rails.logger.error(e.message)` loses the backtrace and context. Could you add the user ID and operation name? `Rails.logger.error(\"Payment failed\", user_id: user.id, error: e.class.name)`",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "rescue => e\n  Rails.logger.error(e.message)" },
      { label: "Good", language: "ruby", code: "rescue PaymentError => e\n  Rails.logger.error(\n    'Payment processing failed',\n    user_id: current_user.id,\n    order_id: order.id,\n    error_class: e.class.name,\n    error_message: e.message\n  )\n  Sentry.capture_exception(e)\nend" }
    ],
    keyTakeaway: "Log errors with structured context — who, what, when, and why the error occurred.",
    references: []
  },

  // ── Testing ──
  "ruby.testing.are-there-unit-tests-for-new-logic-rspec-or-minitest": {
    whatItMeans: "New logic (methods, classes, services) has corresponding unit tests using the project's test framework (RSpec or Minitest).",
    whyItMatters: "Tests verify behavior, prevent regressions, and serve as documentation. Untested code is a liability that breaks silently when requirements change.",
    howToVerify: "- Check that new methods/classes have corresponding spec files\n- Verify tests cover the happy path and key error paths\n- Check that tests are actually asserting outcomes, not just calling methods",
    exampleComment: "The new `DiscountCalculator` class doesn't have specs. Could you add tests covering the standard discount, bulk discount, and expired coupon scenarios?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# No tests for new service\nclass DiscountCalculator\n  def calculate(order)\n    # complex logic...\n  end\nend" },
      { label: "Good", language: "ruby", code: "RSpec.describe DiscountCalculator do\n  describe '#calculate' do\n    it 'applies percentage discount' do\n      order = build(:order, subtotal: 100)\n      discount = described_class.new(percentage: 10)\n      expect(discount.calculate(order)).to eq(10)\n    end\n\n    it 'caps discount at order subtotal' do\n      order = build(:order, subtotal: 5)\n      discount = described_class.new(fixed: 10)\n      expect(discount.calculate(order)).to eq(5)\n    end\n  end\nend" }
    ],
    keyTakeaway: "Every new piece of logic needs tests — they're the safety net that lets you refactor with confidence.",
    references: []
  },
  "ruby.testing.are-factories-factorybot-used-instead-of-fixtures-for-test-data": {
    whatItMeans: "Test data is created using FactoryBot factories rather than YAML fixtures, providing flexible, composable, and readable test setup.",
    whyItMatters: "Fixtures are global shared state that becomes fragile as tests grow. Factories create data declaratively in each test, making tests independent and explicit.",
    howToVerify: "- Check that new test data uses `build`, `create`, or `build_stubbed` from FactoryBot\n- Look for new fixture YAML files being added\n- Verify factories use traits for variations instead of creating many similar factories",
    exampleComment: "Could you use a factory instead of this fixture? `create(:user, :admin)` is more readable and won't break when the User schema changes.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# test/fixtures/users.yml\nadmin_user:\n  name: Admin\n  email: admin@test.com\n  role: admin\n  # Breaks when columns are added" },
      { label: "Good", language: "ruby", code: "FactoryBot.define do\n  factory :user do\n    name { Faker::Name.name }\n    email { Faker::Internet.email }\n\n    trait :admin do\n      role { 'admin' }\n    end\n  end\nend\n\n# In tests:\ncreate(:user, :admin)" }
    ],
    keyTakeaway: "Use FactoryBot with traits for flexible, maintainable test data. Avoid fixtures for new tests.",
    references: [
      { title: "FactoryBot", url: "https://github.com/thoughtbot/factory_bot" }
    ]
  },
  "ruby.testing.are-request-specs-added-for-new-api-endpoints": {
    whatItMeans: "New API endpoints have request specs (integration tests) that test the full request/response cycle including routing, authentication, and serialization.",
    whyItMatters: "Unit tests on controllers miss routing, middleware, and serialization issues. Request specs catch integration bugs that only appear when the full stack runs.",
    howToVerify: "- Check that new routes have corresponding request specs\n- Verify specs test authentication, authorization, happy path, and error cases\n- Check that response status codes and body structure are asserted",
    exampleComment: "The new `POST /api/orders` endpoint needs request specs. Could you add tests for successful creation, validation errors, and unauthorized access?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Only testing the controller method in isolation\nRSpec.describe OrdersController do\n  it 'creates an order' do\n    controller.create\n  end\nend" },
      { label: "Good", language: "ruby", code: "RSpec.describe 'POST /api/orders', type: :request do\n  let(:user) { create(:user) }\n  let(:valid_params) { { order: { product_id: 1, quantity: 2 } } }\n\n  it 'creates an order' do\n    post '/api/orders', params: valid_params,\n         headers: auth_headers(user)\n    expect(response).to have_http_status(:created)\n    expect(json_body[:order][:id]).to be_present\n  end\n\n  it 'returns 422 for invalid params' do\n    post '/api/orders', params: { order: { quantity: -1 } },\n         headers: auth_headers(user)\n    expect(response).to have_http_status(:unprocessable_entity)\n  end\nend" }
    ],
    keyTakeaway: "Request specs test the full stack — add them for every new endpoint.",
    references: []
  },
  "ruby.testing.are-tests-using-let-and-subject-for-dry-setup": {
    whatItMeans: "RSpec tests use `let` (lazy) and `subject` for test data setup instead of repeating setup code in every example.",
    whyItMatters: "`let` blocks are lazy-evaluated and memoized per example, reducing duplication while keeping tests independent. `subject` makes it clear what's being tested.",
    howToVerify: "- Look for repeated variable assignments across multiple `it` blocks\n- Check that `let` is preferred over `let!` (eager) unless needed\n- Verify `subject` is used when testing a single method or class",
    exampleComment: "The `user = create(:user)` is repeated in every test. Could you extract it to `let(:user) { create(:user) }` at the describe level?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "it 'activates the user' do\n  user = create(:user)\n  user.activate!\n  expect(user).to be_active\nend\n\nit 'sends notification' do\n  user = create(:user)  # Duplicated!\n  user.activate!\n  expect(UserMailer).to have_enqueued_mail\nend" },
      { label: "Good", language: "ruby", code: "describe '#activate!' do\n  let(:user) { create(:user) }\n\n  it 'marks user as active' do\n    user.activate!\n    expect(user).to be_active\n  end\n\n  it 'sends activation notification' do\n    user.activate!\n    expect(UserMailer).to have_enqueued_mail\n  end\nend" }
    ],
    keyTakeaway: "Use `let` for setup, `subject` for the thing under test — keep it DRY but readable.",
    references: []
  },
  "ruby.testing.are-shared-examples-used-for-common-behavior": {
    whatItMeans: "RSpec shared examples (`shared_examples`, `it_behaves_like`) are used to test behavior that's common across multiple classes or contexts.",
    whyItMatters: "Duplicating test logic across specs wastes effort and creates maintenance burden. Shared examples ensure common behavior is tested consistently.",
    howToVerify: "- Look for identical test patterns across multiple spec files\n- Check that shared examples test behavior, not implementation details\n- Verify shared examples are parameterized for flexibility",
    exampleComment: "The authentication and authorization tests are duplicated across all controller specs. Could we extract `shared_examples 'an authenticated endpoint'` to DRY these up?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Duplicated in every controller spec\nit 'returns 401 without auth' do\n  get path\n  expect(response).to have_http_status(:unauthorized)\nend" },
      { label: "Good", language: "ruby", code: "RSpec.shared_examples 'an authenticated endpoint' do\n  it 'returns 401 without auth' do\n    make_request\n    expect(response).to have_http_status(:unauthorized)\n  end\nend\n\n# In each spec:\nit_behaves_like 'an authenticated endpoint'" }
    ],
    keyTakeaway: "Use shared examples for common behavior patterns — test once, verify everywhere.",
    references: []
  },
  "ruby.testing.are-edge-cases-covered-nil-empty-boundary-values": {
    whatItMeans: "Tests cover edge cases like nil inputs, empty collections, boundary values, and unusual but valid inputs, not just the happy path.",
    whyItMatters: "Bugs hide in edge cases. Happy-path-only testing gives false confidence — production data is messy and hits every corner case you didn't test.",
    howToVerify: "- Check for tests with nil, empty string, empty array, zero, negative numbers\n- Look for boundary value tests (off-by-one, max length, date boundaries)\n- Verify error handling paths are tested, not just success paths",
    exampleComment: "The discount calculator tests only check positive amounts. Could you add tests for zero, negative, and nil values? Also, what happens with an empty cart?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "it 'calculates discount' do\n  expect(calc.discount(100)).to eq(10)\nend" },
      { label: "Good", language: "ruby", code: "it 'calculates discount' do\n  expect(calc.discount(100)).to eq(10)\nend\n\nit 'returns zero for zero amount' do\n  expect(calc.discount(0)).to eq(0)\nend\n\nit 'handles nil amount' do\n  expect { calc.discount(nil) }.to raise_error(ArgumentError)\nend\n\nit 'caps discount at order total' do\n  expect(calc.discount(5)).to eq(5)\nend" }
    ],
    keyTakeaway: "Test the edges — nil, empty, zero, max, and negative values are where bugs live.",
    references: []
  },
  "ruby.testing.are-test-names-descriptive-of-expected-behavior": {
    whatItMeans: "Test descriptions clearly state the expected behavior in human-readable form, reading as a specification of the system.",
    whyItMatters: "Good test names serve as documentation. When a test fails, a descriptive name tells you exactly what behavior broke without reading the test code.",
    howToVerify: "- Read test descriptions aloud — do they describe behavior or implementation?\n- Check that `it` blocks describe outcomes, not steps\n- Verify `describe` and `context` blocks provide meaningful grouping",
    exampleComment: "The test name `it 'works'` doesn't describe the expected behavior. Could you rename it to `it 'returns the user's full name in last, first format'`?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "it 'works' do ... end\nit 'test 1' do ... end\nit 'should do the thing' do ... end" },
      { label: "Good", language: "ruby", code: "describe '#full_name' do\n  context 'when user has first and last name' do\n    it 'returns names joined with a space' do\n      user = build(:user, first_name: 'Ada', last_name: 'Lovelace')\n      expect(user.full_name).to eq('Ada Lovelace')\n    end\n  end\n\n  context 'when last name is nil' do\n    it 'returns only the first name' do\n      user = build(:user, first_name: 'Ada', last_name: nil)\n      expect(user.full_name).to eq('Ada')\n    end\n  end\nend" }
    ],
    keyTakeaway: "Test names should read like a specification — describe the expected behavior, not the implementation.",
    references: []
  },
  "ruby.testing.is-test-coverage-adequate-for-the-change": {
    whatItMeans: "The test coverage for the changed code is sufficient to catch regressions, covering the main paths, error cases, and critical edge cases.",
    whyItMatters: "Insufficient coverage means changes can break behavior without any test failing. Good coverage gives confidence to refactor and deploy.",
    howToVerify: "- Run the test suite with coverage (`SimpleCov`) and check coverage of changed files\n- Verify that the core behavior paths are tested\n- Check that the PR doesn't decrease overall coverage",
    exampleComment: "The new `PaymentService` has only 40% coverage. The retry logic and error handling paths aren't tested. Could you add specs for the timeout and declined payment scenarios?",
    codeExamples: [],
    keyTakeaway: "Aim for meaningful coverage — test behavior and edge cases, not just lines executed.",
    references: [
      { title: "SimpleCov", url: "https://github.com/simplecov-ruby/simplecov" }
    ]
  },

  // ── Security ──
  "ruby.security.is-user-input-sanitized-to-prevent-xss-and-sql-injection": {
    whatItMeans: "User-provided data is sanitized before rendering in HTML (preventing XSS) and parameterized in database queries (preventing SQL injection).",
    whyItMatters: "XSS allows attackers to execute scripts in other users' browsers. SQL injection allows unauthorized data access or destruction. Both are critical vulnerabilities.",
    howToVerify: "- Check for `.html_safe` or `raw()` on user-provided content\n- Look for string interpolation in SQL queries (use parameterized queries instead)\n- Verify ERB templates use `<%= %>` (escaped) not `<%== %>` (unescaped) for user data",
    exampleComment: "This `.html_safe` call on `user.bio` could allow XSS if the bio contains `<script>` tags. Could you use `sanitize(user.bio)` instead?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# SQL injection:\nUser.where(\"name = '#{params[:name]}'\")\n\n# XSS:\n<%= user.bio.html_safe %>" },
      { label: "Good", language: "ruby", code: "# Parameterized query:\nUser.where(name: params[:name])\n\n# Sanitized output:\n<%= sanitize(user.bio) %>" }
    ],
    keyTakeaway: "Never trust user input — parameterize queries and sanitize HTML output.",
    references: [
      { title: "Rails Security Guide", url: "https://guides.rubyonrails.org/security.html" }
    ]
  },
  "ruby.security.are-csrf-tokens-verified-for-state-changing-requests": {
    whatItMeans: "CSRF protection is enabled for state-changing requests (POST, PUT, DELETE) to prevent cross-site request forgery attacks.",
    whyItMatters: "CSRF attacks trick authenticated users into performing actions they didn't intend. Rails includes CSRF protection by default — don't disable it.",
    howToVerify: "- Check that `protect_from_forgery` is not disabled in ApplicationController\n- Look for `skip_before_action :verify_authenticity_token` — needs justification\n- For APIs, verify token-based auth (JWT, API keys) is used instead of cookies",
    exampleComment: "This controller skips CSRF verification but uses session-based auth. This opens up CSRF attacks. If this is an API endpoint, switch to token-based auth; otherwise, keep CSRF protection.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "class PaymentsController < ApplicationController\n  skip_before_action :verify_authenticity_token\n  # Now vulnerable to CSRF!\nend" },
      { label: "Good", language: "ruby", code: "class PaymentsController < ApplicationController\n  # CSRF protection inherited from ApplicationController\nend\n\n# For API endpoints:\nclass Api::PaymentsController < ActionController::API\n  before_action :authenticate_api_token!\nend" }
    ],
    keyTakeaway: "Never disable CSRF protection for session-authenticated endpoints — use token auth for APIs.",
    references: []
  },
  "ruby.security.are-secrets-loaded-from-environment-variables-not-hardcoded": {
    whatItMeans: "Secrets (API keys, database passwords, tokens) are loaded from environment variables or Rails credentials, never hardcoded in source code.",
    whyItMatters: "Hardcoded secrets in source code end up in git history and can be exposed through repository access, log files, or error messages.",
    howToVerify: "- Search the diff for hardcoded API keys, passwords, or tokens\n- Check that secrets use `ENV['KEY']` or `Rails.application.credentials`\n- Verify `.env` files are in `.gitignore`",
    exampleComment: "This API key is hardcoded in the source. Could you move it to `Rails.application.credentials` or an environment variable?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "STRIPE_KEY = 'sk_live_abc123def456'\nDATABASE_URL = 'postgres://user:pass@host/db'" },
      { label: "Good", language: "ruby", code: "STRIPE_KEY = ENV.fetch('STRIPE_KEY')\n# or\nSTRIPE_KEY = Rails.application.credentials.stripe[:secret_key]" }
    ],
    keyTakeaway: "Never hardcode secrets — use environment variables or Rails encrypted credentials.",
    references: [
      { title: "Rails Credentials", url: "https://guides.rubyonrails.org/security.html#custom-credentials" }
    ]
  },
  "ruby.security.are-brakeman-warnings-addressed": {
    whatItMeans: "The Brakeman static analysis tool reports no new security warnings for the changed code.",
    whyItMatters: "Brakeman catches common Rails security issues (SQL injection, XSS, mass assignment, etc.) automatically. Unaddressed warnings represent real vulnerabilities.",
    howToVerify: "- Run `bundle exec brakeman --only-files changed_files` on the changed files\n- Check CI for Brakeman results\n- Verify any ignored warnings have documented justification",
    exampleComment: "Brakeman reports a SQL injection warning on line 42. The `where(\"name LIKE '%#{query}%'\")` should use `where('name LIKE ?', \"%#{query}%\")` to parameterize the input.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Brakeman warning: SQL Injection\nUser.where(\"role = '#{params[:role]}'\")" },
      { label: "Good", language: "ruby", code: "# No warning — parameterized\nUser.where(role: params[:role])" }
    ],
    keyTakeaway: "Run Brakeman in CI and address all warnings — it catches vulnerabilities humans miss.",
    references: [
      { title: "Brakeman", url: "https://brakemanscanner.org/" }
    ]
  },
  "ruby.security.are-file-uploads-validated-type-size-content": {
    whatItMeans: "File uploads are validated for type (content type, not just extension), size limits, and potentially scanned for malicious content.",
    whyItMatters: "Unvalidated uploads can be used to upload executable files, consume disk space, or deliver malware. Relying on extension alone is trivially bypassed.",
    howToVerify: "- Check that file type is validated by content type, not just extension\n- Verify size limits are enforced\n- Check that uploaded files are stored outside the web root\n- Look for Active Storage validations or custom validators",
    exampleComment: "The upload only checks the file extension. An attacker could upload a `.jpg` file containing executable code. Could you validate the content type with `content_type: ['image/png', 'image/jpeg']`?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "has_one_attached :avatar\n# No validation — accepts anything" },
      { label: "Good", language: "ruby", code: "has_one_attached :avatar\n\nvalidates :avatar,\n  content_type: ['image/png', 'image/jpeg', 'image/webp'],\n  size: { less_than: 5.megabytes }" }
    ],
    keyTakeaway: "Validate upload content type, size, and store files safely — never trust the file extension alone.",
    references: []
  },
  "ruby.security.are-authorization-checks-in-place-pundit-cancancan": {
    whatItMeans: "Controller actions verify the current user has permission to perform the requested action, using an authorization library like Pundit or CanCanCan.",
    whyItMatters: "Missing authorization checks allow users to access or modify resources they shouldn't. Authentication (who are you) is not authorization (what can you do).",
    howToVerify: "- Check that controller actions call `authorize` (Pundit) or `authorize!` (CanCanCan)\n- Look for Pundit's `after_action :verify_authorized` to catch missing checks\n- Verify policy/ability rules match the intended access control",
    exampleComment: "The `destroy` action doesn't check authorization — any authenticated user can delete any record. Could you add `authorize @post` to enforce the policy?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def destroy\n  @post = Post.find(params[:id])\n  @post.destroy  # Anyone can delete!\nend" },
      { label: "Good", language: "ruby", code: "def destroy\n  @post = Post.find(params[:id])\n  authorize @post  # Checks PostPolicy#destroy?\n  @post.destroy\nend" }
    ],
    keyTakeaway: "Always authorize, not just authenticate — use Pundit or CanCanCan to enforce access control.",
    references: [
      { title: "Pundit", url: "https://github.com/varvet/pundit" }
    ]
  },
  "ruby.security.are-sensitive-data-not-logged": {
    whatItMeans: "Sensitive data (passwords, tokens, SSNs, credit card numbers) is filtered from logs using Rails' parameter filtering.",
    whyItMatters: "Logs are often stored in plain text, shared across teams, and sent to third-party services. Sensitive data in logs is a compliance violation and security risk.",
    howToVerify: "- Check `config/initializers/filter_parameter_logging.rb` for filtered params\n- Look for manual logging that might include sensitive attributes\n- Verify Active Record's `filter_attributes` is set for sensitive model columns",
    exampleComment: "The `password_confirmation` parameter isn't in the filter list. Could you add it to `Rails.application.config.filter_parameters`?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "Rails.logger.info(\"User login: #{params}\")\n# Logs password in plain text!" },
      { label: "Good", language: "ruby", code: "# config/initializers/filter_parameter_logging.rb\nRails.application.config.filter_parameters += [\n  :password, :password_confirmation, :token,\n  :secret, :ssn, :credit_card\n]" }
    ],
    keyTakeaway: "Filter sensitive parameters from logs — passwords, tokens, and PII should never appear in plain text.",
    references: []
  },
  "ruby.security.are-dependency-vulnerabilities-checked-bundler-audit": {
    whatItMeans: "Gem dependencies are scanned for known security vulnerabilities using `bundler-audit` or similar tools.",
    whyItMatters: "Dependencies with known CVEs are a common attack vector. Regular scanning catches vulnerabilities before they're exploited in production.",
    howToVerify: "- Run `bundle exec bundler-audit check --update`\n- Check if bundler-audit is part of the CI pipeline\n- Look for outdated gems with known vulnerabilities in the Gemfile.lock",
    exampleComment: "bundler-audit reports CVE-2024-XXXX in `actionpack` 7.0.4. Could you bump to 7.0.8+ which patches this vulnerability?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# Gemfile.lock has vulnerable versions\n# No audit step in CI" },
      { label: "Good", language: "ruby", code: "# In CI pipeline:\nbundle exec bundler-audit check --update\n\n# Or use:\ngem 'bundler-audit', require: false, group: :development" }
    ],
    keyTakeaway: "Run bundler-audit in CI — catch vulnerable dependencies before they reach production.",
    references: [
      { title: "bundler-audit", url: "https://github.com/rubysec/bundler-audit" }
    ]
  },

  // ── Performance ──
  "ruby.performance.are-database-queries-optimized-explain-indexes": {
    whatItMeans: "Database queries are analyzed with `EXPLAIN` to ensure they use indexes efficiently and don't perform full table scans.",
    whyItMatters: "Unoptimized queries that work fine with 100 records become unacceptably slow with 100,000 records. `EXPLAIN` reveals the query plan before problems hit production.",
    howToVerify: "- Run `.explain` on new or modified queries and check for sequential scans\n- Verify indexes exist for columns in WHERE, ORDER BY, and JOIN clauses\n- Check for missing composite indexes on multi-column queries",
    exampleComment: "Running `Order.where(status: 'pending', created_at: ..1.day.ago).explain` shows a sequential scan. A composite index on `(status, created_at)` would help.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# No index on status + created_at\nOrder.where(status: 'pending')\n     .where('created_at > ?', 1.day.ago)\n     .order(:created_at)" },
      { label: "Good", language: "ruby", code: "# Migration:\nadd_index :orders, [:status, :created_at]\n\n# Query uses the index:\nOrder.where(status: 'pending')\n     .where('created_at > ?', 1.day.ago)\n     .order(:created_at)" }
    ],
    keyTakeaway: "Use EXPLAIN on queries and ensure indexes cover your WHERE, ORDER BY, and JOIN columns.",
    references: []
  },
  "ruby.performance.is-caching-used-appropriately-fragment-action-low-level": {
    whatItMeans: "Appropriate caching strategies (fragment caching, low-level caching, HTTP caching) are used for expensive operations and frequently accessed data.",
    whyItMatters: "Caching avoids redundant computation and database queries. A well-placed cache can turn a 500ms response into a 5ms response.",
    howToVerify: "- Look for expensive queries or computations that could be cached\n- Check that cache keys include versioning or timestamps for invalidation\n- Verify `Rails.cache` is configured with an appropriate store (Redis, Memcached)",
    exampleComment: "The `popular_products` query runs on every page load and takes 200ms. Could we cache it with `Rails.cache.fetch('popular_products', expires_in: 1.hour)`?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def popular_products\n  Product.joins(:orders)\n    .group(:id)\n    .order('COUNT(orders.id) DESC')\n    .limit(10)  # Runs every request\nend" },
      { label: "Good", language: "ruby", code: "def popular_products\n  Rails.cache.fetch('popular_products', expires_in: 1.hour) do\n    Product.joins(:orders)\n      .group(:id)\n      .order('COUNT(orders.id) DESC')\n      .limit(10)\n      .to_a  # Materialize before caching\n  end\nend" }
    ],
    keyTakeaway: "Cache expensive queries and computations — set appropriate TTLs and invalidation strategies.",
    references: [
      { title: "Rails Caching", url: "https://guides.rubyonrails.org/caching_with_rails.html" }
    ]
  },
  "ruby.performance.are-bulk-operations-used-instead-of-iterating-with-individual-saves": {
    whatItMeans: "Bulk database operations (`insert_all`, `update_all`, `upsert_all`) are used instead of iterating and saving records one at a time.",
    whyItMatters: "Iterating with individual saves generates one query per record. Bulk operations use a single query, which is orders of magnitude faster for large datasets.",
    howToVerify: "- Look for `.each { |r| r.update(...) }` patterns that could be `update_all`\n- Check for loops creating records that could use `insert_all`\n- Verify bulk operations include necessary validations or callbacks",
    exampleComment: "This loop updates 10,000 records with individual `save` calls (10,000 queries). `User.where(role: 'trial').update_all(role: 'free')` would do it in one query.",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "users.each do |user|\n  user.update(status: 'archived')  # One query per user\nend" },
      { label: "Good", language: "ruby", code: "User.where(id: user_ids).update_all(status: 'archived')  # One query" }
    ],
    keyTakeaway: "Use bulk operations for batch updates — one query beats N queries every time.",
    references: []
  },
  "ruby.performance.are-counter-caches-used-for-hasmany-counts": {
    whatItMeans: "Counter cache columns are used to store association counts (e.g., `comments_count`) instead of running COUNT queries every time.",
    whyItMatters: "Without counter caches, displaying a count requires a COUNT query on the associated table for each record, causing N+1 count queries on index pages.",
    howToVerify: "- Look for `.count` or `.size` calls on associations that are displayed in lists\n- Check that `counter_cache: true` is set on `belongs_to` associations\n- Verify the counter column exists in the migration",
    exampleComment: "Displaying `post.comments.count` for each post on the index page generates an N+1. Could we add a `comments_count` counter cache column?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "# In view, for each post:\n<%= post.comments.count %>  # Runs COUNT query per post" },
      { label: "Good", language: "ruby", code: "# Migration:\nadd_column :posts, :comments_count, :integer, default: 0\n\n# Model:\nclass Comment < ApplicationRecord\n  belongs_to :post, counter_cache: true\nend\n\n# In view — reads column, no query:\n<%= post.comments_count %>" }
    ],
    keyTakeaway: "Use counter caches for frequently displayed counts — they eliminate N+1 count queries.",
    references: [
      { title: "Counter Cache", url: "https://guides.rubyonrails.org/association_basics.html#options-for-belongs-to-counter-cache" }
    ]
  },
  "ruby.performance.is-pagination-used-for-large-collections": {
    whatItMeans: "Large collections are paginated rather than loaded entirely into memory, using gems like Kaminari or Pagy.",
    whyItMatters: "Loading thousands of records at once consumes memory, slows responses, and overwhelms the UI. Pagination keeps responses fast and memory usage bounded.",
    howToVerify: "- Check that index actions and list endpoints use pagination\n- Verify the page size is reasonable (25-100 records)\n- Look for `.all` or `.to_a` on potentially large collections",
    exampleComment: "This endpoint returns all orders without pagination. With 50K orders, this will timeout and consume excessive memory. Could you add `.page(params[:page]).per(25)`?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def index\n  @orders = Order.all  # Could be millions\nend" },
      { label: "Good", language: "ruby", code: "def index\n  @orders = Order.order(created_at: :desc)\n                 .page(params[:page])\n                 .per(25)\nend" }
    ],
    keyTakeaway: "Always paginate collections — unbounded queries are a performance time bomb.",
    references: [
      { title: "Pagy", url: "https://github.com/ddnexus/pagy" },
      { title: "Kaminari", url: "https://github.com/kaminari/kaminari" }
    ]
  },

  // ── Dependencies & Documentation ──
  "ruby.dependencies-documentation.are-new-gems-justified-and-vetted": {
    whatItMeans: "New gem dependencies are justified by need, vetted for quality (maintenance, downloads, security), and not duplicating functionality already in the project.",
    whyItMatters: "Every dependency is a liability — it adds attack surface, bundle size, and maintenance burden. Abandoned or malicious gems are a supply chain risk.",
    howToVerify: "- Check the gem's GitHub: recent commits, open issues, download count\n- Verify the gem isn't abandoned (no releases in 2+ years)\n- Check if the functionality could be achieved with existing gems or stdlib\n- Run `bundle audit` after adding new gems",
    exampleComment: "The `string_utils` gem has 200 downloads and hasn't been updated in 3 years. Could we use Ruby's built-in `String` methods instead?",
    codeExamples: [],
    keyTakeaway: "Vet new gems carefully — prefer well-maintained, popular gems or stdlib alternatives.",
    references: []
  },
  "ruby.dependencies-documentation.is-gemfilelock-committed": {
    whatItMeans: "The `Gemfile.lock` is committed to version control, ensuring all environments use the exact same gem versions.",
    whyItMatters: "Without a committed lock file, different developers and environments may get different gem versions, causing 'works on my machine' bugs and security inconsistencies.",
    howToVerify: "- Check that `Gemfile.lock` is in the repository and updated in the PR\n- Verify it's not in `.gitignore`\n- For gems (libraries), Gemfile.lock should NOT be committed; for apps, it should",
    exampleComment: "The Gemfile.lock changes should be committed with this PR to ensure CI and production use the same versions.",
    codeExamples: [],
    keyTakeaway: "Always commit Gemfile.lock for applications — it ensures reproducible builds.",
    references: []
  },
  "ruby.dependencies-documentation.are-yard-or-rdoc-comments-added-for-public-apis": {
    whatItMeans: "Public methods and classes have YARD or RDoc documentation comments describing their purpose, parameters, and return values.",
    whyItMatters: "Documentation helps other developers use your code correctly without reading the implementation. YARD generates browsable API documentation automatically.",
    howToVerify: "- Check that new public methods have `@param` and `@return` tags\n- Verify class-level documentation explains the class's purpose\n- Run `yard doc` and check for undocumented warnings",
    exampleComment: "The `calculate_shipping` method has three parameters and complex logic. Could you add YARD documentation with `@param` and `@return` tags?",
    codeExamples: [
      { label: "Bad", language: "ruby", code: "def calculate_shipping(weight, zone, express)\n  # ... complex logic\nend" },
      { label: "Good", language: "ruby", code: "# Calculates shipping cost based on package weight and destination.\n#\n# @param weight [Float] package weight in kilograms\n# @param zone [String] shipping zone code (e.g., 'US-WEST')\n# @param express [Boolean] whether to use express shipping\n# @return [Money] the calculated shipping cost\n# @raise [InvalidZoneError] if the zone code is not recognized\ndef calculate_shipping(weight, zone, express)\n  # ... complex logic\nend" }
    ],
    keyTakeaway: "Document public APIs with YARD — future developers (including future you) will thank you.",
    references: [
      { title: "YARD", url: "https://yardoc.org/" }
    ]
  },
  "ruby.dependencies-documentation.is-the-readme-updated-for-setup-changes": {
    whatItMeans: "When the PR changes setup steps, environment variables, or system dependencies, the README is updated to reflect these changes.",
    whyItMatters: "Outdated setup documentation causes new team members to waste hours debugging environment issues. The README should always reflect the current state.",
    howToVerify: "- Check if the PR adds new environment variables — are they documented?\n- Check if the PR adds new system dependencies — are install steps updated?\n- Verify any changed configuration is reflected in the README",
    exampleComment: "This PR adds a Redis dependency for caching but the README setup instructions don't mention Redis. Could you add the Redis setup step?",
    codeExamples: [],
    keyTakeaway: "Update the README whenever you change setup requirements — documentation debt compounds fast.",
    references: []
  },
  "ruby.dependencies-documentation.are-breaking-changes-called-out": {
    whatItMeans: "Changes that break existing APIs, remove features, or require migration steps are clearly documented in the PR description and changelog.",
    whyItMatters: "Breaking changes without documentation surprise consumers and cause production incidents. Clear communication gives consumers time to adapt.",
    howToVerify: "- Check if the PR removes or renames public methods, endpoints, or configuration\n- Verify the PR description mentions breaking changes prominently\n- Look for migration guides or deprecation notices",
    exampleComment: "This PR renames the `authenticate!` method to `require_auth!`. This is a breaking change for any code using the old method name. Could you add a deprecation notice and document the migration path?",
    codeExamples: [],
    keyTakeaway: "Call out breaking changes loudly — in the PR title, description, and changelog.",
    references: []
  }
};
