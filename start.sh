#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==== Gmail Exporter Application ====${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in the PATH${NC}"
    exit 1
fi

# Make sure required directories exist
if [ ! -d "exports" ]; then
    echo -e "${YELLOW}Creating exports directory...${NC}"
    mkdir -p exports
    # Create a properly structured sample export file for testing
    echo '{"metadata":{"created":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'","resultCount":0},"emails":[]}' > exports/sample-export.json
fi

# Create projects directory
if [ ! -d "projects" ]; then
    echo -e "${YELLOW}Creating projects directory...${NC}"
    mkdir -p projects
    # Create a sample projects.json file
    echo '{"projects":[{"id":"sample-project","name":"Sample Project","created":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'","exportFiles":["sample-export.json"],"description":"A sample project created by the startup script."}]}' > projects/projects.json
fi

# Create reports directory
if [ ! -d "reports" ]; then
    echo -e "${YELLOW}Creating reports directory...${NC}"
    mkdir -p reports
    # Create a sample report file
    touch reports/sample-report.pdf
fi

# Create or check .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env file. Please edit it with your API credentials.${NC}"
    else
        echo -e "${RED}.env.example not found. Creating minimal .env file...${NC}"
        echo "# Google API credentials\nCLIENT_ID=your_client_id_here\nCLIENT_SECRET=your_client_secret_here\nMOCK_GMAIL_API=true" > .env
        echo -e "${YELLOW}Created minimal .env file with MOCK_GMAIL_API=true for testing.${NC}"
    fi
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
