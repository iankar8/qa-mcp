# Deployment Testing Demo

This demonstrates how the MCP extension + subagent work together for comprehensive localhost testing.

## Test Scenario: Next.js Application (prompt-supply)

Let's test our prompt-supply Next.js application at `/Users/iankar/promptsupply/prompt-supply/`:

### Step 1: Framework Detection
```bash
# Using the detect_framework tool
{
  "framework": "Next.js",
  "buildSystem": "Next.js",
  "packageManager": "npm",
  "defaultPort": 3000,
  "healthCheckPath": "/api/health",
  "devCommand": "next dev",
  "buildCommand": "next build",
  "startCommand": "next start",
  "testSuggestions": [
    "Health check: http://localhost:3000/api/health",
    "Homepage: http://localhost:3000/",
    "API routes: Check /api/* endpoints"
  ]
}
```

### Step 2: Health Check Testing
```bash
# Using the health_check tool on multiple endpoints
Endpoints to test:
- http://localhost:3000/ (homepage)
- http://localhost:3000/api/health (if exists)
- http://localhost:3000/api/ai/chat
- http://localhost:3000/api/ai/analyze
- http://localhost:3000/dashboard
- http://localhost:3000/auth/signin
```

### Step 3: Visual Testing
```bash
# Using the capture_screenshot tool
Screenshots to capture:
- Homepage (http://localhost:3000/)
- Dashboard (http://localhost:3000/dashboard)  
- AI Studio (http://localhost:3000/ai-studio)
- Sign-in page (http://localhost:3000/auth/signin)
```

### Step 4: Process Monitoring
```bash
# Using the monitor_process_logs tool
Monitor "node" processes for Next.js development server
Capture logs for 10 seconds during testing
Filter for errors, warnings, and important events
```

### Step 5: Report Generation
```bash
# Using the generate_test_report tool
Generate HTML report with:
- Framework detection results
- Health check status for all endpoints
- Screenshots with annotations
- Log analysis with error categorization
- Performance metrics and recommendations
```

## Expected Workflow in Claude Code

When user says: **"Test my localhost deployment"**

The deployment-testing subagent would:

1. **Auto-detect** the Next.js project structure
2. **Identify** key endpoints based on the src/app structure  
3. **Test health** of localhost:3000 and API routes
4. **Capture screenshots** of main pages
5. **Monitor logs** from the Next.js dev server
6. **Generate report** with comprehensive results

### Sample Interaction:

```
User: I just started my Next.js app with npm run dev. Can you test it?

Claude (deployment-testing subagent):
🚀 I'll test your localhost deployment right away!

✅ Detected Next.js application on localhost:3000
✅ Health check passed: Homepage (127ms response time)  
✅ API endpoints tested: 4/4 passing
✅ Screenshots captured: No console errors detected
✅ Process logs: 23 entries captured, 0 errors
✅ Performance: Average response time 156ms

📊 Generated comprehensive test report: deployment-test-report.html

Your Next.js application is running perfectly! All endpoints are responsive and no issues detected.
```

## Integration Benefits

### For Developers:
- **Instant Feedback**: Know immediately if deployment is working
- **Visual Confirmation**: Screenshots prove the UI is rendering correctly
- **Comprehensive Coverage**: Tests functionality, performance, and logs
- **Framework Awareness**: Adapts testing strategy to your specific tech stack

### For Teams:
- **Consistent Testing**: Same thorough process every time
- **Shareable Reports**: HTML reports can be shared with team members
- **Documentation**: Visual and textual evidence of application state
- **Quality Gates**: Ensures deployments meet standards before proceeding

### For Claude Code:
- **Rich Context**: Screenshots, logs, and health data provide comprehensive information
- **Proactive Suggestions**: Can suggest fixes for any issues discovered
- **Structured Data**: Reports are in formats Claude can easily analyze and act upon
- **Workflow Integration**: Seamlessly fits into development and debugging processes

This hybrid approach maximizes both reproducibility (via the MCP extension) and intelligence (via the subagent), creating a powerful and user-friendly deployment testing solution.