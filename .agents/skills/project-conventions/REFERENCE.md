# Development Standards & Versioning Rules

## Purpose

These standards establish a consistent approach for naming, versioning, documenting, and releasing projects. Every assistant, workflow, prompt, application, automation, or template should follow these conventions unless there is a documented reason not to.

---

## 1. Versioning Standard

Use Semantic Versioning (SemVer).

Format:

`MAJOR.MINOR.PATCH`

Example:

```
1.0.0
1.1.0
1.2.3
2.0.0
```

### Major

Increment when:

- Breaking existing functionality
- Significant architectural redesign
- Major prompt or workflow changes requiring users to adapt
- API contract changes

Examples:

```
1.0.0 → 2.0.0
```

---

### Minor

Increment when:

- Adding new features
- Adding new tools
- Adding new workflows
- Expanding capabilities without breaking compatibility

Examples:

```
1.2.0 → 1.3.0
```

---

### Patch

Increment when:

- Bug fixes
- Prompt improvements
- Typo corrections
- Performance improvements
- Small workflow refinements
- Documentation updates that affect behavior

Examples:

```
1.2.3 → 1.2.4
```

---

## 2. Release Status

Use release labels only when appropriate.

Examples:

```
1.5.0-alpha.1
1.5.0-beta.1
1.5.0-rc.1
1.5.0
```

Definitions

**Alpha** — Internal testing only.

**Beta** — Feature complete but still collecting feedback.

**Release Candidate (RC)** — Expected production release unless critical issues are discovered.

---

## 3. Changelog

Every release should include a changelog.

Recommended format:

```
## Version 1.3.0

Added
- Multi-language support
- Better error handling

Changed
- Improved response formatting

Fixed
- Duplicate event detection

Removed
- Legacy parser
```

---

## 4. Naming Conventions

Use clear, descriptive names.

Good:

```
Meeting Summary Assistant
Invoice Processor
Indiana Event Collector
Research Synthesizer
```

Avoid:

```
Assistant 3
New Bot
Test Final
Working Version
```

---

## 5. File Naming

Use lowercase with hyphens.

Examples:

```
meeting-summary.md
workflow-rules.md
assistant-config.json
event-parser.py
```

Avoid spaces. Avoid special characters.

---

## 6. Folder Structure

Recommended structure:

```
project/
  docs/
  prompts/
  workflows/
  assets/
  tests/
  archive/
```

---

## 7. Documentation Requirements

Every project should include:

- Purpose
- Intended users
- Inputs
- Outputs
- Dependencies
- Configuration
- Version
- Changelog
- Known limitations

---

## 8. Prompt Standards

Prompts should be:

- Modular
- Specific
- Deterministic where possible
- Free of contradictory instructions
- Written for maintainability

Separate:

- Role
- Goals
- Rules
- Constraints
- Output format

Avoid combining unrelated instructions into a single block.

---

## 9. Testing

Before every release verify:

- Expected output
- Edge cases
- Empty inputs
- Invalid inputs
- Tool failures
- Performance
- Formatting consistency

---

## 10. Breaking Changes

Breaking changes require:

- Major version increment
- Changelog entry
- Documentation update
- Migration notes when appropriate

---

## 11. Documentation Updates

Documentation should be updated whenever:

- Functionality changes
- Rules change
- Required inputs change
- Output format changes
- Dependencies change

Documentation should always match the current release.

---

## 12. Deprecation

When replacing functionality:

- Mark it as deprecated.
- Keep compatibility when practical.
- Document the replacement.
- Remove only in a future major release.

---

## 13. Git Practices

Recommended branch names:

```
feature/add-memory
feature/new-search
fix/json-parser
docs/update-rules
refactor/workflow-engine
```

Commit messages:

```
feat: add memory retrieval
fix: prevent duplicate events
docs: update installation guide
refactor: simplify workflow routing
```

---

## 14. Quality Standards

Every release should aim to be:

- Reliable
- Predictable
- Readable
- Maintainable
- Reproducible
- Well documented

When making improvements, prefer clarity over cleverness. Consistency is more valuable than novelty.

---

## 15. Guiding Principle

Every change should leave the project easier to understand, easier to maintain, and easier to extend than it was before.
