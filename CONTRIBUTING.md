# Contributing to HackEval 🚀

Thank you for your interest in contributing to **HackEval**! We are thrilled to welcome developers, designers, AI researchers, and technical writers of all experience levels to help build the future of automated hackathon evaluation.

This project is actively maintained by [@Trivo121](https://github.com/Trivo121).

Please take a few moments to review this guide before submitting issues or creating Pull Requests.

---

## 📜 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features & Enhancements](#suggesting-features--enhancements)
  - [Working on Good First Issues](#working-on-good-first-issues)
- [Development Workflow](#-development-workflow)
  - [1. Fork & Clone](#1-fork--clone)
  - [2. Branch Naming](#2-branch-naming)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
  - [5. Full-Stack with Docker Compose](#5-full-stack-with-docker-compose)
- [Code Style & Best Practices](#-code-style--best-practices)
- [Submitting a Pull Request](#-submitting-a-pull-request)
- [Questions & Support](#-questions--support)

---

## 🛡️ Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code to foster an open, welcoming, and inclusive community.

---

## 💡 How Can I Contribute?

### Reporting Bugs
If you find a bug, please check the [existing issues](https://github.com/Trivo121/hackeval/issues) first to make sure it hasn't already been reported. If not, open a new issue using our **Bug Report** template with:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected vs. actual results.
- Relevant logs, error traces, and environment details.

### Suggesting Features & Enhancements
Feature requests are always welcome! Open an issue with the **Feature Request** template describing:
- The problem or use case.
- Proposed solution or architecture change.
- Any alternative solutions considered.

### Working on "Good First Issues"
If you are looking for somewhere to start, look for issues labeled `good first issue` or `help wanted`. Here are some great areas where we'd love contributions:
- **LLM Integrations**: Add alternative evaluator model providers (e.g., Groq, Gemini API, Claude API, OpenAI) as fallback options when local vLLM isn't running.
- **Parser Enhancements**: Improve PDF slide table extraction using Docling or hybrid heuristics.
- **Frontend Enhancements**: Add submission search filters, CSV/Excel export for final leaderboard grades, or real-time status indicators.
- **Testing**: Add unit tests for Celery task pipelines, PDF parsers, and FastAPI endpoints.
- **Documentation**: Improve setup instructions, API specs, or deployment tutorials.

---

## 🛠️ Development Workflow

### 1. Fork & Clone
1. Fork the repository on GitHub: click **Fork** at `https://github.com/Trivo121/hackeval`.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/hackeval.git
   cd hackeval
   ```
3. Set up the upstream remote to stay synced with main:
   ```bash
   git remote add upstream https://github.com/Trivo121/hackeval.git
   ```

### 2. Branch Naming
Create a dedicated branch for your work:
```bash
# For new features
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/issue-description

# For documentation updates
git checkout -b docs/readme-enhancements
```

### 3. Backend Setup
The backend is built with **FastAPI**, **Celery**, and **Python 3.10+**.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase, Qdrant, and Redis credentials
   ```
5. Start Redis (locally or via Docker):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```
6. Start the FastAPI API server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
7. In a separate terminal, start the Celery worker:
   ```bash
   celery -A app.celery_app worker --loglevel=info -Q extraction,embedding -P solo
   ```

### 4. Frontend Setup
The frontend is built with **React** and **Tailwind CSS**.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Ensure REACT_APP_API_URL and Supabase keys match your setup
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   The application will be accessible at `http://localhost:3000`.

### 5. Full-Stack with Docker Compose
To run Redis, the API, and Celery workers together in Docker:
```bash
cd backend
docker-compose up --build
```

---

## 🎨 Code Style & Best Practices

- **Python**: Follow [PEP 8](https://peps.python.org/pep-0008/). Use type annotations where possible. Keep functions modular and maintain docstrings.
- **JavaScript / React**: Follow standard React hook rules and maintain clean, accessible component structures. Use functional components and descriptive prop names.
- **Security**: Never commit API keys, service role tokens, or secrets. Always use `.env` and verify changes with `git status` before committing.
- **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add fallback provider for Gemini LLM evaluator`
  - `fix: resolve PDF slide table parsing crash on scanned images`
  - `docs: update setup instructions in README`
  - `refactor: clean up supabase client initialization`

---

## 🚀 Submitting a Pull Request

When your changes are ready:

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Open a Pull Request**:
   - Go to `https://github.com/Trivo121/hackeval`.
   - Click **Compare & pull request**.
   - Fill out the PR template with a clear description of what changed and why.
   - Link related issues (e.g., `Fixes #42` or `Relates to #15`).
4. **Code Review**:
   - The maintainer ([@Trivo121](https://github.com/Trivo121)) will review your PR, provide constructive feedback, and merge once ready!

---

## 📬 Questions & Support

If you have questions, need clarification, or want to discuss ideas before coding:
- Open a GitHub [Discussion or Issue](https://github.com/Trivo121/hackeval/issues).
- Reach out to the maintainer: **Viswa** ([@Trivo121](https://github.com/Trivo121) | `viswa225574@gmail.com`).

We appreciate your contributions to HackEval! 🎉
