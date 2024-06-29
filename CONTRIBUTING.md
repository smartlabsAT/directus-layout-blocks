# Contributing Guide

Thank you for your interest in contributing to the Directus Layout Blocks extension! 🎉

## 📚 Table of Contents

<table>
<tr>
<td width="50%">

### 🚀 Getting Started
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)

</td>
<td width="50%">

### 📝 Guidelines
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)

</td>
</tr>
</table>

---

## 🤝 Code of Conduct

This project adheres to the Directus [Code of Conduct](https://github.com/directus/directus/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

### Our Standards

- 🌟 Be respectful and inclusive
- 💡 Welcome newcomers and help them get started
- 🤔 Accept constructive criticism
- 🎯 Focus on what's best for the community
- ❤️ Show empathy towards others

---

## 🎯 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

#### How to Submit a Bug Report

1. **Use the issue template** - Navigate to Issues → New Issue → Bug Report
2. **Provide a clear title** - e.g., "Drag and drop fails in Safari when..."
3. **Describe the bug** - Clear and concise description
4. **Steps to reproduce** - List exact steps to reproduce the behavior
5. **Expected behavior** - What should happen
6. **Screenshots** - If applicable
7. **Environment details**:
   ```
   - Directus Version: 10.x.x
   - Extension Version: 0.0.1-alpha
   - Browser: Chrome 120
   - OS: macOS 14.0
   ```

### 💡 Suggesting Features

Feature suggestions are welcome! Please provide:

1. **Use case** - Why is this feature needed?
2. **Proposed solution** - How should it work?
3. **Alternatives** - Other solutions you've considered
4. **Additional context** - Mockups, examples, etc.

### 🔧 Code Contributions

#### First Time Contributing?

1. Look for issues labeled `good first issue` or `help wanted`
2. Comment on the issue to claim it
3. Ask questions if you need clarification

#### Types of Contributions

- 🐛 **Bug Fixes** - Fix reported issues
- ✨ **Features** - Implement new functionality
- 📚 **Documentation** - Improve docs and examples
- 🧪 **Tests** - Add missing tests
- ♻️ **Refactoring** - Improve code quality
- 🎨 **UI/UX** - Enhance user interface

---

## 🛠️ Development Setup

### Prerequisites

```bash
# Required
node >= 18.0.0
npm >= 9.0.0

# Recommended
git >= 2.30.0
```

### Setup Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/directus-layout-blocks.git
   cd directus-layout-blocks
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/smartlabsAT/directus-layout-blocks.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

6. **Start development**
   ```bash
   npm run dev
   ```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream changes
git checkout develop
git merge upstream/develop

# Update your feature branch
git checkout feature/your-feature
git rebase develop
```

---

## 📁 Project Structure

Understanding the project structure helps you contribute effectively:

```
src/
├── components/       # Vue components
├── composables/      # Reusable logic
├── config/          # Configuration
├── types/           # TypeScript types
├── utils/           # Utilities
└── interface.vue    # Main component
```

### Key Files

| File | Purpose |
|------|---------|
| `interface.vue` | Main component orchestrator |
| `index.ts` | Extension registration |
| `types/index.ts` | All TypeScript definitions |
| `utils/logger.ts` | Debug logging system |

---

## 📝 Coding Standards

### TypeScript

```typescript
// ✅ Good
interface BlockItem {
  id: string | number
  collection: string
  item: Record<string, any>
}

function processBlock(block: BlockItem): void {
  // Implementation
}

// ❌ Bad
function processBlock(block: any) {
  // No type safety
}
```

### Vue Components

```vue
<!-- ✅ Good -->
<script setup lang="ts">
import { computed } from 'vue'
import type { BlockItem } from '../types'

interface Props {
  block: BlockItem
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  update: [block: BlockItem]
}>()
</script>

<!-- ❌ Bad -->
<script>
export default {
  props: ['block', 'disabled'],
  // Options API in new components
}
</script>
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Components** | PascalCase | `BlockItem.vue` |
| **Composables** | use prefix + camelCase | `useBlocks()` |
| **Types/Interfaces** | PascalCase | `BlockConfig` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_BLOCKS` |
| **Functions** | camelCase | `getBlockTitle()` |
| **CSS Classes** | kebab-case with BEM | `block-item__title` |

### Code Quality Checklist

Before submitting code, ensure:

- [ ] ✅ No TypeScript errors (`npm run typecheck`)
- [ ] ✅ No linting errors (`npm run lint`)
- [ ] ✅ Tests pass (`npm test`)
- [ ] ✅ No console.log statements
- [ ] ✅ Comments for complex logic
- [ ] ✅ Proper error handling

---

## 💬 Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add timeline view mode` |
| `fix` | Bug fix | `fix: resolve drag issue in Safari` |
| `docs` | Documentation | `docs: update installation guide` |
| `style` | Code style | `style: format components` |
| `refactor` | Code refactoring | `refactor: extract block utilities` |
| `test` | Tests | `test: add unit tests for validators` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf: optimize render cycles` |

### Examples

```bash
# Feature
feat(drag): add multi-select drag support

Add ability to select and drag multiple blocks at once.
Implements keyboard modifiers for selection.

Closes #123

# Bug Fix
fix(api): handle 404 errors gracefully

Prevent application crash when API returns 404.
Shows user-friendly error message instead.

Fixes #456

# Breaking Change
feat(config)!: change area configuration format

BREAKING CHANGE: Area config now uses objects instead of arrays.
Migration guide included in docs.
```

### Commit Best Practices

1. **Keep commits atomic** - One logical change per commit
2. **Write meaningful messages** - Explain what and why
3. **Reference issues** - Use "Closes #123" or "Fixes #456"
4. **Use present tense** - "Add feature" not "Added feature"

---

## 🔄 Pull Request Process

### Before Creating a PR

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Run all checks**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```

3. **Update documentation**
   - Add/update JSDoc comments
   - Update README if needed
   - Add to CHANGELOG.md

### Creating the PR

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature
   ```

2. **Create PR on GitHub**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch

3. **Fill out the PR template**

### PR Template

```markdown
## Description
<!-- Describe your changes -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change)
- [ ] ✨ New feature (non-breaking change)
- [ ] 💥 Breaking change
- [ ] 📚 Documentation update

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the project style
- [ ] I've performed self-review
- [ ] I've commented complex code
- [ ] I've updated documentation
- [ ] My changes generate no warnings
- [ ] I've added tests for my changes
- [ ] All tests pass locally

