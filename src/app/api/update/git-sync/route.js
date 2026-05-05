import { NextResponse } from "next/server";
import { execSync } from "child_process";

const UPSTREAM_URL = "https://github.com/decolua/9router.git";

// Files we've customized — conflicts here require manual resolution
const OUR_MODIFIED_FILES = [
  "src/app/(dashboard)/dashboard/providers/page.js",
  "src/app/(dashboard)/dashboard/providers/[id]/page.js",
  "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.js",
];

function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    cwd: process.cwd(),
    timeout: 60000,
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function lines(str) {
  return str ? str.split("\n").filter(Boolean) : [];
}

function tryRun(cmd) {
  try { return run(cmd); } catch { return ""; }
}

export async function POST(request) {
  const { action } = await request.json().catch(() => ({}));

  try {
    // Ensure upstream remote exists
    try {
      run("git remote get-url upstream");
    } catch {
      run(`git remote add upstream ${UPSTREAM_URL}`);
    }

    if (action === "check") {
      run("git fetch upstream");

      const behind = parseInt(run("git rev-list --count HEAD..upstream/master"), 10);
      if (behind === 0) {
        return NextResponse.json({ success: true, upToDate: true });
      }

      // Detect potential conflicts via file overlap (safe — no working tree modification)
      const upstreamFiles = lines(run("git diff --name-only HEAD..upstream/master"));
      const localUncommitted = lines(run("git diff --name-only HEAD"));
      const localCommitted = lines(tryRun("git diff --name-only origin/master..HEAD"));

      const allLocalFiles = [...new Set([...localUncommitted, ...localCommitted])];
      const potentialConflicts = upstreamFiles.filter((f) => allLocalFiles.includes(f));

      const hasConflicts = potentialConflicts.length > 0;
      const ourConflicts = potentialConflicts.filter((f) => OUR_MODIFIED_FILES.includes(f));
      const otherConflicts = potentialConflicts.filter((f) => !OUR_MODIFIED_FILES.includes(f));
      const isDirty = localUncommitted.length > 0;

      return NextResponse.json({
        success: true,
        hasConflicts,
        potentialConflicts,
        ourConflicts,
        otherConflicts,
        behind,
        isDirty,
      });
    }

    if (action === "merge") {
      const dirty = lines(run("git diff --name-only HEAD"));
      if (dirty.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Working tree has uncommitted changes. Commit or stash them first, then retry.",
          },
          { status: 409 }
        );
      }

      run("git merge upstream/master");
      return NextResponse.json({ success: true, merged: true });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || String(error) },
      { status: 500 }
    );
  }
}
