#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==== Gmail Court Document UI Workflow ====${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in the PATH${NC}"
    exit 1
fi

# Make sure exports directory exists
if [ ! -d "exports" ]; then
    echo -e "${YELLOW}Creating exports directory...${NC}"
    mkdir -p exports
    # Create a sample empty export file for testing
    echo '[]' > exports/sample-export.json
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing server dependencies...${NC}"
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}Installing client dependencies...${NC}"
    cd client && npm install && cd ..
fi

# Build the server with TypeScript
echo -e "${YELLOW}Building server...${NC}"
npx tsc

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}TypeScript build failed. Please fix the errors and try again.${NC}"
    exit 1
fi

# Create a concurrently command to run both server and client
echo -e "${GREEN}Starting server and client...${NC}"

# Start with concurrently if available
if npm list -g concurrently &> /dev/null || [ -d "node_modules/concurrently" ]; then
    npx concurrently "node dist/server.js" "cd client && npm start"
else
    # Start server in background
    echo -e "${YELLOW}Starting server...${NC}"
    node dist/server.js &
    SERVER_PID=$!
    
    # Start client
    echo -e "${YELLOW}Starting client...${NC}"
    cd client && npm start &
    CLIENT_PID=$!
    
    # Handle termination
    trap 'kill $SERVER_PID $CLIENT_PID 2>/dev/null' INT TERM
    wait
fi
