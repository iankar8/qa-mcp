# Installation Guide: Deployment Tester MCP Extension + Subagent

This guide will help you set up the complete deployment testing solution for Claude Code.

## 🚀 Quick Setup (Recommended)

### Step 1: Install MCP Extension

**Option A: NPM Global Install**
```bash
npm install -g deployment-tester-mcp
```

**Option B: Manual Build**
```bash
git clone https://github.com/your-org/deployment-tester-mcp
cd deployment-tester-mcp
npm install
npm run build
npm link  # Makes it globally available
```

### Step 2: Configure Claude Code MCP

Add the MCP server to your Claude Code configuration:

**macOS/Linux:** `~/.anthropic/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "deployment-tester": {
      "command": "deployment-tester-mcp",
      "env": {}
    }
  }
}
```

### Step 3: Install Subagent

Download the subagent file:
```bash
# Create subagents directory if it doesn't exist
mkdir -p ~/.anthropic/subagents

# Download the subagent file
curl -o ~/.anthropic/subagents/deployment-testing.md https://raw.githubusercontent.com/your-org/deployment-tester-mcp/main/deployment-testing.md
```

Or manually copy `deployment-testing.md` to your subagents directory.

### Step 4: Restart Claude Code

Restart Claude Desktop/Claude Code to load the new MCP server and subagent.

## ✅ Verify Installation

Test that everything is working:

```bash
# Start your application
npm run dev

# In Claude Code, ask:
"Test my localhost deployment"
```

The `deployment-testing` subagent should automatically activate and use the MCP tools to:
1. Detect your framework
2. Run health checks
3. Capture screenshots  
4. Monitor logs
5. Generate a comprehensive report

## 🔧 Advanced Configuration

### Custom Port Configuration

If your application runs on a non-standard port, the framework detection will adapt automatically. You can also specify ports manually in your testing requests.

### Framework-Specific Setup

**Next.js Projects:**
Add a health check API route for better monitoring:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
}
```

**React Projects:**
No special setup required - the system will test your main routes and capture visual evidence.

**Node.js/Express Projects:**
Add a health endpoint:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Custom Subagent Configuration

You can modify the `deployment-testing.md` subagent to customize:
- Which tools to use
- Testing priorities
- Report formatting
- Communication style

## 🐛 Troubleshooting

### MCP Extension Not Found

```bash
# Check if globally installed
npm list -g deployment-tester-mcp

# Reinstall if needed
npm uninstall -g deployment-tester-mcp
npm install -g deployment-tester-mcp
```

### Subagent Not Activating

1. Verify the file is in the correct location: `~/.anthropic/subagents/deployment-testing.md`
2. Check that the YAML frontmatter is correctly formatted
3. Restart Claude Desktop/Claude Code

### Health Checks Failing

1. Ensure your application is running (`npm run dev` or `npm start`)
2. Check that the detected port is correct
3. Verify firewall/security settings aren't blocking requests

### Screenshot Issues

1. Ensure system has necessary dependencies for Puppeteer
2. On Linux: `sudo apt-get install chromium-browser`
3. On macOS: Usually works out of the box
4. Check that localhost is accessible

### Process Log Monitoring

The current implementation includes a simulation mode. For production use, you can extend it to connect to:
- PM2 logs: `pm2 logs --json`
- Docker logs: `docker logs container-name`
- Application log files
- System logs

## 🔄 Updating

Update both components when new versions are available:

```bash
# Update MCP extension
npm update -g deployment-tester-mcp

# Update subagent
curl -o ~/.anthropic/subagents/deployment-testing.md https://raw.githubusercontent.com/your-org/deployment-tester-mcp/main/deployment-testing.md
```

## 📚 Usage Examples

### Basic Testing
```
"Test my Next.js app"
"Check my React deployment"
"Monitor my Node.js server"
```

### Specific Testing
```
"Take a screenshot of localhost:3000"
"Check the health of localhost:8080/api"
"Monitor logs for the next 30 seconds"
```

### Report Generation
```
"Run a full deployment test and generate an HTML report"
"Test all my endpoints and show me the results"
```

## 🤝 Integration with Development Workflow

Add to your development scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "test:deployment": "echo 'Ask Claude Code: Test my localhost deployment'",
    "build": "next build && echo 'Ask Claude Code: Test my production build'"
  }
}
```

This creates a seamless integration where Claude Code can automatically suggest deployment testing at key development moments.