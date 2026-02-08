#!/bin/bash
# Snapshot tests for /orchestrate command
# Tests that the generated orchestration prompts contain required sections and role patterns
#
# Usage: bash tests/test-orchestrate.sh [--update-snapshots]
#
# These tests validate the STRUCTURE of orchestration prompts by checking for
# required sections, role keywords, and patterns. They don't require running
# Claude Code - they validate against saved snapshot files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOTS_DIR="$SCRIPT_DIR/snapshots"
PASSED=0
FAILED=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() {
  PASSED=$((PASSED + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${GREEN}PASS${NC} $1"
}

log_fail() {
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${RED}FAIL${NC} $1"
}

# Check that a snapshot file contains a required pattern (case-insensitive)
assert_contains() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  if grep -qi "$pattern" "$file" 2>/dev/null; then
    log_pass "$description"
  else
    log_fail "$description (pattern '$pattern' not found)"
  fi
}

# Check that a snapshot file contains a required pattern (case-sensitive)
assert_contains_exact() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  if grep -q "$pattern" "$file" 2>/dev/null; then
    log_pass "$description"
  else
    log_fail "$description (pattern '$pattern' not found)"
  fi
}

# Check that a file exists
assert_file_exists() {
  local file="$1"
  local description="$2"

  if [ -f "$file" ]; then
    log_pass "$description"
  else
    log_fail "$description (file '$file' not found)"
  fi
}

# ============================================================
# Required sections that EVERY orchestration prompt must have
# ============================================================
validate_common_sections() {
  local file="$1"
  local test_name="$2"

  echo ""
  echo "--- $test_name: Common Sections ---"

  assert_contains "$file" "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" \
    "Contains enablement instructions"

  assert_contains "$file" "settings.json" \
    "References settings.json for enablement"

  assert_contains_exact "$file" "## Goal" \
    "Has Goal section"

  assert_contains_exact "$file" "## Team Setup" \
    "Has Team Setup section"

  assert_contains "$file" "team lead" \
    "Identifies team lead role"

  assert_contains "$file" "## Task List" \
    "Has Task List section"

  assert_contains "$file" "## Communication" \
    "Has Communication section"

  assert_contains "$file" "broadcast" \
    "Mentions broadcast messaging"

  assert_contains "$file" "message" \
    "Mentions direct messaging"

  assert_contains "$file" "## Quality Gates" \
    "Has Quality Gates section"

  assert_contains "$file" "## Lead Instructions" \
    "Has Lead Instructions section"

  assert_contains "$file" "WAIT" \
    "Lead told to wait for teammates"

  assert_contains "$file" "## Shutdown" \
    "Has Shutdown section"

  assert_contains "$file" "cleanup" \
    "Mentions cleanup"

  assert_contains "$file" "Only the lead" \
    "Specifies only lead runs cleanup"

  assert_contains "$file" "shut down" \
    "Mentions teammate shutdown"
}

# ============================================================
# Test 1: Debugging prompt -> competing hypotheses
# ============================================================
test_debugging() {
  local snapshot="$SNAPSHOTS_DIR/debugging.md"
  assert_file_exists "$snapshot" "Debugging snapshot exists"

  validate_common_sections "$snapshot" "Debugging"

  echo ""
  echo "--- Debugging: Role-Specific Checks ---"

  assert_contains "$snapshot" "hypothesis" \
    "Contains hypothesis-based roles"

  assert_contains "$snapshot" "repro" \
    "Contains reproduction/repro role"

  assert_contains "$snapshot" "log\|telemetry\|digger" \
    "Contains log/telemetry investigation role"

  assert_contains "$snapshot" "fix\|proposer\|reviewer" \
    "Contains fix proposer/reviewer role"

  # The original prompt should appear verbatim in the Goal section
  assert_contains "$snapshot" "login endpoint returns 500" \
    "Contains original prompt verbatim in Goal"

  assert_contains "$snapshot" "test" \
    "Quality gates mention testing"
}

# ============================================================
# Test 2: Feature prompt -> cross-layer roles
# ============================================================
test_feature() {
  local snapshot="$SNAPSHOTS_DIR/feature.md"
  assert_file_exists "$snapshot" "Feature snapshot exists"

  validate_common_sections "$snapshot" "Feature"

  echo ""
  echo "--- Feature: Role-Specific Checks ---"

  assert_contains "$snapshot" "architect" \
    "Contains architect role"

  assert_contains "$snapshot" "backend" \
    "Contains backend role"

  assert_contains "$snapshot" "frontend" \
    "Contains frontend role"

  assert_contains "$snapshot" "test\|QA" \
    "Contains test/QA role"

  assert_contains "$snapshot" "review\|perf" \
    "Contains reviewer/performance role"

  # Original prompt verbatim
  assert_contains "$snapshot" "real-time notification system" \
    "Contains original prompt verbatim in Goal"

  assert_contains "$snapshot" "plan approval\|plan mode" \
    "Requires plan approval for code changes"
}

# ============================================================
# Test 3: Research prompt -> researcher/critic/synthesizer
# ============================================================
test_research() {
  local snapshot="$SNAPSHOTS_DIR/research.md"
  assert_file_exists "$snapshot" "Research snapshot exists"

  validate_common_sections "$snapshot" "Research"

  echo ""
  echo "--- Research: Role-Specific Checks ---"

  assert_contains "$snapshot" "researcher" \
    "Contains researcher role"

  assert_contains "$snapshot" "critic" \
    "Contains critic role"

  assert_contains "$snapshot" "synthe" \
    "Contains synthesizer role"

  assert_contains "$snapshot" "devil.*advocate\|advocate" \
    "Contains devil's advocate role"

  # Original prompt verbatim
  assert_contains "$snapshot" "GraphQL vs REST vs gRPC" \
    "Contains original prompt verbatim in Goal"

  assert_contains "$snapshot" "tradeoff\|trade-off\|comparison" \
    "Research quality gates mention tradeoffs/comparison"

  assert_contains "$snapshot" "evidence\|checked\|consulted" \
    "Research quality gates require evidence"
}

# ============================================================
# Main
# ============================================================
echo "========================================"
echo "Orchestrate Plugin - Snapshot Tests"
echo "========================================"
echo ""
echo "Snapshot directory: $SNAPSHOTS_DIR"

if [ ! -d "$SNAPSHOTS_DIR" ]; then
  echo -e "${RED}ERROR: Snapshots directory not found at $SNAPSHOTS_DIR${NC}"
  echo "Run the snapshot generation script first, or create snapshots manually."
  exit 1
fi

test_debugging
test_feature
test_research

echo ""
echo "========================================"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, $TOTAL total"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0
