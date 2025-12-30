# Contributing to Fusion Stage Hub

Thank you for your interest in contributing to Fusion Stage Hub! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Issue Reporting](#issue-reporting)
8. [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or inappropriate comments
- Trolling, insulting, or derogatory remarks
- Publishing others' private information
- Other conduct deemed unprofessional

Report violations to the project maintainers.

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **npm** 9+ or **bun** (optional, faster)
- **Git** for version control
- **Supabase CLI** (for database work)

### Fork and Clone

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/fusion-stage-hub.git
   cd fusion-stage-hub
   ```

3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/Krosebrook/fusion-stage-hub.git
   ```

### Environment Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials (ask maintainers for dev credentials or create your own project).

3. **Run database migrations** (if working on backend):
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   supabase db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   
   Open `http://localhost:8080` in your browser.

---

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation updates
- `refactor/description`: Code refactoring

### Creating a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout develop
git merge upstream/develop

# Create feature branch
git checkout -b feature/amazing-feature
```

### Making Changes

1. **Write code** following our [coding standards](#coding-standards)
2. **Test your changes** (unit + integration tests)
3. **Lint and type-check**:
   ```bash
   npm run lint
   npm run build  # Ensures TypeScript compiles
   ```
4. **Commit** with clear messages (see [Commit Messages](#commit-messages))
5. **Push** to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```

### Staying Up to Date

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git checkout feature/amazing-feature
git rebase upstream/develop

# Resolve conflicts if any, then:
git push origin feature/amazing-feature --force-with-lease
```

---

## Coding Standards

### TypeScript

- **Use TypeScript** for all new files
- **Strict mode** enabled (no `any` types unless absolutely necessary)
- **Use interfaces** for object shapes, **types** for unions/primitives
- **Prefer** `const` over `let`, avoid `var`

**Example:**
```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): User | null {
  // ...
}

// Bad
function getUser(id: any): any {
  // ...
}
```

### React

- **Functional components** only (no class components)
- **Use hooks** for state and side effects
- **Destructure props** for clarity
- **Memoize expensive computations** with `useMemo`
- **Memoize callbacks** passed to children with `useCallback`

**Example:**
```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// Bad
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### File Organization

```
src/
├── components/
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── layout/          # Layout components (AppLayout, Header, Sidebar)
│   ├── dashboard/       # Dashboard-specific components
│   ├── jobs/            # Job-related components
│   └── [feature]/       # Feature-specific components
├── pages/               # Route pages (one per route)
├── hooks/               # Custom React hooks
├── lib/                 # Utilities, helpers, constants
└── integrations/        # External service integrations
    └── supabase/        # Supabase client and types
```

### Naming Conventions

- **Components**: PascalCase (`MetricCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useJobQueue.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`JobStatus`, `UserProfile`)

### Imports

Use **absolute imports** with `@/` alias:

```typescript
// Good
import { Button } from "@/components/ui/button";
import { useJobQueue } from "@/hooks/useJobQueue";

// Bad
import { Button } from "../../components/ui/button";
```

**Import order**:
1. React and external libraries
2. Internal components
3. Hooks
4. Utilities
5. Types
6. Styles

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useJobQueue } from "@/hooks/useJobQueue";
import { formatDate } from "@/lib/utils";
import type { Job } from "@/integrations/supabase/types";
```

### Comments

- **Avoid obvious comments**
- **Use JSDoc** for public functions
- **Explain "why"**, not "what"

```typescript
// Good
/**
 * Calculates exponential backoff delay for job retries.
 * @param attempt - The attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function exponentialBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 60000); // Cap at 1 minute
}

// Bad
// This function calculates the delay
function calculateDelay(a: number) {
  return 1000 * Math.pow(2, a); // multiply by 2
}
```

---

## Testing Guidelines

### Test Structure

We use **Vitest** for unit tests and **Playwright** for E2E tests.

```
src/
├── components/
│   └── Button.tsx
│   └── Button.test.tsx     # Co-located tests
├── hooks/
│   └── useJobQueue.ts
│   └── useJobQueue.test.ts
tests/
└── e2e/
    └── auth.spec.ts
```

### Writing Unit Tests

```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with label", () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button label="Click" onClick={onClick} />);
    screen.getByText("Click").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Test Coverage Goals

- **Unit tests**: 70%+ coverage
- **Integration tests**: Critical user flows
- **E2E tests**: Happy paths and major features

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Lint and type-check pass
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions
- [ ] Branch rebased on latest `develop`

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(jobs): add retry button to failed jobs
fix(auth): handle expired tokens correctly
docs(readme): add setup instructions
refactor(components): extract MetricCard component
test(approval): add approval workflow tests
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, whitespace)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### PR Description Template

```markdown
## Description
Brief description of changes.

## Motivation and Context
Why is this change needed? What problem does it solve?

## Changes Made
- List key changes
- Bullet points preferred

## Screenshots (if UI changes)
[Add screenshots here]

## Testing Done
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated checks** must pass (tests, lint, build)
2. **At least 1 approval** from maintainers required
3. **Address review comments** or explain why not
4. **Squash and merge** (maintainers will do this)

---

## Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(jobs): add manual retry functionality

Users can now manually retry failed jobs from the Jobs page.
This includes a new "Retry" button on each job row and a
confirmation dialog to prevent accidental retries.

Closes #42
```

### Guidelines

- **Subject line**: 50 chars max, imperative mood ("add" not "added")
- **Body**: Wrap at 72 chars, explain what and why
- **Footer**: Reference issues (`Closes #123`, `Fixes #456`)

---

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- **Description**: What happened vs. what you expected
- **Steps to reproduce**: Detailed steps
- **Environment**: OS, browser, Node version
- **Screenshots**: If applicable
- **Logs**: Console errors, stack traces

### Feature Requests

Use the feature request template and include:

- **Problem**: What problem does this solve?
- **Proposed solution**: Your idea
- **Alternatives**: Other solutions considered
- **Additional context**: Mockups, examples

### Good First Issues

Look for issues labeled `good first issue` or `help wanted` to get started.

---

## Community

### Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bugs and feature requests
- **Discord** (coming soon): Real-time chat

### Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- GitHub contributor graphs

---

## Development Tips

### Debugging

- Use **React DevTools** for component inspection
- Use **TanStack Query DevTools** for query debugging
- Use **Supabase Studio** for database queries

### Performance

- Use **React DevTools Profiler** to identify slow renders
- Use **Chrome DevTools Performance** tab for runtime analysis
- Lazy load pages with `React.lazy` for code splitting

### VS Code Extensions (Recommended)

- **ESLint**: Real-time linting
- **Prettier**: Code formatting
- **TypeScript** (built-in): Type checking
- **Tailwind CSS IntelliSense**: Tailwind autocomplete
- **Error Lens**: Inline error display

---

## Questions?

If you have questions not covered here:

1. Check [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Search existing [GitHub Issues](https://github.com/Krosebrook/fusion-stage-hub/issues)
3. Ask in [GitHub Discussions](https://github.com/Krosebrook/fusion-stage-hub/discussions)

---

**Thank you for contributing!** 🎉

Your time and effort make this project better for everyone.
