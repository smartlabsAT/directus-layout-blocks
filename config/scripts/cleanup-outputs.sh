#!/bin/bash

# Cleanup Script for Test Outputs and Temporary Files

echo "🧹 Starting cleanup..."

# Function to safely remove directories
safe_remove() {
    if [ -d "$1" ]; then
        echo "  Removing $1..."
        rm -rf "$1"
    fi
}

# Function to safely remove files
safe_remove_file() {
    if [ -f "$1" ]; then
        echo "  Removing $1..."
        rm -f "$1"
    fi
}

# Clean test outputs
echo "📁 Cleaning test outputs..."
safe_remove "test-output"
safe_remove "coverage"
safe_remove ".nyc_output"
safe_remove "test-results"

# Clean build artifacts
echo "🏗️ Cleaning build artifacts..."
safe_remove "dist"
safe_remove ".tsbuildinfo"
safe_remove ".tsbuildinfo-strict"
safe_remove ".tsbuildinfo-quality"

# Clean dependency artifacts
echo "📦 Cleaning dependency artifacts..."
safe_remove "node_modules/.cache"
safe_remove ".pnpm-store"

# Clean IDE and system files
echo "💻 Cleaning IDE and system files..."
safe_remove_file ".DS_Store"
safe_remove_file "Thumbs.db"
safe_remove ".idea"
safe_remove ".vscode/.history"

# Clean temporary files
echo "🗑️ Cleaning temporary files..."
safe_remove "tmp"
safe_remove "temp"
safe_remove ".tmp"
safe_remove ".temp"

# Clean Qodana reports
echo "📊 Cleaning Qodana reports..."
safe_remove "qodana-report"
safe_remove ".qodana"

# Clean log files
echo "📝 Cleaning log files..."
safe_remove_file "*.log"
safe_remove_file "npm-debug.log*"
safe_remove_file "pnpm-debug.log*"
safe_remove_file "yarn-debug.log*"
safe_remove_file "lerna-debug.log*"

# Create fresh test-output directories
echo "📁 Creating fresh test-output directories..."
mkdir -p test-output/coverage
mkdir -p test-output/reports
mkdir -p test-output/screenshots

echo "✅ Cleanup completed!"
echo ""
echo "📊 Directory status:"
echo "  - test-output/ : ready for new test results"
echo "  - dist/        : ready for new build"
echo "  - node_modules/.cache : cleared"
echo ""
echo "💡 Run 'npm run build' to create a fresh build"
echo "💡 Run 'npm test' to generate new test results"