## Screenshots
<!-- If applicable -->

## Related Issues
<!-- Link issues: Closes #123, Fixes #456 -->
```

### PR Guidelines

#### DO ✅

- Keep PRs focused and small
- Write descriptive PR titles
- Update tests and docs
- Respond to feedback promptly
- Be patient and respectful

#### DON'T ❌

- Mix unrelated changes
- Submit incomplete work
- Ignore CI failures
- Force push after review
- Close and recreate PRs

### Code Review Process

1. **Automated checks** - CI runs tests and linting
2. **Maintainer review** - Code quality and architecture
3. **Feedback round** - Address review comments
4. **Approval** - Maintainer approves changes
5. **Merge** - PR is merged to develop

---

## 🧪 Testing Requirements

### Test Coverage Goals

- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user workflows

### Writing Tests

#### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { validateAreaConfig } from '@/utils/validators'

describe('validateAreaConfig', () => {
  it('should accept valid config', () => {
    const config = {
      id: 'main',
      label: 'Main Content',
      maxItems: 10
    }
    
    expect(validateAreaConfig(config)).toBe(true)
  })
  
  it('should reject invalid maxItems', () => {
    const config = {
      id: 'main',
      label: 'Main Content',
      maxItems: -1
    }
    
    expect(validateAreaConfig(config)).toBe(false)
  })
})
```

#### Component Test Example

```typescript
import { mount } from '@vue/test-utils'
import BlockItem from '@/components/BlockItem.vue'

describe('BlockItem', () => {
  it('emits update event on edit', async () => {
    const wrapper = mount(BlockItem, {
      props: {
        block: mockBlock
      }
    })
    
    await wrapper.find('[data-test="edit-btn"]').trigger('click')
    
    expect(wrapper.emitted('update')).toBeTruthy()
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test BlockItem.test.ts
```

---

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features
- **PATCH** (0.0.1): Bug fixes

### Release Checklist

1. [ ] All tests pass
2. [ ] Documentation updated
3. [ ] CHANGELOG.md updated
4. [ ] Version bumped in package.json
5. [ ] Release notes prepared
6. [ ] PR approved and merged

---

## 📚 Additional Resources

### Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [API Reference](./API.md)

### Learning Resources

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Directus Extensions](https://docs.directus.io/extensions/introduction.html)

### Getting Help

- 💬 **Discord**: Join #extensions channel
- 🐛 **Issues**: Search/create on GitHub
- 📧 **Email**: For security issues only

---

## 🎉 Recognition

Contributors are recognized in:

- README.md contributors section
- GitHub contributors page
- Release notes

### Types of Recognition

- 🌟 **Code Contributors**: Direct code contributions
- 📚 **Documentation**: Significant docs improvements
- 🐛 **Bug Hunters**: Finding and reporting bugs
- 💡 **Feature Designers**: Proposing implemented features
- 🧪 **Test Writers**: Significant test contributions

---

## 📋 Quick Reference

### Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run typecheck    # Check TypeScript
npm run lint         # Run linter
npm test            # Run tests

# Git
git fetch upstream                    # Get latest changes
git rebase upstream/develop          # Update branch
git commit -m "type: description"    # Commit changes
git push origin feature/name         # Push branch
```

### Files to Update

When adding features:
- [ ] Source code in `src/`
- [ ] Tests in `tests/`
- [ ] Types in `types/index.ts`
- [ ] Documentation in README.md
- [ ] CHANGELOG.md entry

---

Thank you for contributing! 🙏 Your efforts help make this extension better for everyone.

Made with ❤️ by the Directus community