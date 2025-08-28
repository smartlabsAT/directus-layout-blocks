#!/bin/bash

# Qodana Local Analysis Script
# This script runs Qodana code quality analysis locally

echo "🔍 Starting Qodana code quality analysis..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create results directory
mkdir -p qodana-report

# Run Qodana
echo "📊 Running Qodana analysis..."
docker run --rm \
  -v "$PWD":/data/project/ \
  -v "$PWD/qodana-report":/data/results/ \
  jetbrains/qodana-js:latest \
  --show-report

# Check if analysis was successful
if [ $? -eq 0 ]; then
    echo "✅ Qodana analysis completed successfully!"
    echo "📁 Report saved to: qodana-report/"
    
    # Open report if possible
    if [ -f "qodana-report/report.html" ]; then
        echo "📋 Opening report in browser..."
        if command -v open &> /dev/null; then
            open "qodana-report/report.html"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "qodana-report/report.html"
        else
            echo "📍 Report available at: file://$PWD/qodana-report/report.html"
        fi
    fi
else
    echo "❌ Qodana analysis failed!"
    exit 1
fi