#!/bin/bash

# Script to configure Claude Desktop for deployment-tester MCP extension

echo "🔧 Setting up Claude Desktop configuration for deployment-tester..."

# Possible Claude config locations
CLAUDE_CONFIG_LOCATIONS=(
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    "$HOME/.config/Claude/claude_desktop_config.json"
    "$HOME/.anthropic/claude_desktop_config.json"
)

# Find existing config file or determine where to create it
CLAUDE_CONFIG=""
for location in "${CLAUDE_CONFIG_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        CLAUDE_CONFIG="$location"
        echo "✅ Found existing Claude config at: $CLAUDE_CONFIG"
        break
    fi
done

# If no config found, use the standard macOS location
if [ -z "$CLAUDE_CONFIG" ]; then
    CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    echo "📁 Will create new config at: $CLAUDE_CONFIG"
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$CLAUDE_CONFIG")"
fi

# Check if file exists and has content
if [ -f "$CLAUDE_CONFIG" ] && [ -s "$CLAUDE_CONFIG" ]; then
    echo "📝 Existing config file found. Checking for deployment-tester..."
    
    # Check if deployment-tester is already configured
    if grep -q "deployment-tester" "$CLAUDE_CONFIG"; then
        echo "✅ deployment-tester already configured in Claude Desktop"
        echo "Current config:"
        cat "$CLAUDE_CONFIG"
        exit 0
    fi
    
    echo "🔄 Adding deployment-tester to existing configuration..."
    
    # Backup existing config
    cp "$CLAUDE_CONFIG" "${CLAUDE_CONFIG}.backup"
    echo "💾 Backup created: ${CLAUDE_CONFIG}.backup"
    
    # Use Python to merge JSON (more reliable than manual editing)
    python3 -c "
import json
import sys

# Read existing config
try:
    with open('$CLAUDE_CONFIG', 'r') as f:
        config = json.load(f)
except:
    config = {}

# Ensure mcpServers exists
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Add deployment-tester
config['mcpServers']['deployment-tester'] = {
    'command': 'deployment-tester-mcp',
    'env': {}
}

# Write back
with open('$CLAUDE_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)

print('✅ Successfully updated Claude Desktop configuration')
"
else
    echo "📄 Creating new Claude Desktop configuration..."
    
    # Create new config file
    cat > "$CLAUDE_CONFIG" << 'EOF'
{
  "mcpServers": {
    "deployment-tester": {
      "command": "deployment-tester-mcp",
      "env": {}
    }
  }
}
EOF
    
    echo "✅ Created new Claude Desktop configuration"
fi

echo ""
echo "📋 Configuration Summary:"
echo "Config file: $CLAUDE_CONFIG"
echo "Content:"
cat "$CLAUDE_CONFIG"

echo ""
echo "🔄 Next Steps:"
echo "1. Restart Claude Desktop to load the new MCP server"
echo "2. Start your application: npm run dev"  
echo "3. In Claude Code, ask: 'Test my localhost deployment'"

echo ""
echo "🧪 Test MCP server manually:"
echo "echo '{}' | deployment-tester-mcp"