import { DiffsService } from '../src/diffs/diffs.service';

describe('DiffsService', () => {
  const service = new DiffsService({} as any);

  it('builds grounding context from optional diff text', async () => {
    const context = await service.buildGroundingContext(
      {
        supabaseUserId: 'u1',
        rawClaims: {},
      },
      {
        diffText: `diff --git a/main.ts b/main.ts
index 123..456 100644
--- a/main.ts
+++ b/main.ts
@@ -1,3 +1,4 @@
-const x = 1;
+const x = 2;
+const y = x + 1;`,
      },
    );

    expect(context).not.toBeNull();
    expect(context?.fileCount).toBe(1);
    expect(context?.lineCount).toBeGreaterThan(5);
    expect(context?.summary).toContain('Files changed: 1');
  });

  it('computes per-file diff heatmap from diff text', async () => {
    const heatmap = await service.getDiffFileHeatmap(
      {
        supabaseUserId: 'u1',
        rawClaims: {},
      },
      {
        diffText: `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1,2 @@
-a
+a
+b
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1,2 +1 @@
-x
-y
+x`,
      },
    );

    expect(heatmap.length).toBe(2);
    expect(heatmap[0].churn).toBeGreaterThanOrEqual(heatmap[1].churn);
    expect(heatmap[0].path).toMatch(/\.ts$/);
  });
});
