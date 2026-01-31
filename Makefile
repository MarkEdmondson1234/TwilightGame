# Makefile for TwilightGame
# Provides convenient shortcuts for common development tasks

.PHONY: help install dev build preview optimize-assets typecheck clean test-game reload firebase-login firebase-deploy firebase-rules

# Default target - show help
help:
	@echo "TwilightGame Development Commands"
	@echo "================================="
	@echo ""
	@echo "  make install         Install dependencies"
	@echo "  make dev             Start development server (port 4000)"
	@echo "  make build           Build for production"
	@echo "  make preview         Preview production build"
	@echo "  make optimize-assets Optimise images (runs before build)"
	@echo "  make typecheck       Check TypeScript for errors"
	@echo "  make clean           Remove build artifacts"
	@echo "  make reload          Restart dev server (fixes HMR cascade hangs)"
	@echo "  make test-game       Launch game tester agent in Chrome"
	@echo ""
	@echo "Firebase Commands"
	@echo "-----------------"
	@echo "  make firebase-login  Login to Firebase CLI"
	@echo "  make firebase-deploy Deploy Firestore rules"
	@echo ""

# Install dependencies
install:
	npm install

# Start development server (port 4000)
dev:
	npm run dev

# Build for production (runs optimize-assets first)
build:
	npm run build

# Preview production build
preview:
	npm run preview

# Optimise images using Sharp
optimize-assets:
	npm run optimize-assets

# Check TypeScript for errors (no emit)
typecheck:
	npx tsc --noEmit

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf node_modules/.vite

# Reload dev server (kills existing, clears cache, restarts)
# Use this after large changes (git pull, Claude edits) when HMR gets overwhelmed
# Cross-platform: works on macOS, Linux, and Windows
reload:
	npm run dev:reload

# Launch game tester agent in Chrome (requires dev server running)
test-game:
	@echo "Launching game tester agent..."
	@echo "NOTE: Ensure dev server is running (make dev)"
	@echo "Opening http://localhost:4000"
	@open http://localhost:4000 || xdg-open http://localhost:4000 || echo "Please open http://localhost:4000 in your browser"

# ============================================
# Firebase Commands
# ============================================

# Login to Firebase CLI
firebase-login:
	npx firebase-tools login
	npx firebase-tools use twiightgame

# Deploy Firestore rules to Firebase
firebase-deploy:
	npx firebase-tools deploy --only firestore:rules --project twiightgame

# Alias for firebase-deploy
firebase-rules: firebase-deploy
