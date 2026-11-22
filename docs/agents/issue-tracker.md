# Issue tracker: GitHub

Issues and specs live in GitHub Issues in `wescodess/cadet2` (private). Use `gh`; the historical `kaypappi/cadet2` remote resolves to this owner. Always verify the target with `gh repo view wescodess/cadet2 --json nameWithOwner,url` before writing. File only in this repository.

Current portal map: [Chart the Client and Representative portals for a staging pilot](https://github.com/wescodess/cadet2/issues/29). Read its Destination and Notes before portal work.

## Conventions

- Create: `gh issue create --repo wescodess/cadet2 --title "TITLE" --body-file /path/to/body.md --label "LABEL"`.
- Read: `gh issue view NUMBER --repo wescodess/cadet2 --json number,title,body,labels,assignees,comments,url`.
- List: `gh issue list --repo wescodess/cadet2 --state open --limit 100 --json number,title,labels,assignees,url`; filter with `--label` as needed. Use the paginated native relationships below when completeness matters.
- Edit a body: `gh issue edit NUMBER --repo wescodess/cadet2 --body-file /path/to/body.md`. Use real issue links for cross-references.
- Inspect labels: `gh label list --repo wescodess/cadet2 --limit 100 --json name,description,color`. Create missing configured labels with `gh label create NAME --repo wescodess/cadet2 --description "DESCRIPTION" --color HEX`.

Keep multiline bodies in files and pass `--body-file`; this preserves literal text and newlines. See [triage-labels.md](triage-labels.md) for work-ticket labels.

## Pull requests as a triage surface

**PRs as a request surface: no.** External PRs do not enter the issue triage queue.

## Publishing and fetching

When a skill says "publish to the issue tracker", create a GitHub issue. When it says "fetch the relevant ticket", read the issue body and comments. Use names with links when referring to maps and tickets.

## Wayfinding operations

These operations use GitHub's native sub-issues and issue dependencies. The installed `gh` is 2.86.0 (verified 2026-11-16), so use REST through `gh api`; it lacks the newer `--parent` and `--add-blocked-by` flags. Native relationships are canonical; body links only explain them.

- **Map:** one issue labelled `wayfinder:map`, with Destination, Notes, Decisions so far, Not yet specified, and Out of scope. Find maps with `gh issue list --repo wescodess/cadet2 --state open --label wayfinder:map --json number,title,url`.
- **Child tickets:** attach each ticket as a native GitHub sub-issue of the map. Each carries exactly one type label: `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`; use no triage labels.
- **Blocking:** add each prerequisite to the child's native **blocked by** relationship, after all tickets exist. GitHub then renders it in the issue UI. Use the prerequisite's numeric database `id`, not its issue number or `node_id`.

With `map_number`, `child_number`, and `blocker_number` set to the actual issue numbers:

```bash
repo=wescodess/cadet2
child_id="$(gh api "repos/$repo/issues/$child_number" --jq .id)"
gh api --method POST "repos/$repo/issues/$map_number/sub_issues" \
  -F sub_issue_id="$child_id"

blocker_id="$(gh api "repos/$repo/issues/$blocker_number" --jq .id)"
gh api --method POST "repos/$repo/issues/$child_number/dependencies/blocked_by" \
  -F issue_id="$blocker_id"
```

Read native children or blockers, including all pages:

```bash
gh api --paginate --slurp "repos/$repo/issues/$map_number/sub_issues?per_page=100"
gh api --paginate --slurp "repos/$repo/issues/$child_number/dependencies/blocked_by?per_page=100"
```

**Frontier query:** open, unassigned native children with no open native blocker, in the map's child order. Closed blockers do not block; API failures stop the query. Run from a shell with Python 3 and `gh`; replace `29` for another map:

```bash
map_number=29
python3 - "$map_number" <<'PY'
import json
import subprocess
import sys

repo = "wescodess/cadet2"
map_number = int(sys.argv[1])

def items(path):
    output = subprocess.check_output(
        ["gh", "api", "--paginate", "--slurp",
         f"repos/{repo}/{path}?per_page=100"], text=True
    )
    return [item for page in json.loads(output) for item in page]

for child in items(f"issues/{map_number}/sub_issues"):
    if child["state"] != "open" or child["assignees"]:
        continue
    blockers = items(f"issues/{child['number']}/dependencies/blocked_by")
    if not any(blocker["state"] == "open" for blocker in blockers):
        print(f"- {child['title']} — {child['html_url']}")
PY
```

**Claim and resolve (later sessions):** assign a frontier ticket to the driving developer before working it. Record the answer in a comment, close the ticket, and add only its named link and a one-line gist to the map's Decisions so far. Open tickets are discovered through native children, not duplicated in the map body. Charting claims and resolves nothing.
