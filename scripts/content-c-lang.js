module.exports = {
  // ── General Code Quality ──
  "c-lang.general-code-quality.does-the-pr-have-a-clear-description": {
    whatItMeans: "The pull request includes a summary of what changed and why, giving reviewers context before reading the diff.",
    whyItMatters: "C codebases are often low-level and dense. Without context, reviewers waste time reverse-engineering intent from pointer arithmetic and memory management patterns.",
    howToVerify: "- Read the PR description — does it explain the motivation and approach?\n- Check for links to design docs or issue trackers\n- Verify the description matches the actual code changes",
    exampleComment: "Could you add a description explaining why we're switching from `malloc` to a memory pool here? The motivation isn't clear from the diff alone.",
    codeExamples: [],
    keyTakeaway: "A good PR description is especially important in C where intent is harder to infer from code.",
    references: []
  },
  "c-lang.general-code-quality.is-the-change-scoped-appropriately": {
    whatItMeans: "The PR contains a single logical change — not too large to review meaningfully, not split so small that pieces don't make sense alone.",
    whyItMatters: "Large C PRs are dangerous — memory management bugs hide in big diffs. Well-scoped PRs get thorough review where every pointer and allocation is scrutinized.",
    howToVerify: "- Check the diff size — ideally under 400 lines of meaningful changes\n- Verify all changes relate to the stated purpose\n- Check whether the PR could be split into independent units",
    exampleComment: "This PR adds the new parser and refactors the memory allocator. Could we split these so the allocator changes can be reviewed for correctness independently?",
    codeExamples: [],
    keyTakeaway: "Keep C PRs focused — memory and pointer bugs hide in large diffs.",
    references: []
  },
  "c-lang.general-code-quality.are-there-any-unrelated-changes-bundled-in": {
    whatItMeans: "The PR doesn't mix unrelated fixes, formatting changes, or refactors with the primary change.",
    whyItMatters: "Bundled changes make it hard to isolate regressions and complicate reverts, which is especially costly in C where bugs can be security vulnerabilities.",
    howToVerify: "- Scan the file list for files unrelated to the PR's purpose\n- Look for stray formatting or whitespace changes\n- Check for drive-by fixes mixed in",
    exampleComment: "The `clang-format` changes across `utils/` are unrelated to the buffer overflow fix. Could you move formatting to a separate PR?",
    codeExamples: [],
    keyTakeaway: "Keep PRs focused — unrelated changes belong in separate PRs.",
    references: []
  },
  "c-lang.general-code-quality.is-dead-code-removed-rather-than-commented-out": {
    whatItMeans: "Unused code is deleted outright rather than commented out. Version control preserves history.",
    whyItMatters: "Commented-out C code creates confusion about whether it's needed, especially with `#ifdef` conditional compilation already in use.",
    howToVerify: "- Search for large commented-out blocks\n- Look for unused `#ifdef` branches that will never be enabled\n- Check for functions no longer called",
    exampleComment: "This commented-out `legacy_parse()` function is 80 lines long. Git history has it if we ever need it — safe to delete.",
    codeExamples: [
      { label: "Bad", language: "c", code: "/* void legacy_parse(const char *buf) {\n    ...\n    80 lines of old code\n    ...\n} */" },
      { label: "Good", language: "c", code: "/* Removed legacy_parse() — replaced by stream_parse() in commit abc123 */" }
    ],
    keyTakeaway: "Delete dead code — version control is your backup.",
    references: []
  },
  "c-lang.general-code-quality.are-todofixme-comments-accompanied-by-a-tracking-ticket": {
    whatItMeans: "TODO and FIXME comments reference a ticket or issue number so the work is tracked.",
    whyItMatters: "Untracked TODOs in C code are especially dangerous — they often mark known bugs, missing error handling, or security concerns that get forgotten.",
    howToVerify: "- Search for TODO, FIXME, HACK, XXX in the diff\n- Verify each has a ticket reference\n- Check that referenced tickets exist and are open",
    exampleComment: "This `/* FIXME: handle EINTR */` needs a ticket. Unhandled EINTR can cause silent data loss on interrupted system calls.",
    codeExamples: [
      { label: "Bad", language: "c", code: "/* TODO: check return value */" },
      { label: "Good", language: "c", code: "/* TODO(PROJ-789): Check read() return for partial reads */" }
    ],
    keyTakeaway: "Every TODO needs a tracking ticket — especially in C where TODOs often mark safety issues.",
    references: []
  },
  "c-lang.general-code-quality.does-the-commit-history-tell-a-coherent-story": {
    whatItMeans: "Commits are logically organized with clear messages, making the change history easy to understand and bisect.",
    whyItMatters: "Good commit history is critical in C — when a memory corruption bug surfaces weeks later, `git bisect` needs clean commits to find the culprit.",
    howToVerify: "- Read commit messages in order — do they tell a logical story?\n- Check for WIP or fixup commits that should be squashed\n- Verify each commit compiles cleanly",
    exampleComment: "Could you squash the 'fix typo' and 'WIP' commits before merging? Clean commits make `git bisect` work reliably.",
    codeExamples: [],
    keyTakeaway: "Clean commit history enables effective git bisect — essential for tracking down C bugs.",
    references: []
  },

  // ── Memory Management ──
  "c-lang.memory-management.is-every-malloccallocrealloc-paired-with-a-free": {
    whatItMeans: "Every heap allocation (`malloc`, `calloc`, `realloc`) has a corresponding `free` on all code paths, including error paths.",
    whyItMatters: "Memory leaks cause programs to consume increasing memory over time, eventually causing OOM kills. In long-running services, even small leaks compound.",
    howToVerify: "- Trace each allocation to its corresponding free\n- Check error paths — is memory freed before returning on failure?\n- Run Valgrind or AddressSanitizer to verify\n- Check that ownership semantics are documented",
    exampleComment: "The `malloc` on line 42 doesn't have a corresponding `free` when `init_context()` fails on line 50. The allocated buffer leaks on the error path.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char *buf = malloc(1024);\nif (!buf) return -1;\nint rc = process(buf);\nif (rc < 0) return rc;  // Leak! buf not freed\nfree(buf);\nreturn 0;" },
      { label: "Good", language: "c", code: "char *buf = malloc(1024);\nif (!buf) return -1;\nint rc = process(buf);\nfree(buf);\nreturn rc;" }
    ],
    keyTakeaway: "Every malloc needs a free on every code path — use goto cleanup or wrapper functions to ensure it.",
    references: [
      { title: "Valgrind Memcheck", url: "https://valgrind.org/docs/manual/mc-manual.html" }
    ]
  },
  "c-lang.memory-management.are-double-free-bugs-prevented": {
    whatItMeans: "Memory is not freed more than once, which causes undefined behavior, heap corruption, and potential security vulnerabilities.",
    whyItMatters: "Double-free is a classic exploit vector. It corrupts the heap allocator's internal data structures, potentially allowing arbitrary code execution.",
    howToVerify: "- Check that pointers are set to NULL after free\n- Look for conditional frees where the same pointer might be freed twice\n- Run AddressSanitizer which detects double-free at runtime",
    exampleComment: "If `process()` fails and calls `cleanup()` which frees `ctx->buf`, then the `free(ctx->buf)` in the error handler is a double-free. Set it to NULL in `cleanup()`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "free(ptr);\n// ... more code ...\nfree(ptr);  // Double free! Undefined behavior" },
      { label: "Good", language: "c", code: "free(ptr);\nptr = NULL;\n// ... more code ...\nfree(ptr);  // Safe: free(NULL) is a no-op" }
    ],
    keyTakeaway: "Set pointers to NULL after free — it prevents double-free and makes dangling pointer bugs crash clearly.",
    references: []
  },
  "c-lang.memory-management.are-use-after-free-bugs-prevented-pointer-set-to-null-after-free": {
    whatItMeans: "Pointers are not dereferenced after the memory they point to has been freed. Setting freed pointers to NULL catches violations early.",
    whyItMatters: "Use-after-free is one of the most exploited vulnerability classes. The freed memory may be reallocated to another object, causing data corruption or code execution.",
    howToVerify: "- Check that pointers are set to NULL immediately after free\n- Look for returned pointers that reference freed memory\n- Verify no code path accesses a pointer after its target is freed\n- Run AddressSanitizer",
    exampleComment: "After `free(node)`, the next iteration of the loop dereferences `node->next`. You need to save `node->next` before freeing `node`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "struct node *cur = head;\nwhile (cur) {\n    free(cur);       // Freed!\n    cur = cur->next;  // Use-after-free!\n}" },
      { label: "Good", language: "c", code: "struct node *cur = head;\nwhile (cur) {\n    struct node *next = cur->next;  // Save before free\n    free(cur);\n    cur = next;\n}" }
    ],
    keyTakeaway: "Save what you need before freeing, set pointers to NULL after free, and run ASan.",
    references: [
      { title: "AddressSanitizer", url: "https://clang.llvm.org/docs/AddressSanitizer.html" }
    ]
  },
  "c-lang.memory-management.is-realloc-return-value-checked-may-return-null-on-failure": {
    whatItMeans: "The return value of `realloc` is stored in a temporary variable and checked for NULL before overwriting the original pointer.",
    whyItMatters: "If `realloc` fails, it returns NULL but does NOT free the original memory. Assigning the result directly to the original pointer loses the reference, causing a memory leak.",
    howToVerify: "- Check that realloc result is stored in a temporary pointer\n- Verify NULL check before overwriting the original\n- Look for the pattern `ptr = realloc(ptr, ...)` which leaks on failure",
    exampleComment: "The pattern `buf = realloc(buf, new_size)` leaks the original `buf` if realloc returns NULL. Store in a temp variable first.",
    codeExamples: [
      { label: "Bad", language: "c", code: "buf = realloc(buf, new_size);  // Leaks old buf on failure!\nif (!buf) return -1;" },
      { label: "Good", language: "c", code: "void *tmp = realloc(buf, new_size);\nif (!tmp) {\n    free(buf);  // Original still valid\n    return -1;\n}\nbuf = tmp;" }
    ],
    keyTakeaway: "Never assign realloc directly to the original pointer — use a temporary to preserve the original on failure.",
    references: []
  },
  "c-lang.memory-management.are-buffer-sizes-tracked-and-bounds-checked": {
    whatItMeans: "Buffer sizes are stored alongside the buffer pointer and checked before every access to prevent buffer overflows.",
    whyItMatters: "Buffer overflows are the most common C vulnerability class. They enable arbitrary code execution, data exfiltration, and denial of service.",
    howToVerify: "- Check that buffer sizes are passed alongside buffer pointers\n- Look for array accesses without bounds checking\n- Verify that calculated sizes don't overflow (size_t arithmetic)\n- Check that string operations use size-bounded variants",
    exampleComment: "The `read_data` function takes a `char *buf` but no size parameter. How does it know when to stop writing? Add a `size_t buf_size` parameter and check bounds.",
    codeExamples: [
      { label: "Bad", language: "c", code: "void read_data(char *buf) {\n    // No size — can't bounds check!\n    scanf(\"%s\", buf);\n}" },
      { label: "Good", language: "c", code: "int read_data(char *buf, size_t buf_size) {\n    if (buf_size == 0) return -1;\n    int n = snprintf(buf, buf_size, \"%s\", input);\n    return (n >= 0 && (size_t)n < buf_size) ? 0 : -1;\n}" }
    ],
    keyTakeaway: "Always pair buffers with their sizes and check bounds on every access.",
    references: []
  },
  "c-lang.memory-management.is-stack-allocation-used-for-small-fixed-size-buffers": {
    whatItMeans: "Small, fixed-size buffers are allocated on the stack instead of the heap, avoiding malloc/free overhead and leak potential.",
    whyItMatters: "Stack allocation is faster, automatically freed on function return, and impossible to leak. Reserve heap allocation for dynamic or large buffers.",
    howToVerify: "- Look for malloc of small fixed-size buffers that could be stack arrays\n- Check that stack buffers aren't too large (typically < 4KB to avoid stack overflow)\n- Verify stack buffers aren't returned from functions",
    exampleComment: "This `malloc(256)` for a temporary format buffer could be a stack array `char buf[256]` since the size is fixed and it's not returned from the function.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char *buf = malloc(256);\nsnprintf(buf, 256, \"error: %s\", msg);\nlog_message(buf);\nfree(buf);" },
      { label: "Good", language: "c", code: "char buf[256];\nsnprintf(buf, sizeof(buf), \"error: %s\", msg);\nlog_message(buf);\n// Automatically freed on return" }
    ],
    keyTakeaway: "Use stack allocation for small, fixed-size, function-local buffers — it's faster and leak-proof.",
    references: []
  },
  "c-lang.memory-management.are-vlas-variable-length-arrays-avoided": {
    whatItMeans: "Variable-length arrays (VLAs), where the size depends on a runtime value, are avoided in favor of malloc or fixed-size arrays.",
    whyItMatters: "VLAs allocate on the stack with no overflow protection. A large or negative size causes stack overflow or undefined behavior. They're optional in C11 and unsupported in C++.",
    howToVerify: "- Search for array declarations with non-constant size: `int arr[n]`\n- Check that the size expression can't be zero or extremely large\n- Verify compiler warnings for VLA usage (-Wvla)",
    exampleComment: "The VLA `char buf[len]` will overflow the stack if `len` is very large. Use `malloc` with a size check, or a fixed-size buffer with bounds checking.",
    codeExamples: [
      { label: "Bad", language: "c", code: "void process(size_t len) {\n    char buf[len];  // VLA: stack overflow if len is large!\n    read(fd, buf, len);\n}" },
      { label: "Good", language: "c", code: "void process(size_t len) {\n    char *buf = malloc(len);\n    if (!buf) return;\n    read(fd, buf, len);\n    free(buf);\n}" }
    ],
    keyTakeaway: "Avoid VLAs — they have no bounds protection and are a stack overflow waiting to happen.",
    references: []
  },
  "c-lang.memory-management.are-valgrindaddresssanitizer-findings-addressed": {
    whatItMeans: "Memory analysis tools (Valgrind, AddressSanitizer, MemorySanitizer) report no new issues for the changed code.",
    whyItMatters: "These tools detect memory bugs (leaks, use-after-free, buffer overflows) that are invisible during normal testing but cause crashes and vulnerabilities in production.",
    howToVerify: "- Run tests under Valgrind: `valgrind --leak-check=full ./test_binary`\n- Build with ASan: `gcc -fsanitize=address -g` and run tests\n- Check CI for sanitizer results\n- Address all errors — there are no false positives for memory errors",
    exampleComment: "Valgrind reports a 64-byte leak from `parse_config` at line 87. The allocated config struct isn't freed when parsing fails. Could you add cleanup on the error path?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Build without sanitizers, no runtime checks\ngcc -O2 main.c -o main" },
      { label: "Good", language: "c", code: "// Build with sanitizers for testing\ngcc -fsanitize=address,undefined -g main.c -o main\n// Valgrind for leak detection\nvalgrind --leak-check=full --error-exitcode=1 ./main" }
    ],
    keyTakeaway: "Run Valgrind and ASan on every PR — they catch bugs that no amount of code review can find.",
    references: [
      { title: "AddressSanitizer", url: "https://clang.llvm.org/docs/AddressSanitizer.html" },
      { title: "Valgrind", url: "https://valgrind.org/" }
    ]
  },
  "c-lang.memory-management.is-memory-zeroed-before-free-for-sensitive-data": {
    whatItMeans: "Sensitive data (keys, passwords, tokens) is explicitly zeroed with `memset_s` or `explicit_bzero` before the memory is freed.",
    whyItMatters: "After `free`, the memory contents persist until reused. Another allocation could expose the sensitive data. Compilers may optimize away regular `memset` before free.",
    howToVerify: "- Check that sensitive buffers are zeroed before free\n- Verify `memset_s` or `explicit_bzero` is used (not plain `memset` which may be optimized away)\n- Look for patterns where keys or passwords are freed without zeroing",
    exampleComment: "The encryption key buffer is freed without zeroing. Use `explicit_bzero(key, key_len)` before `free(key)` to prevent the key from lingering in freed memory.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char *key = decrypt_key(file);\nprocess(key);\nfree(key);  // Key data persists in freed memory!" },
      { label: "Good", language: "c", code: "char *key = decrypt_key(file);\nprocess(key);\nexplicit_bzero(key, key_len);  // Compiler can't optimize this away\nfree(key);" }
    ],
    keyTakeaway: "Zero sensitive data before freeing — use `explicit_bzero` to prevent compiler optimization.",
    references: []
  },
  "c-lang.memory-management.are-ownership-semantics-clear-who-allocates-who-frees": {
    whatItMeans: "For every allocated resource, it's clear from the API and documentation which component is responsible for freeing it.",
    whyItMatters: "Ambiguous ownership causes either memory leaks (nobody frees) or double-frees (everyone frees). Clear ownership is the foundation of correct memory management.",
    howToVerify: "- Check function documentation for ownership transfer semantics\n- Look for `_new`/`_create` paired with `_free`/`_destroy` functions\n- Verify the naming convention is consistent across the codebase\n- Check that callers and callees agree on who frees",
    exampleComment: "The `create_context()` function allocates but there's no `destroy_context()` function. The caller needs to know what to free and how. Could you add a corresponding destroy function?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Who frees the returned pointer? Unclear!\nchar *get_formatted_name(const char *first, const char *last);" },
      { label: "Good", language: "c", code: "/**\n * Creates a new context. Caller must free with ctx_destroy().\n */\nstruct ctx *ctx_create(const struct config *cfg);\n\n/**\n * Frees a context created by ctx_create().\n */\nvoid ctx_destroy(struct ctx *ctx);" }
    ],
    keyTakeaway: "Document ownership clearly — pair every `_create` with a `_destroy` and document who frees what.",
    references: []
  },

  // ── Pointers & Arrays ──
  "c-lang.pointers-arrays.are-pointer-parameters-checked-for-null-before-dereferencing": {
    whatItMeans: "Pointer parameters are validated as non-NULL before being dereferenced, especially in public API functions.",
    whyItMatters: "NULL pointer dereference causes a segfault (crash). In public APIs, defensive NULL checks prevent crashes from caller mistakes and provide clear error messages.",
    howToVerify: "- Check that public API functions validate pointer parameters\n- Look for function calls that may return NULL and aren't checked\n- Internal functions may skip checks if preconditions are documented",
    exampleComment: "The `process_buffer` function dereferences `buf` without a NULL check. Since this is a public API, could you add `if (!buf) return -EINVAL;`?",
    codeExamples: [
      { label: "Bad", language: "c", code: "int process(struct context *ctx) {\n    ctx->count++;  // Crash if ctx is NULL!\n    return ctx->status;\n}" },
      { label: "Good", language: "c", code: "int process(struct context *ctx) {\n    if (!ctx) return -EINVAL;\n    ctx->count++;\n    return ctx->status;\n}" }
    ],
    keyTakeaway: "Check pointers for NULL at API boundaries — crashes in libraries are unforgivable.",
    references: []
  },
  "c-lang.pointers-arrays.are-array-bounds-checked-before-access": {
    whatItMeans: "Array indices are validated against the array size before access to prevent out-of-bounds reads and writes.",
    whyItMatters: "Out-of-bounds access is undefined behavior that can corrupt memory, leak data, or enable code execution exploits.",
    howToVerify: "- Check that array indices are compared against array size before use\n- Look for off-by-one errors (using `<=` instead of `<`)\n- Verify that size_t arithmetic doesn't wrap around\n- Check loop bounds carefully",
    exampleComment: "The loop condition `i <= count` should be `i < count` — when `i == count`, `array[i]` is one past the end of the array.",
    codeExamples: [
      { label: "Bad", language: "c", code: "for (size_t i = 0; i <= count; i++) {  // Off-by-one!\n    process(array[i]);\n}" },
      { label: "Good", language: "c", code: "for (size_t i = 0; i < count; i++) {\n    process(array[i]);\n}" }
    ],
    keyTakeaway: "Always check array bounds — off-by-one errors are the most common C bug.",
    references: []
  },
  "c-lang.pointers-arrays.is-pointer-arithmetic-correct-and-within-bounds": {
    whatItMeans: "Pointer arithmetic stays within the bounds of the allocated object, and the type size is accounted for correctly.",
    whyItMatters: "Pointer arithmetic that goes out of bounds is undefined behavior. Unlike array indexing, pointer arithmetic errors are subtle and hard to spot in review.",
    howToVerify: "- Check that pointer increments stay within the allocated buffer\n- Verify the type size is correct (pointer arithmetic auto-scales by type)\n- Look for casts that change the pointer type and invalidate arithmetic\n- Check for subtraction of pointers from different arrays",
    exampleComment: "The `ptr += sizeof(int)` advances by `sizeof(int) * sizeof(int)` bytes because pointer arithmetic already scales by type. Just use `ptr++` for an `int*`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int *ptr = array;\nptr += sizeof(int);  // Advances by sizeof(int)*sizeof(int) bytes!" },
      { label: "Good", language: "c", code: "int *ptr = array;\nptr++;  // Advances by sizeof(int) bytes automatically" }
    ],
    keyTakeaway: "Remember that pointer arithmetic scales by the pointed-to type — don't multiply by sizeof.",
    references: []
  },
  "c-lang.pointers-arrays.are-const-pointers-used-for-read-only-parameters": {
    whatItMeans: "Function parameters that don't modify the pointed-to data use `const` qualifiers to communicate intent and enable compiler optimization.",
    whyItMatters: "`const` documents the contract (this function won't modify your data), catches accidental mutations at compile time, and allows the compiler to optimize.",
    howToVerify: "- Check that pointer parameters used only for reading are `const`\n- Look for `char *` parameters that should be `const char *`\n- Verify `const` correctness is maintained through call chains",
    exampleComment: "The `print_buffer` function doesn't modify `buf`. Could you change the parameter to `const char *buf` to document that?",
    codeExamples: [
      { label: "Bad", language: "c", code: "void print_buffer(char *buf, size_t len) {\n    for (size_t i = 0; i < len; i++)\n        putchar(buf[i]);\n}" },
      { label: "Good", language: "c", code: "void print_buffer(const char *buf, size_t len) {\n    for (size_t i = 0; i < len; i++)\n        putchar(buf[i]);\n}" }
    ],
    keyTakeaway: "Use `const` for read-only pointer parameters — it documents intent and catches bugs.",
    references: []
  },
  "c-lang.pointers-arrays.are-function-pointers-validated-before-calling": {
    whatItMeans: "Function pointers are checked for NULL before being called, especially when loaded from structs, callbacks, or vtables.",
    whyItMatters: "Calling a NULL function pointer is undefined behavior that typically crashes. In callback-based APIs, not all callbacks are always set.",
    howToVerify: "- Check that function pointers from structs are NULL-checked before calling\n- Look for callback registration where some callbacks are optional\n- Verify vtable entries are populated before use",
    exampleComment: "The `on_error` callback is optional but called without a NULL check. Add `if (ctx->on_error) ctx->on_error(err);`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "ctx->on_complete(result);  // Crash if not set!" },
      { label: "Good", language: "c", code: "if (ctx->on_complete) {\n    ctx->on_complete(result);\n}" }
    ],
    keyTakeaway: "Always NULL-check function pointers before calling — especially optional callbacks.",
    references: []
  },
  "c-lang.pointers-arrays.is-sizeofptr-used-instead-of-sizeoftype-for-allocation": {
    whatItMeans: "Allocations use `sizeof(*ptr)` instead of `sizeof(Type)` to automatically match the pointer's type and prevent size mismatches.",
    whyItMatters: "If the type changes but the sizeof isn't updated, the allocation is wrong. Using `sizeof(*ptr)` always matches the actual type.",
    howToVerify: "- Look for `malloc(sizeof(struct foo))` patterns — prefer `malloc(sizeof(*ptr))`\n- Check that the sizeof type matches the pointer's actual type\n- Verify array allocations multiply correctly: `calloc(n, sizeof(*arr))`",
    exampleComment: "Using `malloc(sizeof(struct old_ctx))` but the pointer is `struct new_ctx *`. Use `malloc(sizeof(*ctx))` to auto-match the type.",
    codeExamples: [
      { label: "Bad", language: "c", code: "struct context *ctx = malloc(sizeof(struct context));\n// If type changes, sizeof may not be updated" },
      { label: "Good", language: "c", code: "struct context *ctx = malloc(sizeof(*ctx));\n// Always matches the pointer's actual type" }
    ],
    keyTakeaway: "Use `sizeof(*ptr)` in allocations — it auto-matches the type and prevents size mismatches.",
    references: []
  },
  "c-lang.pointers-arrays.are-void-pointers-cast-correctly-with-proper-alignment": {
    whatItMeans: "Casts from `void *` to typed pointers respect alignment requirements and don't violate strict aliasing rules.",
    whyItMatters: "Misaligned access causes crashes on some architectures (ARM, SPARC) and undefined behavior per the C standard. Strict aliasing violations cause optimization bugs.",
    howToVerify: "- Check that void pointer casts go to the correct type\n- Verify alignment when casting from byte buffers to structs\n- Look for type punning through pointer casts (use memcpy instead)\n- Check that _Alignas or aligned_alloc is used where needed",
    exampleComment: "Casting `char buf[]` to `uint32_t *` may cause misaligned access. Use `memcpy` to safely read the uint32_t value from the buffer.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char buf[8];\nread(fd, buf, 8);\nuint32_t val = *(uint32_t *)buf;  // Misaligned access!" },
      { label: "Good", language: "c", code: "char buf[8];\nread(fd, buf, 8);\nuint32_t val;\nmemcpy(&val, buf, sizeof(val));  // Safe: no alignment issue" }
    ],
    keyTakeaway: "Use `memcpy` instead of pointer casts for type punning — it's safe, portable, and optimizers handle it well.",
    references: []
  },

  // ── String Handling ──
  "c-lang.string-handling.are-strncpy-snprintf-used-instead-of-strcpy-sprintf": {
    whatItMeans: "Size-bounded string functions (`strncpy`, `snprintf`) are used instead of unbounded ones (`strcpy`, `sprintf`) to prevent buffer overflows.",
    whyItMatters: "Unbounded string functions are the #1 cause of buffer overflow vulnerabilities in C. A single `strcpy` with untrusted input can enable code execution.",
    howToVerify: "- Search for `strcpy`, `sprintf`, `strcat` — replace with bounded variants\n- Verify the size parameter is correct (includes space for null terminator)\n- Check that `strncpy` results are null-terminated (it doesn't guarantee it!)",
    exampleComment: "The `strcpy(dest, src)` on line 34 copies without checking the destination size. Use `snprintf(dest, sizeof(dest), \"%s\", src)` for safety.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char buf[64];\nstrcpy(buf, user_input);  // Buffer overflow if input > 63 chars!\nsprintf(buf, \"Hello, %s!\", name);  // Same problem" },
      { label: "Good", language: "c", code: "char buf[64];\nsnprintf(buf, sizeof(buf), \"%s\", user_input);\nsnprintf(buf, sizeof(buf), \"Hello, %s!\", name);" }
    ],
    keyTakeaway: "Never use `strcpy` or `sprintf` — always use their bounded counterparts.",
    references: []
  },
  "c-lang.string-handling.are-strings-properly-null-terminated": {
    whatItMeans: "Strings are always properly null-terminated after operations, especially after `strncpy`, `read()`, and manual buffer construction.",
    whyItMatters: "Missing null terminators cause string functions to read past the buffer, potentially leaking sensitive data or crashing.",
    howToVerify: "- Check `strncpy` calls — it doesn't null-terminate if source >= dest size\n- Check `read()` results — raw reads don't add null terminators\n- Verify manual buffer construction always writes a trailing '\\0'",
    exampleComment: "The `strncpy` doesn't null-terminate if `src` is longer than `n`. Add `buf[sizeof(buf) - 1] = '\\0';` after the strncpy to be safe.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char buf[32];\nstrncpy(buf, long_string, sizeof(buf));\nputs(buf);  // Not null-terminated if long_string >= 32 chars!" },
      { label: "Good", language: "c", code: "char buf[32];\nstrncpy(buf, long_string, sizeof(buf) - 1);\nbuf[sizeof(buf) - 1] = '\\0';\nputs(buf);" }
    ],
    keyTakeaway: "Always ensure null termination — `strncpy` and `read()` don't do it for you.",
    references: []
  },
  "c-lang.string-handling.are-buffer-sizes-sufficient-for-string-operations-including-null-terminator": {
    whatItMeans: "Buffer sizes account for the null terminator when calculating space needed for strings.",
    whyItMatters: "Forgetting the null terminator is an off-by-one error that causes buffer overflow, the most exploited bug class in C.",
    howToVerify: "- Check that `strlen(s) + 1` is used for allocation (not `strlen(s)`)\n- Verify buffer sizes include space for '\\0' in all calculations\n- Look for `sizeof(str) - 1` patterns that might be wrong",
    exampleComment: "The buffer is allocated with `malloc(strlen(s))` but needs `malloc(strlen(s) + 1)` to hold the null terminator.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char *copy = malloc(strlen(original));  // Off by one!\nstrcpy(copy, original);  // Writes past allocation" },
      { label: "Good", language: "c", code: "size_t len = strlen(original) + 1;  // +1 for null terminator\nchar *copy = malloc(len);\nif (copy) memcpy(copy, original, len);" }
    ],
    keyTakeaway: "Always add 1 for the null terminator — `strlen` does not include it.",
    references: []
  },
  "c-lang.string-handling.is-strlcpystrlcat-used-where-available": {
    whatItMeans: "The `strlcpy`/`strlcat` functions (BSD-origin) are used where available, as they're safer than `strncpy`/`strncat` — they always null-terminate and return the total length needed.",
    whyItMatters: "`strncpy` doesn't null-terminate on truncation. `strncat` requires knowing remaining buffer space. `strlcpy`/`strlcat` have a simpler, safer interface.",
    howToVerify: "- Check if the platform provides strlcpy/strlcat (BSD, macOS, Linux with libbsd)\n- Look for strncpy followed by manual null-termination — strlcpy is cleaner\n- If unavailable, verify equivalent behavior is achieved",
    exampleComment: "Since we're on macOS/BSD, consider using `strlcpy(dst, src, sizeof(dst))` instead of the `strncpy` + manual null-termination pattern.",
    codeExamples: [
      { label: "Bad", language: "c", code: "strncpy(dst, src, sizeof(dst));\ndst[sizeof(dst) - 1] = '\\0';  // Must manually terminate" },
      { label: "Good", language: "c", code: "strlcpy(dst, src, sizeof(dst));  // Always null-terminates\nif (strlcpy(dst, src, sizeof(dst)) >= sizeof(dst)) {\n    // Handle truncation\n}" }
    ],
    keyTakeaway: "Use strlcpy/strlcat where available — they're safer than strncpy/strncat.",
    references: []
  },
  "c-lang.string-handling.are-format-string-vulnerabilities-prevented-no-user-input-as-format-string": {
    whatItMeans: "User-provided strings are never passed as the format string parameter to `printf`, `sprintf`, `fprintf`, or similar functions.",
    whyItMatters: "Format string vulnerabilities allow attackers to read/write arbitrary memory using `%n`, `%x`, and `%s` specifiers. They can cause crashes and code execution.",
    howToVerify: "- Check that printf-family functions always use a string literal as the format\n- Look for `printf(user_input)` — should be `printf(\"%s\", user_input)`\n- Enable `-Wformat-security` compiler warning",
    exampleComment: "The `printf(msg)` call is a format string vulnerability if `msg` contains `%s` or `%n`. Change to `printf(\"%s\", msg)`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "printf(user_message);  // Format string vulnerability!\nfprintf(stderr, error_msg);  // Same problem" },
      { label: "Good", language: "c", code: "printf(\"%s\", user_message);  // Safe: user input is data, not format\nfprintf(stderr, \"%s\", error_msg);" }
    ],
    keyTakeaway: "Never pass user input as a format string — always use a literal format with `%s`.",
    references: []
  },
  "c-lang.string-handling.are-string-comparison-functions-used-correctly-strcmp-vs-strncmp": {
    whatItMeans: "String comparisons use the appropriate function: `strcmp` for complete comparison, `strncmp` for prefix matching or untrusted input with bounded length.",
    whyItMatters: "Using `==` on strings compares pointers, not contents. Using `strcmp` on untrusted input without length limits can be exploited. Timing side-channels exist in `strcmp`.",
    howToVerify: "- Check for `==` used on char pointers — should be `strcmp`\n- Verify `strncmp` is used when input length isn't guaranteed\n- For security-sensitive comparisons (passwords, tokens), use constant-time comparison",
    exampleComment: "The `if (cmd == \"quit\")` compares pointers, not string contents. Use `strcmp(cmd, \"quit\") == 0`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "if (input == \"hello\")  // Pointer comparison, not content!\nif (strcmp(untrusted_input, expected))  // Missing length bound" },
      { label: "Good", language: "c", code: "if (strcmp(input, \"hello\") == 0)  // Content comparison\nif (strncmp(untrusted_input, expected, MAX_LEN) == 0)  // Bounded" }
    ],
    keyTakeaway: "Use strcmp for string comparison (not ==), strncmp for bounded comparisons, and constant-time for secrets.",
    references: []
  },

  // ── Error Handling ──
  "c-lang.error-handling.are-return-values-checked-for-all-system-and-library-calls": {
    whatItMeans: "Return values from system calls (`read`, `write`, `open`, `malloc`, etc.) and library functions are checked for errors, not silently ignored.",
    whyItMatters: "Unchecked errors cause silent failures, data corruption, and security vulnerabilities. A failed `malloc` that isn't checked leads to NULL dereference.",
    howToVerify: "- Check that every `malloc`/`calloc`/`realloc` return is NULL-checked\n- Verify `read`/`write` return values are checked for errors and partial operations\n- Look for `open`, `fopen`, `close` without error checking",
    exampleComment: "The `write()` return value is ignored. It may write fewer bytes than requested (partial write), or fail entirely. Check the return value and handle short writes.",
    codeExamples: [
      { label: "Bad", language: "c", code: "write(fd, buf, len);  // Ignoring return value!\nFILE *f = fopen(path, \"r\");\nfscanf(f, \"%d\", &val);  // f could be NULL!" },
      { label: "Good", language: "c", code: "ssize_t n = write(fd, buf, len);\nif (n < 0) {\n    perror(\"write\");\n    return -1;\n}\nif ((size_t)n < len) {\n    // Handle partial write\n}" }
    ],
    keyTakeaway: "Check every return value — in C, errors are communicated through return values, not exceptions.",
    references: []
  },
  "c-lang.error-handling.is-errno-checked-and-handled-appropriately": {
    whatItMeans: "When system calls indicate failure, `errno` is checked immediately and handled before any other calls that might overwrite it.",
    whyItMatters: "`errno` is a global that gets overwritten by the next system call. Reading it too late gives you the wrong error. Some functions don't set errno on success.",
    howToVerify: "- Check that errno is read immediately after the failing call\n- Verify errno is not read after successful calls (it may have stale values)\n- Look for `perror()` or `strerror(errno)` usage for error messages",
    exampleComment: "The `errno` check happens after `log_error()` which itself calls `write()` and may overwrite errno. Save errno immediately: `int saved_errno = errno;`",
    codeExamples: [
      { label: "Bad", language: "c", code: "if (read(fd, buf, len) < 0) {\n    log_error(\"read failed\");  // May call write(), overwriting errno\n    if (errno == EINTR) retry();  // Wrong errno!\n}" },
      { label: "Good", language: "c", code: "if (read(fd, buf, len) < 0) {\n    int saved_errno = errno;  // Save immediately\n    log_error(\"read failed: %s\", strerror(saved_errno));\n    if (saved_errno == EINTR) retry();\n}" }
    ],
    keyTakeaway: "Save errno immediately after a failed call — it gets overwritten by the next system call.",
    references: []
  },
  "c-lang.error-handling.are-error-paths-cleaning-up-allocated-resources-goto-cleanup-pattern": {
    whatItMeans: "Error paths properly release all allocated resources using a structured cleanup pattern, typically `goto cleanup` in C.",
    whyItMatters: "Without structured cleanup, error paths leak memory, file descriptors, and locks. The `goto cleanup` pattern centralizes cleanup and prevents leaks.",
    howToVerify: "- Check that error paths free all allocated resources\n- Look for the `goto cleanup` pattern with resources freed in reverse allocation order\n- Verify that partially-initialized state is handled (check for NULL before free)",
    exampleComment: "The error return on line 45 leaks `ctx` (allocated on line 30) and `buf` (line 35). Consider using `goto cleanup` to centralize resource cleanup.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int init(void) {\n    char *buf = malloc(1024);\n    int fd = open(\"file\", O_RDONLY);\n    if (fd < 0) return -1;  // Leaks buf!\n    struct ctx *c = malloc(sizeof(*c));\n    if (!c) { close(fd); return -1; }  // Leaks buf!\n    return 0;\n}" },
      { label: "Good", language: "c", code: "int init(void) {\n    char *buf = NULL;\n    int fd = -1;\n    struct ctx *c = NULL;\n    int rc = -1;\n\n    buf = malloc(1024);\n    if (!buf) goto cleanup;\n    fd = open(\"file\", O_RDONLY);\n    if (fd < 0) goto cleanup;\n    c = malloc(sizeof(*c));\n    if (!c) goto cleanup;\n    rc = 0;\n\ncleanup:\n    if (rc != 0) {\n        free(c);\n        if (fd >= 0) close(fd);\n        free(buf);\n    }\n    return rc;\n}" }
    ],
    keyTakeaway: "Use `goto cleanup` for centralized resource cleanup on error paths — it's the C idiom for RAII.",
    references: []
  },
  "c-lang.error-handling.are-error-messages-descriptive-with-relevant-context": {
    whatItMeans: "Error messages include context (what operation failed, what parameters were used, what the error was) rather than generic messages.",
    whyItMatters: "Generic error messages like 'operation failed' are useless for debugging. Contextual messages enable quick diagnosis without reproducing the issue.",
    howToVerify: "- Check that error messages include the operation name, relevant values, and the system error\n- Look for bare `perror(\"\")` or `fprintf(stderr, \"error\\n\")`\n- Verify error messages don't leak sensitive data",
    exampleComment: "The error message 'open failed' doesn't say which file or why. Use `fprintf(stderr, \"failed to open '%s': %s\\n\", path, strerror(errno))`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "if (fd < 0) {\n    fprintf(stderr, \"error\\n\");\n    return -1;\n}" },
      { label: "Good", language: "c", code: "if (fd < 0) {\n    fprintf(stderr, \"failed to open config '%s': %s\\n\",\n            path, strerror(errno));\n    return -1;\n}" }
    ],
    keyTakeaway: "Include what, where, and why in error messages — 'failed to open config.txt: Permission denied' beats 'error'.",
    references: []
  },
  "c-lang.error-handling.are-error-codes-defined-and-documented": {
    whatItMeans: "Error codes returned by functions are defined as named constants (enums or defines) and documented, rather than using magic numbers.",
    whyItMatters: "Magic number error codes like `-1`, `-2`, `-3` are meaningless to callers. Named error codes are self-documenting and enable precise error handling.",
    howToVerify: "- Check that error codes use named constants, not bare integers\n- Verify error codes are documented in the header file\n- Look for functions returning different negative values without explanation",
    exampleComment: "The function returns -1, -2, or -3 for different error conditions. Could you define an enum with `ERR_NOMEM`, `ERR_IO`, `ERR_INVALID` and document them?",
    codeExamples: [
      { label: "Bad", language: "c", code: "int parse(const char *s) {\n    if (!s) return -1;\n    if (strlen(s) > MAX) return -2;\n    if (!valid(s)) return -3;\n    return 0;\n}" },
      { label: "Good", language: "c", code: "enum parse_error {\n    PARSE_OK = 0,\n    PARSE_ERR_NULL = -1,\n    PARSE_ERR_TOO_LONG = -2,\n    PARSE_ERR_INVALID = -3,\n};\n\nenum parse_error parse(const char *s);" }
    ],
    keyTakeaway: "Define named error codes — they're self-documenting and make error handling precise.",
    references: []
  },
  "c-lang.error-handling.is-the-cleanup-pattern-consistent-goto-nested-ifs-or-wrapper-functions": {
    whatItMeans: "The codebase uses a consistent cleanup pattern throughout — either `goto cleanup`, nested ifs, or cleanup wrapper functions — rather than mixing approaches.",
    whyItMatters: "Inconsistent cleanup patterns make code harder to review and more prone to missed cleanups. Consistency lets reviewers spot deviations quickly.",
    howToVerify: "- Check that the new code follows the project's existing cleanup pattern\n- Look for mixed patterns within the same file or module\n- Verify the chosen pattern handles all allocated resources",
    exampleComment: "The rest of this module uses `goto cleanup` but this function uses nested ifs. Could you refactor to match the module's pattern for consistency?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Mixing patterns in the same file\nint func_a() { goto cleanup; ... }  // Pattern 1\nint func_b() { if (x) { if (y) { ... } } }  // Pattern 2" },
      { label: "Good", language: "c", code: "// Consistent goto cleanup pattern throughout\nint func_a() {\n    int rc = -1;\n    // ... allocations ...\n    rc = 0;\ncleanup:\n    // ... frees ...\n    return rc;\n}\n\nint func_b() {\n    int rc = -1;\n    // ... same pattern ...\n    rc = 0;\ncleanup:\n    return rc;\n}" }
    ],
    keyTakeaway: "Pick one cleanup pattern and use it consistently throughout the module.",
    references: []
  },

  // ── Types & Integers ──
  "c-lang.types-integers.are-integer-overflowunderflow-possibilities-considered": {
    whatItMeans: "Arithmetic operations are checked for potential integer overflow or underflow before they happen, especially with user-provided values.",
    whyItMatters: "Signed integer overflow is undefined behavior in C. Unsigned overflow wraps around silently. Both can cause buffer overflows, incorrect allocations, and logic bugs.",
    howToVerify: "- Check multiplication before allocation: `if (n > SIZE_MAX / elem_size) return -1;`\n- Look for additions that could overflow: `a + b < a` (for unsigned)\n- Verify subtraction doesn't underflow for unsigned types\n- Check that signed arithmetic doesn't overflow",
    exampleComment: "The `n * sizeof(struct item)` multiplication could overflow if `n` is very large, causing a too-small allocation. Check `n > SIZE_MAX / sizeof(struct item)` first.",
    codeExamples: [
      { label: "Bad", language: "c", code: "// n could be huge, causing n * sizeof(*arr) to overflow\nstruct item *arr = malloc(n * sizeof(*arr));" },
      { label: "Good", language: "c", code: "if (n > SIZE_MAX / sizeof(struct item)) return NULL;\nstruct item *arr = malloc(n * sizeof(*arr));\n// Or use calloc which checks internally:\nstruct item *arr = calloc(n, sizeof(*arr));" }
    ],
    keyTakeaway: "Check for integer overflow before multiplication in allocations — use `calloc` which checks internally.",
    references: []
  },
  "c-lang.types-integers.are-signedunsigned-conversions-explicit-and-correct": {
    whatItMeans: "Conversions between signed and unsigned integer types are explicit, intentional, and don't cause unexpected behavior from sign bit reinterpretation.",
    whyItMatters: "Implicit signed-to-unsigned conversion turns negative values into large positive values. This causes incorrect comparisons, buffer overflows, and logic errors.",
    howToVerify: "- Look for signed/unsigned comparison warnings (-Wsign-compare)\n- Check for negative values being assigned to unsigned types\n- Verify comparisons between signed and unsigned don't have unexpected behavior\n- Check that `ssize_t` return values are handled correctly with `size_t` variables",
    exampleComment: "Comparing `int len` with `size_t buf_size` has implicit conversion — if `len` is -1, it becomes a huge positive value and the comparison succeeds incorrectly.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int len = get_length();  // Returns -1 on error\nif (len < buf_size) {  // -1 becomes huge positive!\n    memcpy(buf, src, len);\n}" },
      { label: "Good", language: "c", code: "int len = get_length();\nif (len < 0) return -1;  // Check sign first\nif ((size_t)len < buf_size) {\n    memcpy(buf, src, (size_t)len);\n}" }
    ],
    keyTakeaway: "Always check for negative values before converting signed to unsigned — -1 becomes SIZE_MAX.",
    references: []
  },
  "c-lang.types-integers.are-sizet-and-ssizet-used-for-sizes-and-counts": {
    whatItMeans: "The `size_t` type is used for sizes and counts, and `ssize_t` for functions that may return -1 on error (like `read`).",
    whyItMatters: "`int` can be too small for sizes on 64-bit platforms (only 2GB). `size_t` is guaranteed to hold any object size. Using the wrong type causes truncation bugs.",
    howToVerify: "- Check that buffer sizes, array indices, and counts use `size_t`\n- Verify `ssize_t` is used for `read`/`write` return values\n- Look for `int` used as array indices or sizes",
    exampleComment: "Using `int` for the buffer size limits it to 2GB on 64-bit platforms. Change to `size_t` for correctness.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int size = get_file_size(path);  // Truncates on large files\nchar *buf = malloc(size);" },
      { label: "Good", language: "c", code: "size_t size = get_file_size(path);\nchar *buf = malloc(size);\n\nssize_t n = read(fd, buf, size);\nif (n < 0) { /* error */ }" }
    ],
    keyTakeaway: "Use `size_t` for sizes, `ssize_t` for signed size returns — `int` is too small for large data.",
    references: []
  },
  "c-lang.types-integers.are-fixed-width-types-int32t-uint64t-used-where-portability-matters": {
    whatItMeans: "Fixed-width integer types from `<stdint.h>` are used when the exact bit width matters (network protocols, file formats, hardware registers).",
    whyItMatters: "`int` and `long` have platform-dependent sizes. Wire protocols and file formats need exact widths. Fixed-width types prevent portability bugs.",
    howToVerify: "- Check that protocol/format fields use `uint32_t`, `int64_t`, etc.\n- Look for `int`/`long` in struct definitions sent over the wire\n- Verify `#include <stdint.h>` is present",
    exampleComment: "The `long timestamp` field varies between 32 and 64 bits across platforms. For the network protocol, use `int64_t` to ensure consistent width.",
    codeExamples: [
      { label: "Bad", language: "c", code: "struct packet {\n    int type;      // 16 or 32 bits depending on platform\n    long payload;  // 32 or 64 bits depending on platform\n};" },
      { label: "Good", language: "c", code: "#include <stdint.h>\nstruct packet {\n    uint16_t type;\n    int64_t payload;\n} __attribute__((packed));" }
    ],
    keyTakeaway: "Use fixed-width types for data that crosses boundaries (network, disk, IPC).",
    references: []
  },
  "c-lang.types-integers.are-bit-operations-using-unsigned-types": {
    whatItMeans: "Bitwise operations (`&`, `|`, `^`, `<<`, `>>`) are performed on unsigned types to avoid implementation-defined behavior with signed values.",
    whyItMatters: "Right-shifting a negative signed integer is implementation-defined (may arithmetic or logical shift). Left-shifting into the sign bit is undefined behavior in C.",
    howToVerify: "- Check that bitwise operations use `unsigned` or `uint*_t` types\n- Look for left-shift on signed types that could overflow into the sign bit\n- Verify right-shift behavior is as expected for the type",
    exampleComment: "Left-shifting a signed `int` value by 24 could shift into the sign bit, which is undefined behavior. Use `(uint32_t)value << 24` instead.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int flags = value << 24;  // UB if shifts into sign bit\nint mask = byte >> 4;     // Implementation-defined if byte is negative" },
      { label: "Good", language: "c", code: "uint32_t flags = (uint32_t)value << 24;\nuint8_t mask = (uint8_t)byte >> 4;" }
    ],
    keyTakeaway: "Always use unsigned types for bitwise operations — signed bit manipulation is undefined behavior.",
    references: []
  },
  "c-lang.types-integers.are-enum-values-explicitly-numbered-where-stability-matters": {
    whatItMeans: "Enum values that are serialized, stored, or used in protocols have explicit integer values to prevent breakage when new values are added.",
    whyItMatters: "Without explicit values, adding a new enum member shifts subsequent values, breaking compatibility with stored data, wire protocols, and external systems.",
    howToVerify: "- Check that enums used in serialization/protocols have explicit values\n- Look for enums used in switch statements — adding values silently changes behavior\n- Verify a sentinel/max value is present for bounds checking",
    exampleComment: "Adding `MSG_HEARTBEAT` before `MSG_DATA` shifts MSG_DATA from 2 to 3, breaking the protocol. Could you add explicit values to the enum?",
    codeExamples: [
      { label: "Bad", language: "c", code: "enum msg_type {\n    MSG_INIT,    // 0\n    MSG_DATA,    // 1 — changes if new values added above!\n    MSG_CLOSE,   // 2\n};" },
      { label: "Good", language: "c", code: "enum msg_type {\n    MSG_INIT  = 0,\n    MSG_DATA  = 1,\n    MSG_CLOSE = 2,\n    MSG_TYPE_MAX  // Sentinel for bounds checking\n};" }
    ],
    keyTakeaway: "Explicitly number enums used in protocols or storage — implicit numbering breaks on insertion.",
    references: []
  },
  "c-lang.types-integers.is-bool-from-stdboolh-used-instead-of-int-for-boolean-values": {
    whatItMeans: "Boolean values use `bool` from `<stdbool.h>` instead of `int` with 0/1, making intent clear.",
    whyItMatters: "`bool` communicates intent (this is true/false), enables compiler warnings for misuse, and makes APIs self-documenting.",
    howToVerify: "- Check that boolean parameters and return values use `bool`\n- Look for `int` used as boolean with 0/1 values\n- Verify `#include <stdbool.h>` is present",
    exampleComment: "The `int verbose` parameter is used as a boolean. Using `bool verbose` from `<stdbool.h>` makes the intent clearer.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int is_valid(const char *s);  // Returns 0 or 1\nvoid set_flag(int enable);    // Is 2 valid?" },
      { label: "Good", language: "c", code: "#include <stdbool.h>\nbool is_valid(const char *s);\nvoid set_flag(bool enable);" }
    ],
    keyTakeaway: "Use `bool` for boolean values — it documents intent better than `int`.",
    references: []
  },

  // ── Concurrency & Threading ──
  "c-lang.concurrency-threading.are-shared-data-structures-protected-with-mutexes-or-atomics": {
    whatItMeans: "Data shared between threads is protected by mutexes, read-write locks, or atomic operations to prevent data races.",
    whyItMatters: "Data races are undefined behavior in C. They cause corrupted data, crashes, and security vulnerabilities that are extremely hard to reproduce and debug.",
    howToVerify: "- Identify all data shared between threads\n- Check that each shared variable is protected by a mutex or is atomic\n- Verify the lock is held for the entire critical section, not just part\n- Run ThreadSanitizer (TSan) to detect races",
    exampleComment: "The `total_count` variable is incremented by multiple threads without synchronization. Use `atomic_fetch_add` or protect with a mutex.",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Shared global, no synchronization\nint count = 0;\nvoid *worker(void *arg) {\n    count++;  // Data race!\n    return NULL;\n}" },
      { label: "Good", language: "c", code: "#include <stdatomic.h>\natomic_int count = 0;\nvoid *worker(void *arg) {\n    atomic_fetch_add(&count, 1);  // Thread-safe\n    return NULL;\n}" }
    ],
    keyTakeaway: "Protect all shared data with mutexes or atomics — data races are undefined behavior.",
    references: [
      { title: "ThreadSanitizer", url: "https://clang.llvm.org/docs/ThreadSanitizer.html" }
    ]
  },
  "c-lang.concurrency-threading.is-lock-ordering-consistent-to-prevent-deadlocks": {
    whatItMeans: "When multiple locks are needed, they are always acquired in the same order across all code paths to prevent deadlocks.",
    whyItMatters: "If thread A locks mutex 1 then 2, and thread B locks mutex 2 then 1, both can block forever waiting for the other's lock. This is a classic deadlock.",
    howToVerify: "- Check that all code paths acquire multiple locks in the same order\n- Look for lock inversions across different functions\n- Verify lock ordering is documented\n- Consider using `pthread_mutex_trylock` to detect potential deadlocks",
    exampleComment: "Function `transfer()` locks `account_a` then `account_b`, but `reconcile()` locks them in the opposite order. This can deadlock. Could you establish a consistent lock order (e.g., by account ID)?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Thread 1: locks A then B\npthread_mutex_lock(&a->lock);\npthread_mutex_lock(&b->lock);\n\n// Thread 2: locks B then A — DEADLOCK!\npthread_mutex_lock(&b->lock);\npthread_mutex_lock(&a->lock);" },
      { label: "Good", language: "c", code: "// Always lock in order of address (or ID)\nvoid lock_pair(struct account *a, struct account *b) {\n    if (a < b) {\n        pthread_mutex_lock(&a->lock);\n        pthread_mutex_lock(&b->lock);\n    } else {\n        pthread_mutex_lock(&b->lock);\n        pthread_mutex_lock(&a->lock);\n    }\n}" }
    ],
    keyTakeaway: "Define and document a global lock ordering — always acquire locks in the same order.",
    references: []
  },
  "c-lang.concurrency-threading.are-atomic-operations-used-for-simple-counters-and-flags": {
    whatItMeans: "Simple shared variables (counters, flags, status values) use C11 atomics instead of full mutexes, which are heavier than necessary.",
    whyItMatters: "Atomics are faster than mutexes for simple operations. A mutex for a single counter increment adds unnecessary contention and overhead.",
    howToVerify: "- Check that simple shared counters/flags use `<stdatomic.h>`\n- Verify the memory ordering is appropriate (relaxed, acquire/release, seq_cst)\n- Look for mutexes protecting single variable reads/writes that could be atomic",
    exampleComment: "The `is_running` flag only needs atomic load/store, not a full mutex. Use `atomic_bool` with `atomic_store` and `atomic_load`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "pthread_mutex_lock(&lock);\ncount++;\npthread_mutex_unlock(&lock);" },
      { label: "Good", language: "c", code: "#include <stdatomic.h>\natomic_int count = 0;\natomic_fetch_add_explicit(&count, 1, memory_order_relaxed);" }
    ],
    keyTakeaway: "Use atomics for simple shared variables — they're faster and simpler than mutexes.",
    references: []
  },
  "c-lang.concurrency-threading.are-thread-local-variables-used-where-appropriate": {
    whatItMeans: "Variables that need to be unique per thread use `_Thread_local` (C11) or `__thread` instead of global variables with mutex protection.",
    whyItMatters: "Thread-local storage eliminates synchronization overhead entirely for per-thread data like error codes, buffers, and counters.",
    howToVerify: "- Check for global variables that are only accessed within a single thread's context\n- Look for per-thread scratch buffers or caches using mutex protection\n- Verify thread-local initialization is handled correctly",
    exampleComment: "The per-thread error buffer is protected by a mutex, but since each thread has its own buffer, `_Thread_local` would eliminate the lock entirely.",
    codeExamples: [
      { label: "Bad", language: "c", code: "static char error_buf[256];  // Shared! Needs mutex\npthread_mutex_t err_lock;" },
      { label: "Good", language: "c", code: "static _Thread_local char error_buf[256];  // Per-thread, no lock needed" }
    ],
    keyTakeaway: "Use thread-local storage for per-thread data — it eliminates synchronization entirely.",
    references: []
  },
  "c-lang.concurrency-threading.are-condition-variables-used-correctly-spurious-wakeup-handling": {
    whatItMeans: "Condition variables are waited on in a loop that re-checks the condition, because spurious wakeups can occur without the condition being true.",
    whyItMatters: "The POSIX specification allows `pthread_cond_wait` to return spuriously (without `pthread_cond_signal`). Without a loop, the code proceeds with incorrect state.",
    howToVerify: "- Check that `pthread_cond_wait` is called inside a while loop, not an if statement\n- Verify the condition is re-checked after wakeup\n- Check that the mutex is held when calling wait and signal",
    exampleComment: "The `if (!ready)` should be `while (!ready)` — condition variables can wake up spuriously, and the condition must be re-checked.",
    codeExamples: [
      { label: "Bad", language: "c", code: "pthread_mutex_lock(&lock);\nif (!ready) {  // Bug: spurious wakeup continues without ready!\n    pthread_cond_wait(&cond, &lock);\n}\nprocess();  // May run when !ready" },
      { label: "Good", language: "c", code: "pthread_mutex_lock(&lock);\nwhile (!ready) {  // Re-check after spurious wakeup\n    pthread_cond_wait(&cond, &lock);\n}\nprocess();  // Guaranteed ready is true\npthread_mutex_unlock(&lock);" }
    ],
    keyTakeaway: "Always wait on condition variables in a while loop — spurious wakeups are allowed by the specification.",
    references: []
  },
  "c-lang.concurrency-threading.are-signals-handled-safely-only-async-signal-safe-functions-in-handlers": {
    whatItMeans: "Signal handlers only call async-signal-safe functions (like `write`, `_exit`) and don't call unsafe functions like `printf`, `malloc`, or `exit`.",
    whyItMatters: "Signals can interrupt any function, including malloc. Calling malloc from a signal handler that interrupted malloc causes deadlock or heap corruption.",
    howToVerify: "- Check that signal handlers only call async-signal-safe functions\n- Look for `printf`, `malloc`, `free`, `exit` in signal handlers\n- Verify the handler sets a flag (volatile sig_atomic_t) for the main loop to check",
    exampleComment: "The signal handler calls `printf` and `free`, which are not async-signal-safe. Set a `volatile sig_atomic_t` flag instead and handle cleanup in the main loop.",
    codeExamples: [
      { label: "Bad", language: "c", code: "void handler(int sig) {\n    printf(\"Caught signal %d\\n\", sig);  // Not async-signal-safe!\n    free(global_buf);  // Not async-signal-safe!\n    exit(1);  // Not async-signal-safe!\n}" },
      { label: "Good", language: "c", code: "volatile sig_atomic_t got_signal = 0;\n\nvoid handler(int sig) {\n    got_signal = 1;  // Only safe operation\n}\n\n// In main loop:\nif (got_signal) {\n    printf(\"Shutting down...\\n\");  // Safe here\n    cleanup();\n    exit(0);\n}" }
    ],
    keyTakeaway: "Signal handlers should only set a flag — do real work in the main thread where all functions are safe.",
    references: []
  },

  // ── API & Header Design ──
  "c-lang.api-header-design.are-header-guards-ifndefdefineendif-or-pragma-once-present": {
    whatItMeans: "Header files use include guards (`#ifndef`/`#define`/`#endif`) or `#pragma once` to prevent multiple inclusion errors.",
    whyItMatters: "Without include guards, headers included multiple times cause redefinition errors. Include guards are essential for any non-trivial C project.",
    howToVerify: "- Check that every `.h` file has include guards or `#pragma once`\n- Verify the guard macro is unique (typically `PROJECT_MODULE_H`)\n- Check for consistency (all guards or all pragma once, not mixed)",
    exampleComment: "This header file is missing include guards. Add `#ifndef PROJECT_PARSER_H` / `#define PROJECT_PARSER_H` ... `#endif` or `#pragma once`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "// parser.h — no include guard!\ntypedef struct parser { ... } parser_t;" },
      { label: "Good", language: "c", code: "#ifndef PROJECT_PARSER_H\n#define PROJECT_PARSER_H\n\ntypedef struct parser { ... } parser_t;\n\n#endif /* PROJECT_PARSER_H */" }
    ],
    keyTakeaway: "Every header needs include guards — use `#ifndef`/`#define` or `#pragma once`.",
    references: []
  },
  "c-lang.api-header-design.are-public-apis-minimal-and-well-documented": {
    whatItMeans: "The public API exposed in headers is minimal (only what consumers need) and documented with parameter descriptions, return values, and error conditions.",
    whyItMatters: "A large, undocumented API is hard to use correctly. Minimal APIs reduce the surface area for bugs and make backwards compatibility easier to maintain.",
    howToVerify: "- Check that only necessary functions/types are in the public header\n- Verify each public function has a documentation comment\n- Look for internal implementation details leaking into public headers",
    exampleComment: "The `internal_parse_step` function is in the public header but shouldn't be called by consumers. Could you move it to an internal header or make it `static`?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// parser.h — too much exposed\nvoid parser_init(parser_t *p);\nvoid parser_step(parser_t *p);  // Internal!\nvoid parser_reset_state(parser_t *p);  // Internal!\nint parser_parse(parser_t *p, const char *input);" },
      { label: "Good", language: "c", code: "// parser.h — minimal public API\n/**\n * Initialize a parser instance.\n * @param p Pointer to parser (must not be NULL)\n */\nvoid parser_init(parser_t *p);\n\n/**\n * Parse input string.\n * @return 0 on success, negative error code on failure\n */\nint parser_parse(parser_t *p, const char *input);" }
    ],
    keyTakeaway: "Expose the minimum API needed — document every public function with params, returns, and errors.",
    references: []
  },
  "c-lang.api-header-design.are-internal-functions-declared-static": {
    whatItMeans: "Functions only used within a single `.c` file are declared `static` to limit their scope and prevent name collisions.",
    whyItMatters: "`static` functions have file scope only — they can't collide with identically named functions in other files. The compiler can also optimize them better.",
    howToVerify: "- Check that helper functions not declared in headers are `static`\n- Look for non-static functions that are only used in one file\n- Verify the linker doesn't have unused symbol warnings",
    exampleComment: "The `format_timestamp` function is only used in `logger.c` but isn't `static`. Making it static prevents name collisions and enables better optimization.",
    codeExamples: [
      { label: "Bad", language: "c", code: "// In utils.c — not static, pollutes global namespace\nvoid format_timestamp(char *buf, size_t len) { ... }" },
      { label: "Good", language: "c", code: "// In utils.c — static, file scope only\nstatic void format_timestamp(char *buf, size_t len) { ... }" }
    ],
    keyTakeaway: "Make functions `static` unless they need to be called from other files.",
    references: []
  },
  "c-lang.api-header-design.are-extern-c-guards-used-for-c-compatibility": {
    whatItMeans: "Headers intended for use from C++ wrap declarations in `extern \"C\"` guards to prevent C++ name mangling.",
    whyItMatters: "C++ compilers mangle symbol names for overloading. Without `extern \"C\"`, C++ code can't link against C functions because the symbol names don't match.",
    howToVerify: "- Check that public C headers have `#ifdef __cplusplus extern \"C\" { #endif`\n- Verify the closing `#ifdef __cplusplus } #endif` is present\n- Check that internal headers (C-only) don't need the guard",
    exampleComment: "This public header is missing `extern \"C\"` guards. C++ consumers won't be able to link against these functions without them.",
    codeExamples: [
      { label: "Bad", language: "c", code: "#ifndef MY_LIB_H\n#define MY_LIB_H\nint my_function(int x);\n#endif" },
      { label: "Good", language: "c", code: "#ifndef MY_LIB_H\n#define MY_LIB_H\n\n#ifdef __cplusplus\nextern \"C\" {\n#endif\n\nint my_function(int x);\n\n#ifdef __cplusplus\n}\n#endif\n\n#endif /* MY_LIB_H */" }
    ],
    keyTakeaway: "Add `extern \"C\"` guards to public C headers — C++ consumers depend on them.",
    references: []
  },
  "c-lang.api-header-design.are-opaque-types-used-to-hide-implementation-details": {
    whatItMeans: "Public APIs use opaque pointer types (forward declarations) to hide struct implementation details from consumers.",
    whyItMatters: "Exposing struct internals couples consumers to your implementation. Opaque types allow you to change the struct without recompiling consumers.",
    howToVerify: "- Check that public headers use forward declarations (`struct foo;`) not full definitions\n- Verify consumers access struct fields only through getter/setter functions\n- Look for struct definitions that leak internal state in public headers",
    exampleComment: "The full `struct connection` definition is in the public header but consumers don't need to know the fields. Could you make it opaque (forward declare only)?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// In public header — exposes internals!\nstruct connection {\n    int fd;\n    char *host;\n    SSL *ssl;\n    int retry_count;\n};" },
      { label: "Good", language: "c", code: "// In public header — opaque\ntypedef struct connection connection_t;\nconnection_t *conn_create(const char *host);\nvoid conn_destroy(connection_t *conn);\nint conn_send(connection_t *conn, const void *data, size_t len);" }
    ],
    keyTakeaway: "Use opaque types in public APIs — hide struct details behind function interfaces.",
    references: []
  },
  "c-lang.api-header-design.are-function-parameters-ordered-consistently-output-last-or-context-first": {
    whatItMeans: "Function parameter ordering follows a consistent convention: either context/self first, inputs middle, outputs last — or another documented pattern.",
    whyItMatters: "Consistent parameter ordering makes APIs predictable and reduces errors when calling functions from memory. Inconsistency forces callers to check documentation every time.",
    howToVerify: "- Check that the parameter order follows the project's convention\n- Look for output parameters (pointers written to) — they should be last\n- Verify the context/self parameter is consistently first or last",
    exampleComment: "Most functions in this module put the context first and output last, but this function reverses that. Could you reorder to `(ctx, input, output)` for consistency?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Inconsistent ordering across functions\nint parse(char *out, const char *input, parser_t *ctx);\nint format(parser_t *ctx, const char *tmpl, char *out);" },
      { label: "Good", language: "c", code: "// Consistent: context first, inputs, outputs last\nint parse(parser_t *ctx, const char *input, char *out, size_t out_size);\nint format(parser_t *ctx, const char *tmpl, char *out, size_t out_size);" }
    ],
    keyTakeaway: "Pick a parameter ordering convention and follow it consistently across all public APIs.",
    references: []
  },
  "c-lang.api-header-design.are-macros-minimized-in-favor-of-inline-functions-or-const-variables": {
    whatItMeans: "Macros are used sparingly, with `static inline` functions and `const` variables preferred for type safety and debuggability.",
    whyItMatters: "Macros have no type checking, can't be stepped through in a debugger, and cause subtle bugs with side effects. `inline` functions and `const` variables are safer.",
    howToVerify: "- Check if function-like macros could be `static inline` functions\n- Look for constant macros that could be `static const` or `enum` values\n- Verify remaining macros are parenthesized correctly and evaluate args once",
    exampleComment: "The `MAX(a, b)` macro evaluates arguments twice — `MAX(x++, y)` increments x twice! Could you use a `static inline` function instead?",
    codeExamples: [
      { label: "Bad", language: "c", code: "#define MAX(a, b) ((a) > (b) ? (a) : (b))  // Double evaluation!\n#define BUF_SIZE 1024  // No type" },
      { label: "Good", language: "c", code: "static inline int max_int(int a, int b) {\n    return a > b ? a : b;\n}\nstatic const size_t BUF_SIZE = 1024;" }
    ],
    keyTakeaway: "Prefer `static inline` functions over macros — they're type-safe and debuggable.",
    references: []
  },

  // ── Build & Portability ──
  "c-lang.build-portability.are-compiler-warnings-enabled--wall--wextra--werror": {
    whatItMeans: "The build system enables comprehensive compiler warnings (`-Wall -Wextra -Werror`) to catch potential bugs at compile time.",
    whyItMatters: "Compiler warnings catch real bugs: uninitialized variables, implicit conversions, unused values, format string mismatches. `-Werror` prevents ignoring them.",
    howToVerify: "- Check the Makefile/CMakeLists.txt for warning flags\n- Verify `-Wall -Wextra` are enabled at minimum\n- Check if `-Werror` is used (at least in CI)\n- Look for `-Wno-*` flags that disable important warnings",
    exampleComment: "The Makefile only uses `-Wall`. Could you add `-Wextra -Wpedantic -Werror` to catch more issues? Also consider `-Wshadow -Wformat-security`.",
    codeExamples: [
      { label: "Bad", language: "makefile", code: "CFLAGS = -O2" },
      { label: "Good", language: "makefile", code: "CFLAGS = -Wall -Wextra -Wpedantic -Werror -Wshadow -Wformat-security -O2" }
    ],
    keyTakeaway: "Enable all warnings and treat them as errors — the compiler catches bugs humans miss.",
    references: []
  },
  "c-lang.build-portability.are-platform-specific-features-guarded-with-preprocessor-checks": {
    whatItMeans: "Platform-specific code (system calls, headers, data types) is wrapped in preprocessor conditionals for portability.",
    whyItMatters: "Code that compiles on Linux may not compile on macOS, Windows, or embedded platforms. Guards allow platform-specific implementations to coexist.",
    howToVerify: "- Check that platform-specific includes are guarded (`#ifdef __linux__`, `#ifdef _WIN32`)\n- Look for POSIX functions used without checking availability\n- Verify a portable fallback exists for each platform-specific feature",
    exampleComment: "The `epoll` call only works on Linux. Could you add a `#ifdef __linux__` guard and provide a `poll`-based fallback for macOS?",
    codeExamples: [
      { label: "Bad", language: "c", code: "#include <sys/epoll.h>  // Linux only!\nint fd = epoll_create1(0);" },
      { label: "Good", language: "c", code: "#ifdef __linux__\n#include <sys/epoll.h>\n#elif defined(__APPLE__)\n#include <sys/event.h>  // kqueue\n#else\n#include <poll.h>  // POSIX fallback\n#endif" }
    ],
    keyTakeaway: "Guard platform-specific code with preprocessor checks — always provide a portable fallback.",
    references: []
  },
  "c-lang.build-portability.are-endianness-assumptions-avoided-or-handled": {
    whatItMeans: "Code doesn't assume a specific byte order (little-endian or big-endian) when reading/writing binary data, or explicitly converts using `htonl`/`ntohl`.",
    whyItMatters: "Network protocols use big-endian (network byte order). Many CPUs use little-endian. Reading binary data with wrong endianness corrupts values.",
    howToVerify: "- Check binary protocol code for byte order handling\n- Look for `htonl`/`ntohl`/`htons`/`ntohs` usage on network data\n- Verify struct serialization handles endianness explicitly",
    exampleComment: "Reading `*(uint32_t *)buf` from network data assumes the host byte order matches the protocol. Use `ntohl()` to convert from network byte order.",
    codeExamples: [
      { label: "Bad", language: "c", code: "uint32_t len;\nmemcpy(&len, buf, 4);  // Wrong on big-endian hosts!\nprocess(buf + 4, len);" },
      { label: "Good", language: "c", code: "uint32_t len_net;\nmemcpy(&len_net, buf, 4);\nuint32_t len = ntohl(len_net);  // Network to host byte order\nprocess(buf + 4, len);" }
    ],
    keyTakeaway: "Always use ntohl/htonl for network data — never assume byte order matches your CPU.",
    references: []
  },
  "c-lang.build-portability.are-alignment-requirements-respected-for-structures": {
    whatItMeans: "Structure layouts account for alignment requirements, and packed attributes or explicit padding are used when layout must match a specification.",
    whyItMatters: "Compilers add padding for alignment. Assuming packed layout when reading binary data causes incorrect field access. Misaligned access crashes on some architectures.",
    howToVerify: "- Check that binary protocol structs use `__attribute__((packed))` or manual padding\n- Verify `sizeof(struct)` matches the expected wire format size\n- Look for struct casts on byte buffers that may have alignment issues",
    exampleComment: "The `sizeof(struct header)` is 12 bytes due to padding, but the wire format expects 10 bytes. Use `__attribute__((packed))` and verify with `_Static_assert`.",
    codeExamples: [
      { label: "Bad", language: "c", code: "struct header {\n    uint8_t type;     // 1 byte + 3 padding\n    uint32_t length;  // 4 bytes\n    uint16_t flags;   // 2 bytes + 2 padding\n};  // sizeof = 12, but wire format is 7!" },
      { label: "Good", language: "c", code: "struct __attribute__((packed)) header {\n    uint8_t type;\n    uint32_t length;\n    uint16_t flags;\n};\n_Static_assert(sizeof(struct header) == 7, \"header size mismatch\");" }
    ],
    keyTakeaway: "Use packed structs for wire formats and static_assert to verify sizes match expectations.",
    references: []
  },
  "c-lang.build-portability.is-undefined-behavior-avoided-null-dereference-signed-overflow-etc": {
    whatItMeans: "The code avoids undefined behavior (UB) in all its forms: null dereference, signed overflow, uninitialized reads, out-of-bounds access, strict aliasing violations.",
    whyItMatters: "UB means the compiler can do anything — optimize away your NULL checks, reorder operations, or generate code that works in debug but crashes in release.",
    howToVerify: "- Build with UndefinedBehaviorSanitizer (`-fsanitize=undefined`)\n- Check for signed integer overflow in arithmetic\n- Look for uninitialized variable reads\n- Verify no strict aliasing violations (type punning through pointer casts)",
    exampleComment: "The `a + b` can overflow as signed int, which is UB. The compiler may optimize away the subsequent overflow check. Check before the operation or use unsigned arithmetic.",
    codeExamples: [
      { label: "Bad", language: "c", code: "int add(int a, int b) {\n    int sum = a + b;  // UB: signed overflow\n    if (sum < a) return -1;  // Compiler may optimize this away!\n    return sum;\n}" },
      { label: "Good", language: "c", code: "int add(int a, int b) {\n    if (b > 0 && a > INT_MAX - b) return -1;\n    if (b < 0 && a < INT_MIN - b) return -1;\n    return a + b;\n}" }
    ],
    keyTakeaway: "Avoid undefined behavior — the compiler exploits it for optimization, causing subtle bugs.",
    references: [
      { title: "UndefinedBehaviorSanitizer", url: "https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html" }
    ]
  },
  "c-lang.build-portability.are-sanitizers-asan-ubsan-tsan-run-in-ci": {
    whatItMeans: "CI pipelines run tests with AddressSanitizer, UndefinedBehaviorSanitizer, and ThreadSanitizer enabled to catch bugs at test time.",
    whyItMatters: "Sanitizers catch bugs (buffer overflows, use-after-free, data races, UB) that are invisible to normal testing. Running them in CI catches regressions automatically.",
    howToVerify: "- Check CI configuration for sanitizer build targets\n- Verify tests run with ASan, UBSan, and TSan (separate builds)\n- Check that sanitizer errors cause CI failure\n- Verify sanitizer suppressions are documented and justified",
    exampleComment: "The CI pipeline doesn't have a sanitizer build. Could you add targets for ASan, UBSan, and TSan? They'll catch memory and concurrency bugs that regular tests miss.",
    codeExamples: [
      { label: "Bad", language: "yaml", code: "# CI only builds with optimization\nscript: gcc -O2 -o tests *.c && ./tests" },
      { label: "Good", language: "yaml", code: "# CI with sanitizers\njobs:\n  asan:\n    script: gcc -fsanitize=address,undefined -g -o tests *.c && ./tests\n  tsan:\n    script: gcc -fsanitize=thread -g -o tests *.c && ./tests" }
    ],
    keyTakeaway: "Run ASan, UBSan, and TSan in CI — they catch the bugs that code review and testing miss.",
    references: []
  },

  // ── Security ──
  "c-lang.security.is-user-input-validated-and-size-bounded": {
    whatItMeans: "All user-provided input is validated for expected format and bounded in size before processing.",
    whyItMatters: "Unbounded input is the root cause of buffer overflows, the most exploited vulnerability in C. Size validation is the first line of defense.",
    howToVerify: "- Check that all input paths have size limits\n- Verify input is validated before being used in operations\n- Look for `scanf(\"%s\", ...)` without field width limits\n- Check network input handlers for length validation",
    exampleComment: "The `scanf(\"%s\", buf)` has no field width limit. Use `scanf(\"%255s\", buf)` with the buffer size minus one.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char name[64];\nscanf(\"%s\", name);  // No size limit — buffer overflow!" },
      { label: "Good", language: "c", code: "char name[64];\nif (scanf(\"%63s\", name) != 1) {\n    fprintf(stderr, \"Invalid input\\n\");\n    return -1;\n}" }
    ],
    keyTakeaway: "Validate and bound all user input — unbounded input is the #1 C vulnerability source.",
    references: []
  },
  "c-lang.security.are-format-string-vulnerabilities-prevented": {
    whatItMeans: "User-controlled strings are never used as format strings in printf-family functions.",
    whyItMatters: "Format string vulnerabilities allow reading and writing arbitrary memory. An attacker using `%n` can achieve code execution.",
    howToVerify: "- Check that all printf/fprintf/sprintf calls use string literal formats\n- Enable `-Wformat-security` compiler flag\n- Look for `syslog(user_input)` and similar patterns",
    exampleComment: "The `syslog(msg)` call is a format string vulnerability. Use `syslog(\"%s\", msg)` instead.",
    codeExamples: [
      { label: "Bad", language: "c", code: "syslog(LOG_ERR, user_message);  // Format string attack!" },
      { label: "Good", language: "c", code: "syslog(LOG_ERR, \"%s\", user_message);  // Safe" }
    ],
    keyTakeaway: "Never pass user input as a format string — always use `\"%s\"` with the input as an argument.",
    references: []
  },
  "c-lang.security.is-stack-buffer-overflow-prevented": {
    whatItMeans: "Stack buffers are protected from overflow by using bounded operations and validating sizes before writing.",
    whyItMatters: "Stack buffer overflows can overwrite return addresses, enabling code execution. They're the most classic and dangerous C vulnerability.",
    howToVerify: "- Check for fixed-size stack buffers with unbounded writes\n- Verify `gets()` is never used (it has no size parameter)\n- Look for `strcpy` and `sprintf` targeting stack buffers\n- Check that size calculations don't overflow",
    exampleComment: "Never use `gets()` — it's been removed from the C standard because it cannot be used safely. Use `fgets(buf, sizeof(buf), stdin)` instead.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char buf[128];\ngets(buf);  // NEVER safe — removed from C11!" },
      { label: "Good", language: "c", code: "char buf[128];\nif (fgets(buf, sizeof(buf), stdin) == NULL) {\n    return -1;\n}\nbuf[strcspn(buf, \"\\n\")] = '\\0';  // Remove trailing newline" }
    ],
    keyTakeaway: "Never use `gets()` — use `fgets` with a size limit for all input reading.",
    references: []
  },
  "c-lang.security.are-aslrstack-canariespie-not-disabled": {
    whatItMeans: "Security features like ASLR, stack canaries, and Position Independent Executables (PIE) are not disabled in the build configuration.",
    whyItMatters: "These features are defense-in-depth against exploitation. Disabling them (e.g., `-fno-stack-protector`, `-no-pie`) removes critical mitigations.",
    howToVerify: "- Check build flags for `-fno-stack-protector`, `-no-pie`, `-z execstack`\n- Verify `-fstack-protector-strong` or `-fstack-protector-all` is enabled\n- Check that PIE is enabled for executables\n- Verify NX (no-execute) is not disabled",
    exampleComment: "The Makefile has `-fno-stack-protector`. Unless this is for a bare-metal embedded target, please remove it — stack canaries prevent stack buffer overflow exploits.",
    codeExamples: [
      { label: "Bad", language: "makefile", code: "CFLAGS = -O2 -fno-stack-protector -no-pie" },
      { label: "Good", language: "makefile", code: "CFLAGS = -O2 -fstack-protector-strong -pie -fPIE" }
    ],
    keyTakeaway: "Never disable security features without documented justification — they're your last line of defense.",
    references: []
  },
  "c-lang.security.are-secrets-zeroed-from-memory-after-use": {
    whatItMeans: "Sensitive data like passwords, encryption keys, and tokens is explicitly zeroed from memory after use using `explicit_bzero` or `memset_s`.",
    whyItMatters: "Sensitive data left in memory can be extracted through core dumps, memory disclosure bugs, or cold boot attacks. Zeroing reduces the exposure window.",
    howToVerify: "- Check that sensitive buffers are zeroed before being freed or going out of scope\n- Verify `explicit_bzero` (not `memset`, which compilers may optimize away) is used\n- Look for passwords and keys on the stack that aren't zeroed",
    exampleComment: "The password buffer is on the stack and isn't zeroed. Use `explicit_bzero(password, sizeof(password))` before the function returns.",
    codeExamples: [
      { label: "Bad", language: "c", code: "void authenticate(void) {\n    char password[128];\n    read_password(password, sizeof(password));\n    verify(password);\n    // password lingers on the stack!\n}" },
      { label: "Good", language: "c", code: "void authenticate(void) {\n    char password[128];\n    read_password(password, sizeof(password));\n    verify(password);\n    explicit_bzero(password, sizeof(password));\n}" }
    ],
    keyTakeaway: "Zero sensitive data after use with `explicit_bzero` — regular `memset` can be optimized away.",
    references: []
  },
  "c-lang.security.is-rand-not-used-for-security-sensitive-random-numbers": {
    whatItMeans: "Security-sensitive random numbers (tokens, keys, nonces) use cryptographically secure sources (`/dev/urandom`, `getrandom()`, `arc4random()`) instead of `rand()`.",
    whyItMatters: "`rand()` is a weak PRNG with predictable output. Using it for security tokens allows attackers to predict future values and compromise the system.",
    howToVerify: "- Check that security-sensitive random generation doesn't use `rand()` or `srand()`\n- Verify a CSPRNG is used (`getrandom()`, `arc4random()`, `/dev/urandom`)\n- Look for seed values based on `time()` which is predictable",
    exampleComment: "Using `rand()` seeded with `time(NULL)` for session tokens is insecure. An attacker can predict the sequence. Use `getrandom()` or `arc4random_buf()` instead.",
    codeExamples: [
      { label: "Bad", language: "c", code: "srand(time(NULL));\nint token = rand();  // Predictable!" },
      { label: "Good", language: "c", code: "uint8_t token[32];\n#ifdef __linux__\ngetrandom(token, sizeof(token), 0);\n#else\narc4random_buf(token, sizeof(token));\n#endif" }
    ],
    keyTakeaway: "Never use `rand()` for security — use `getrandom()`, `arc4random()`, or `/dev/urandom`.",
    references: []
  },
  "c-lang.security.are-time-of-check-to-time-of-use-toctou-races-prevented": {
    whatItMeans: "File operations don't have a gap between checking a condition (e.g., file exists) and using the result (e.g., opening the file), preventing TOCTOU race conditions.",
    whyItMatters: "An attacker can change the file (or create a symlink) between the check and the use. This can lead to accessing wrong files, following symlinks, or privilege escalation.",
    howToVerify: "- Look for `access()` or `stat()` followed by `open()` — combine into a single operation\n- Check for `lstat()` + `open()` patterns without `O_NOFOLLOW`\n- Verify file creation uses `O_CREAT | O_EXCL` to prevent race conditions",
    exampleComment: "The `access(path)` check before `open(path)` has a TOCTOU race — the file could change between the two calls. Use `open()` directly and check the error.",
    codeExamples: [
      { label: "Bad", language: "c", code: "if (access(path, R_OK) == 0) {  // Check\n    // Attacker replaces file here!\n    int fd = open(path, O_RDONLY);  // Use\n}" },
      { label: "Good", language: "c", code: "int fd = open(path, O_RDONLY | O_NOFOLLOW);\nif (fd < 0) {\n    // Handle error\n}" }
    ],
    keyTakeaway: "Eliminate TOCTOU races — combine check and use into a single atomic operation.",
    references: []
  },
  "c-lang.security.are-file-operations-using-safe-open-flags-onofollow-ocreatoexcl": {
    whatItMeans: "File operations use safe flags: `O_NOFOLLOW` to prevent symlink attacks, `O_CREAT | O_EXCL` to prevent overwriting existing files.",
    whyItMatters: "Without `O_NOFOLLOW`, an attacker can create a symlink that redirects writes to critical files. Without `O_EXCL`, a race condition can overwrite existing files.",
    howToVerify: "- Check that `open()` uses `O_NOFOLLOW` where appropriate\n- Verify file creation uses `O_CREAT | O_EXCL` to fail if the file exists\n- Look for `mktemp()` usage — replace with `mkstemp()` which opens the file atomically",
    exampleComment: "Using `mktemp()` creates a race condition — use `mkstemp()` which creates and opens the file atomically, preventing symlink attacks.",
    codeExamples: [
      { label: "Bad", language: "c", code: "char *tmp = mktemp(\"/tmp/myapp-XXXXXX\");  // Race condition!\nint fd = open(tmp, O_WRONLY | O_CREAT, 0644);" },
      { label: "Good", language: "c", code: "char tmp[] = \"/tmp/myapp-XXXXXX\";\nint fd = mkstemp(tmp);  // Atomic create + open\nif (fd < 0) { perror(\"mkstemp\"); return -1; }\n// Use fd...\nunlink(tmp);" }
    ],
    keyTakeaway: "Use `mkstemp()`, `O_NOFOLLOW`, and `O_CREAT | O_EXCL` to prevent file-based attacks.",
    references: []
  },

  // ── Testing ──
  "c-lang.testing.are-there-unit-tests-for-new-functions": {
    whatItMeans: "New functions have corresponding unit tests verifying their behavior, including edge cases and error conditions.",
    whyItMatters: "C lacks runtime safety nets — untested code can harbor memory bugs that stay hidden until they cause data corruption or security vulnerabilities in production.",
    howToVerify: "- Check that new functions have test files or test cases\n- Verify tests cover the happy path, error paths, and edge cases\n- Check that tests actually assert results, not just call functions",
    exampleComment: "The new `parse_header` function doesn't have tests. Could you add tests for valid input, malformed input, empty input, and maximum-length input?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// No tests for new parsing function" },
      { label: "Good", language: "c", code: "void test_parse_header_valid(void) {\n    struct header h;\n    assert(parse_header(\"Content-Length: 42\", &h) == 0);\n    assert(h.content_length == 42);\n}\n\nvoid test_parse_header_empty(void) {\n    struct header h;\n    assert(parse_header(\"\", &h) == PARSE_ERR_INVALID);\n}\n\nvoid test_parse_header_overflow(void) {\n    struct header h;\n    assert(parse_header(\"Content-Length: 999999999999999999\", &h) == PARSE_ERR_OVERFLOW);\n}" }
    ],
    keyTakeaway: "Test every new function — in C, bugs often have security implications.",
    references: []
  },
  "c-lang.testing.are-edge-cases-tested-null-0-intmax-empty-buffers": {
    whatItMeans: "Tests include edge cases: NULL pointers, zero-length buffers, maximum integer values, empty strings, and boundary conditions.",
    whyItMatters: "C edge cases cause undefined behavior, crashes, and security vulnerabilities. Testing boundaries is how you find them before attackers do.",
    howToVerify: "- Check for tests with NULL inputs\n- Look for zero-size, INT_MAX, SIZE_MAX test cases\n- Verify empty string and empty buffer cases\n- Check off-by-one boundary conditions",
    exampleComment: "The tests don't cover the case where `size` is 0 or `SIZE_MAX`. These edge cases can trigger division by zero or integer overflow. Could you add them?",
    codeExamples: [
      { label: "Bad", language: "c", code: "void test_copy(void) {\n    char buf[64];\n    assert(safe_copy(buf, \"hello\", 64) == 0);\n}" },
      { label: "Good", language: "c", code: "void test_copy_normal(void) {\n    char buf[64];\n    assert(safe_copy(buf, \"hello\", 64) == 0);\n}\nvoid test_copy_null_src(void) {\n    char buf[64];\n    assert(safe_copy(buf, NULL, 64) == -EINVAL);\n}\nvoid test_copy_zero_size(void) {\n    char buf[64];\n    assert(safe_copy(buf, \"hello\", 0) == -EINVAL);\n}\nvoid test_copy_exact_fit(void) {\n    char buf[6];\n    assert(safe_copy(buf, \"hello\", 6) == 0);\n    assert(buf[5] == '\\0');\n}" }
    ],
    keyTakeaway: "Test NULL, zero, max, and boundary values — they're where C bugs hide.",
    references: []
  },
  "c-lang.testing.are-memory-related-tests-run-under-valgrindasan": {
    whatItMeans: "Tests are run under memory analysis tools (Valgrind, ASan, MSan) to detect memory bugs that are invisible to normal testing.",
    whyItMatters: "A test can pass with correct output while corrupting memory. Only sanitizers detect use-after-free, buffer overflows, and uninitialized reads during test execution.",
    howToVerify: "- Check that CI runs tests with ASan and Valgrind\n- Verify `--error-exitcode=1` is set in Valgrind to fail on errors\n- Look for sanitizer suppression files and verify they're justified",
    exampleComment: "The test suite should be run with ASan (`-fsanitize=address`) in CI. It'll catch the buffer overflow in `parse_message` that normal tests miss.",
    codeExamples: [
      { label: "Bad", language: "makefile", code: "test:\n\tgcc -O2 tests.c -o tests && ./tests" },
      { label: "Good", language: "makefile", code: "test-asan:\n\tgcc -fsanitize=address,undefined -g tests.c -o tests && ./tests\n\ntest-valgrind:\n\tgcc -g tests.c -o tests && valgrind --leak-check=full --error-exitcode=1 ./tests" }
    ],
    keyTakeaway: "Always run tests under sanitizers — they catch memory bugs that correct output hides.",
    references: []
  },
  "c-lang.testing.are-test-names-descriptive": {
    whatItMeans: "Test function names clearly describe what behavior they verify, making test output readable and failures immediately understandable.",
    whyItMatters: "When a test named `test_3` fails, you have to read the test to understand what broke. When `test_parse_rejects_negative_length` fails, you know immediately.",
    howToVerify: "- Check that test function names describe the scenario and expected outcome\n- Look for generic names like `test_1`, `test_basic`, `test_stuff`\n- Verify test output is readable without looking at source",
    exampleComment: "Could you rename `test_parse_2` to something descriptive like `test_parse_rejects_zero_length_input`? It makes failures much easier to understand.",
    codeExamples: [
      { label: "Bad", language: "c", code: "void test_1(void) { ... }\nvoid test_2(void) { ... }\nvoid test_edge(void) { ... }" },
      { label: "Good", language: "c", code: "void test_parse_valid_message(void) { ... }\nvoid test_parse_rejects_empty_input(void) { ... }\nvoid test_parse_handles_max_length(void) { ... }" }
    ],
    keyTakeaway: "Name tests after the behavior they verify — failures should be self-explanatory.",
    references: []
  },
  "c-lang.testing.is-fuzzing-used-for-input-parsing-code": {
    whatItMeans: "Input parsing functions (protocol parsers, file format readers, command processors) are fuzz-tested with tools like AFL or libFuzzer.",
    whyItMatters: "Fuzzing finds crashes and memory bugs that hand-written tests miss. It's especially effective for C parsers where input handling errors have security implications.",
    howToVerify: "- Check if fuzz targets exist for parsing functions\n- Look for libFuzzer or AFL harnesses in the test directory\n- Verify the corpus includes edge-case inputs\n- Check CI for fuzz regression tests",
    exampleComment: "The HTTP parser handles untrusted input — this is a prime candidate for fuzzing. Could you add a libFuzzer harness? Even a basic `LLVMFuzzerTestOneInput` would help.",
    codeExamples: [
      { label: "Bad", language: "c", code: "// No fuzz testing for parser that handles untrusted input" },
      { label: "Good", language: "c", code: "// fuzz_parser.c — libFuzzer harness\n#include \"parser.h\"\n\nint LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {\n    struct message msg;\n    parse_message((const char *)data, size, &msg);\n    return 0;\n}\n\n// Build: clang -fsanitize=fuzzer,address fuzz_parser.c parser.c" }
    ],
    keyTakeaway: "Fuzz all input parsers — fuzzing finds bugs that no amount of manual testing can.",
    references: [
      { title: "libFuzzer", url: "https://llvm.org/docs/LibFuzzer.html" },
      { title: "AFL", url: "https://aflplus.plus/" }
    ]
  },
  "c-lang.testing.are-regression-tests-added-for-fixed-bugs": {
    whatItMeans: "Bug fixes include a test that reproduces the original bug, ensuring it never regresses.",
    whyItMatters: "Without a regression test, the same bug can be reintroduced when code is refactored. The test documents what went wrong and prevents recurrence.",
    howToVerify: "- Check that bug-fix PRs include a new test case\n- Verify the test fails without the fix and passes with it\n- Check that the test exercises the specific edge case that caused the bug",
    exampleComment: "This buffer overflow fix should have a regression test. Could you add a test with the specific input that triggered the overflow?",
    codeExamples: [
      { label: "Bad", language: "c", code: "// Bug fix without test — may regress\n// Fixed off-by-one in parse_header" },
      { label: "Good", language: "c", code: "// Regression test for off-by-one in parse_header (issue #456)\nvoid test_parse_header_regression_456(void) {\n    // Input that triggered the original overflow\n    const char *input = \"X: \" \"A\" * 255;  // Max length boundary\n    struct header h;\n    assert(parse_header(input, &h) == 0);\n}" }
    ],
    keyTakeaway: "Every bug fix needs a regression test — document what broke and prevent it from happening again.",
    references: []
  },

  // ── Documentation ──
  "c-lang.documentation.are-public-functions-documented-with-parameter-and-return-descriptions": {
    whatItMeans: "Public API functions have documentation comments describing their purpose, parameters, return values, error conditions, and ownership semantics.",
    whyItMatters: "C APIs require explicit documentation because the language provides few safety guardrails. Callers need to know buffer ownership, error codes, and thread safety.",
    howToVerify: "- Check that every public function in headers has a doc comment\n- Verify @param, @return, and error conditions are documented\n- Check that ownership semantics (who frees?) are stated",
    exampleComment: "The `ctx_create` function allocates but the header doesn't say who frees it or how. Could you add a doc comment with ownership and error documentation?",
    codeExamples: [
      { label: "Bad", language: "c", code: "int process(struct ctx *c, const char *in, char *out, size_t n);" },
      { label: "Good", language: "c", code: "/**\n * Process input and write result to output buffer.\n *\n * @param ctx    Initialized context (must not be NULL)\n * @param input  Input string (must not be NULL)\n * @param output Output buffer (must not be NULL)\n * @param size   Size of output buffer in bytes\n * @return       0 on success, -EINVAL for invalid params,\n *               -ENOMEM if output buffer too small\n * @note         Thread-safe if ctx is not shared.\n */\nint process(struct ctx *ctx, const char *input,\n            char *output, size_t size);" }
    ],
    keyTakeaway: "Document parameters, return values, errors, and ownership — C code needs more documentation than most.",
    references: []
  },
  "c-lang.documentation.are-header-files-documenting-the-public-api-contract": {
    whatItMeans: "Header files serve as the API documentation, with module-level comments explaining the purpose and usage patterns of the module.",
    whyItMatters: "In C, headers are the primary interface. Well-documented headers allow consumers to use the library without reading the implementation.",
    howToVerify: "- Check that header files have a module-level comment explaining purpose and usage\n- Verify usage examples are provided for complex APIs\n- Check that preconditions and thread safety are documented",
    exampleComment: "This header exposes 12 functions but has no overview documentation. Could you add a module comment explaining what this library does and how to use it?",
    codeExamples: [
      { label: "Bad", language: "c", code: "#ifndef PARSER_H\n#define PARSER_H\nstruct parser;\nint parser_init(struct parser **p);\nint parser_feed(struct parser *p, const char *data, size_t len);\n#endif" },
      { label: "Good", language: "c", code: "/**\n * @file parser.h\n * @brief Incremental message parser for the XYZ protocol.\n *\n * Usage:\n *   struct parser *p;\n *   parser_init(&p);\n *   parser_feed(p, data, len);\n *   while (parser_has_message(p)) { ... }\n *   parser_destroy(p);\n *\n * Thread safety: NOT thread-safe. Use one parser per thread.\n */\n#ifndef PARSER_H\n#define PARSER_H\n..." }
    ],
    keyTakeaway: "Headers are your API documentation — include module overview, usage examples, and thread safety notes.",
    references: []
  },
  "c-lang.documentation.are-complex-algorithms-or-data-structures-explained": {
    whatItMeans: "Non-obvious algorithms, data structures, and design decisions have comments explaining the approach, complexity, and rationale.",
    whyItMatters: "C code is often low-level and dense. Without comments explaining the 'why', maintainers spend excessive time understanding custom data structures and bitwise operations.",
    howToVerify: "- Check that non-trivial algorithms have a comment explaining the approach\n- Look for magic numbers that should be explained\n- Verify the complexity (O-notation) is documented for performance-critical code",
    exampleComment: "The hash table implementation uses Robin Hood probing but doesn't explain why. Could you add a comment explaining the approach and linking to the algorithm reference?",
    codeExamples: [
      { label: "Bad", language: "c", code: "uint32_t h = 0x811c9dc5;\nwhile (*s) {\n    h ^= (uint8_t)*s++;\n    h *= 0x01000193;\n}" },
      { label: "Good", language: "c", code: "/* FNV-1a hash: fast, well-distributed for short strings.\n * See: http://www.isthe.com/chongo/tech/comp/fnv/\n * O(n) where n is string length. */\nuint32_t h = FNV_OFFSET_BASIS;  /* 0x811c9dc5 */\nwhile (*s) {\n    h ^= (uint8_t)*s++;\n    h *= FNV_PRIME;  /* 0x01000193 */\n}" }
    ],
    keyTakeaway: "Comment the 'why' for complex algorithms — magic numbers and bitwise tricks need explanation.",
    references: []
  },
  "c-lang.documentation.are-breaking-api-changes-called-out": {
    whatItMeans: "Changes to public API signatures, behavior, or semantics are prominently documented in the PR and changelog.",
    whyItMatters: "C libraries are often depended on by many consumers. Breaking API changes without notice cause compilation failures and runtime bugs across dependent projects.",
    howToVerify: "- Check if function signatures or struct layouts changed\n- Look for changed return value semantics or error codes\n- Verify breaking changes are documented in PR description and changelog\n- Check for version bump (semver major version for breaking changes)",
    exampleComment: "The `parse_message` return type changed from `int` to `ssize_t`. This is a breaking API change — could you document it in the changelog and bump the major version?",
    codeExamples: [],
    keyTakeaway: "Document breaking API changes loudly — C consumers need time to update their code.",
    references: []
  }
};
