# Contributing to Hansoom

Thanks for your interest in contributing! Here's how to get started.

## Development Environment

```bash
git clone https://github.com/hansoom-dev/soom.git
cd soom
bun install
bun test          # run tests
bun run dev render examples/simple.mmd -o /tmp/preview.html  # test locally
```

Requires [Bun](https://bun.sh/) >= 1.0.0. Also compatible with Node >= 18.

## Branch Naming

All work happens on feature branches off `main`. Never commit directly to `main`.

```
<type>/<short-description>

Types:
  feat/     — new feature
  fix/      — bug fix
  chore/    — tooling, config, deps, CI
  refactor/ — code restructuring
  docs/     — documentation
  test/     — tests
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

Scopes: `cli`, `parser`, `graph`, `sequencer`, `renderer`, `animation`, `themes`, `ci`, `deps`

Each commit should be atomic — one logical change per commit.

## Pull Requests

1. Branch from `main`
2. Make your changes with atomic commits
3. Run `bun run format` before committing
4. Push and open a PR — CI must pass before merge
5. PRs are squash-merged to `main`; branches are deleted after merge

## Code Style

Prettier and ESLint handle formatting and linting automatically:

```bash
bun run format       # auto-format
bun run lint         # check lint rules
bun run format:check # verify formatting (CI runs this)
```

Don't manually fix style issues — just run the formatters.

## Proposing Features

Significant features or architectural changes should be discussed in a [GitHub Issue](https://github.com/hansoom-dev/soom/issues) before implementation. This avoids wasted effort on approaches that don't align with the project direction.

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
