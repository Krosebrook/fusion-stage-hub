# Contributing to FlashFusion

First off, thank you for considering contributing to FlashFusion! It's people like you that make FlashFusion such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We pledge to make participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows, macOS, Linux]
 - Browser: [e.g. Chrome, Safari]
 - Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

**Enhancement Template:**
```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fusion-stage-hub.git
   cd fusion-stage-hub
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

   Branch naming conventions:
   - `feature/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation changes
   - `refactor/` - Code refactoring
   - `test/` - Adding or updating tests
   - `chore/` - Maintenance tasks

3. **Set Up Development Environment**
   ```bash
   npm install
   npm run dev
   ```

4. **Make Your Changes**
   - Write clear, commented code
   - Follow the existing code style
   - Update documentation as needed
   - Add tests if applicable

5. **Test Your Changes**
   ```bash
   npm run lint
   npm run build
   ```

6. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

7. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template
   - Wait for review

## Development Guidelines

### Code Style

We use ESLint to enforce code style. Before submitting, ensure your code passes linting:

```bash
npm run lint
```

#### TypeScript Guidelines

- **Always use TypeScript** for new files
- **Define interfaces** for all props and data structures
- **Avoid `any` type** - use specific types or `unknown`
- **Use strict mode** settings in tsconfig
- **Export types** alongside components

Example:
```typescript
// Good
interface UserProps {
  id: string;
  name: string;
  email: string;
}

export function UserCard({ id, name, email }: UserProps) {
  // implementation
}

// Bad
export function UserCard(props: any) {
  // implementation
}
```

#### React Guidelines

- **Use functional components** with hooks
- **Destructure props** in function parameters
- **Use meaningful component names** (PascalCase)
- **Keep components small** (< 200 lines)
- **Extract logic** into custom hooks when appropriate

Example:
```typescript
// Good
export function ProductList({ products, onSelect }: ProductListProps) {
  const [selected, setSelected] = useState<string[]>([]);
  
  return (
    // JSX
  );
}

// Bad
export default function Component(props) {
  return <div>{props.data}</div>;
}
```

#### Component Structure

Organize components consistently:

```typescript
// 1. Imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Types/Interfaces
interface ComponentProps {
  title: string;
}

// 3. Constants
const MAX_ITEMS = 10;

// 4. Component
export function Component({ title }: ComponentProps) {
  // Hooks
  const [state, setState] = useState(false);
  
  // Derived state
  const computedValue = state ? "yes" : "no";
  
  // Handlers
  const handleClick = () => {
    setState(!state);
  };
  
  // Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>{computedValue}</Button>
    </div>
  );
}
```

### File Organization

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (don't modify)
│   ├── layout/          # Layout components
│   ├── [feature]/       # Feature-specific components
│   └── ComponentName.tsx
├── pages/
│   └── PageName.tsx     # One file per route
├── hooks/
│   └── use-hook-name.ts # Custom hooks
├── lib/
│   └── utils.ts         # Utility functions
└── integrations/
    └── service/         # External service clients
```

### Testing Guidelines

When adding tests:

1. **Place tests** next to the code they test
2. **Use descriptive names** for test cases
3. **Test behavior**, not implementation
4. **Mock external dependencies**
5. **Keep tests focused** and simple

Example:
```typescript
describe('ProductCard', () => {
  it('should display product title', () => {
    // test implementation
  });
  
  it('should call onSelect when clicked', () => {
    // test implementation
  });
});
```

### Documentation

- **Update README.md** if you change functionality
- **Add JSDoc comments** for complex functions
- **Update CHANGELOG.md** following Keep a Changelog format
- **Include examples** in documentation
- **Keep docs in sync** with code

Example:
```typescript
/**
 * Formats a price value for display
 * @param price - The numeric price value
 * @param currency - The currency code (default: USD)
 * @returns Formatted price string (e.g., "$29.99")
 */
export function formatPrice(price: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}
```

## Project Structure

### Key Directories

- **`src/components/`**: Reusable UI components
- **`src/pages/`**: Top-level route components
- **`src/hooks/`**: Custom React hooks
- **`src/lib/`**: Utility functions and helpers
- **`src/integrations/`**: External service integrations
- **`public/`**: Static assets

### Adding New Features

1. **Create components** in appropriate directory
2. **Add types** in component file or separate `.types.ts`
3. **Update routing** if adding new pages
4. **Add navigation** links if needed
5. **Write tests** for new functionality
6. **Update documentation**

### Component Guidelines

#### UI Components (`src/components/ui/`)
- These are from shadcn/ui
- **Don't modify** directly
- If customization needed, wrap or extend

#### Feature Components (`src/components/[feature]/`)
- Group by feature (dashboard, jobs, approvals, etc.)
- Keep feature-specific components together
- Reuse UI components from `ui/`

#### Page Components (`src/pages/`)
- One file per route
- Import and compose feature components
- Handle route-level data fetching
- Wrap in AppLayout

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance (dependencies, config, etc.)

**Examples:**
```
feat(dashboard): add real-time metric updates

fix(jobs): resolve retry logic for failed jobs

docs(readme): update installation instructions

refactor(approvals): extract approval card to separate component

test(products): add unit tests for product filtering
```

## Review Process

1. **Automated Checks**: CI will run linting and builds
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, PR will be merged
5. **Release**: Changes included in next release

### What We Look For

- **Code quality**: Clean, readable, maintainable
- **Tests**: Adequate test coverage
- **Documentation**: Updated where needed
- **Breaking changes**: Clearly documented
- **Performance**: No unnecessary performance impacts

## Getting Help

- **Documentation**: Check the `/docs` directory
- **Issues**: Search existing issues first
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community server (if available)

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to FlashFusion! 🚀
