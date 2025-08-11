# 🧪 QA MCP - Comprehensive Localhost Quality Assurance

A comprehensive MCP (Model Context Protocol) extension for automated QA testing of localhost applications. Designed for Claude Code to provide intelligent bug detection, console monitoring, and detailed issue reporting.

## 🎯 What It Does

**QA MCP** transforms localhost testing from manual checking into **automated, comprehensive quality assurance**:

### ✅ **Health Check & Diagnostics**
- **Detailed failure analysis** when localhost isn't working
- **Specific error diagnosis**: ECONNREFUSED, timeouts, HTTP errors  
- **Step-by-step troubleshooting** with exact commands to fix issues

### ✅ **Real-Time Console Monitoring**
- **JavaScript error detection** with stack traces
- **Network failure analysis** (404s, 500s, CORS issues)
- **Security warning detection** (Mixed content, CSP violations)
- **Performance bottleneck identification**

### ✅ **Comprehensive Functional QA**
- **Form testing** and validation checks
- **Navigation link verification** 
- **Responsive design testing** across device sizes
- **Accessibility auditing** (missing alt text, form labels)
- **Custom user flow testing**

### ✅ **Professional Bug Reports**
- **Issue categorization** by severity (Critical/Major/Minor)
- **Root cause analysis** with specific fix recommendations
- **Visual evidence** via automated screenshots
- **Actionable priority rankings** for development planning

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g qa-mcp

# Or clone and build locally
git clone https://github.com/iankar8/qa-mcp.git
cd qa-mcp
npm install
npm run build
npm link
```

### Claude Code Configuration

Add to your Claude Desktop config (`~/.anthropic/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "qa-mcp": {
      "command": "qa-mcp",
      "env": {}
    }
  }
}
```

### Install the QA Engineer Subagent

```bash
# Copy the subagent to Claude Code
cp qa-engineer.md ~/.anthropic/subagents/
```

### Usage

1. **Start your application:**
   ```bash
   npm run dev  # or npm start
   ```

2. **In Claude Code, ask:**
   ```
   "QA test my localhost application"
   ```

## 🛠️ Available Tools

### `health_check`
Advanced endpoint testing with detailed failure analysis:
```javascript
health_check({
  url: "http://localhost:3000",
  timeout: 10000,
  expectedStatus: 200
})
```

### `console_monitor`
Real-time console monitoring with error categorization:
```javascript
console_monitor({
  url: "http://localhost:3000",
  duration: 30000,
  filters: {
    errors: true,
    warnings: true,
    network: true,
    security: true
  }
})
```

### `functional_qa`
Comprehensive functional testing suite:
```javascript
functional_qa({
  url: "http://localhost:3000",
  testSuite: "comprehensive", // basic, auth, forms, navigation, responsive
  userFlows: [
    {
      name: "User Signup",
      steps: [
        { action: "goto", value: "/auth/signup" },
        { action: "type", selector: "#email", value: "test@example.com" },
        { action: "click", selector: "#signup-button" },
        { action: "verify", selector: "#success", expected: "Account created" }
      ]
    }
  ]
})
```

### Other Tools
- `capture_screenshot` - Visual evidence collection
- `detect_framework` - Automatic framework detection
- `test_endpoints` - Batch endpoint testing
- `generate_test_report` - Comprehensive HTML/JSON reports

## 📋 Example Workflows

### Broken Application Diagnosis
```
User: "My localhost isn't working"

QA Engineer: 🚨 CRITICAL ISSUE DETECTED
❌ Health check FAILED: connect ECONNREFUSED 127.0.0.1:3000

🛠️ IMMEDIATE ACTIONS REQUIRED:
1. Start development server: npm run dev
2. Check if port 3000 is correct  
3. Verify server configuration

💡 RECOMMENDED: cd /your/project && npm run dev
```

### Comprehensive QA Testing
```
User: "QA test my localhost thoroughly"

QA Engineer: ✅ Starting comprehensive QA analysis...

📊 QA RESULTS:
- Total Tests: 15
- Passed: 12 ✅  
- Failed: 3 ❌
- Critical Issues: 1 🚨
- Major Issues: 2 ⚠️

🚨 CRITICAL: JavaScript error breaks chat functionality
⚠️ MAJOR: Form validation allows invalid emails
📝 MINOR: Missing alt text on 3 images

📋 Full report generated: qa-report-2024-01-15.html
```

## 🧠 Smart Features

### **Framework-Aware Testing**
- **Next.js**: API route testing, SSR validation
- **React**: Component rendering, console errors
- **Vue.js**: Reactive updates, dev tools
- **Express**: Route testing, middleware validation
- **Generic**: Universal HTTP health checks

### **Intelligent Issue Detection**
- **JavaScript Errors**: Automatic categorization and stack traces
- **Network Failures**: Request/response analysis with suggestions
- **UI Problems**: Layout issues, responsive design failures
- **Performance**: Memory leaks, slow queries, bundle analysis

### **Automated Categorization**
- **Critical**: Breaks core functionality, prevents usage
- **Major**: Significantly impacts user experience
- **Minor**: Polish improvements, accessibility enhancements

## 📊 Sample QA Report

```html
🧪 QA Test Report
Framework: Next.js | Generated: 2024-01-15 14:30:21

📊 QA Summary:
Total Tests: 15 | Passed: 12 | Failed: 3
Critical: 1 | Major: 2 | Minor: 4

🐛 Issues Found:
🚨 CRITICAL: TypeError in /api/chat - Chat functionality broken
⚠️ MAJOR: Form validation bypassed on signup page  
⚠️ MAJOR: Navigation link returns 404: /pricing
📝 MINOR: Missing alt text on product images
📝 MINOR: Page titles missing for SEO
📝 MINOR: Slow API response: /api/analyze (2.1s)
📝 MINOR: Form labels missing for accessibility

🖥️ Console Monitoring: 1 error, 2 warnings detected
🧪 Functional QA: 12/15 tests passed
📸 Visual Evidence: 4 screenshots captured
```

## 🤝 Framework Support

| Framework | Health Checks | Console Monitoring | Functional Testing | Performance |
|-----------|---------------|-------------------|-------------------|-------------|
| Next.js   | ✅ API routes  | ✅ SSR errors     | ✅ Full suite     | ✅ Bundle   |
| React     | ✅ Dev server  | ✅ Component errors| ✅ UI testing    | ✅ Memory   |
| Vue.js    | ✅ Dev server  | ✅ Reactive issues | ✅ Component tests| ✅ Performance |
| Express   | ✅ Endpoints   | ✅ Server errors   | ✅ Route testing | ✅ Response |
| Generic   | ✅ HTTP checks | ✅ JS errors       | ✅ Basic testing | ✅ Load times |

## 📚 Documentation

- [Installation Guide](INSTALLATION.md) - Complete setup instructions
- [QA Demo](QA_DEMO.md) - Comprehensive usage examples  
- [Tool Reference](docs/tools.md) - Detailed API documentation
- [Examples](examples/) - Sample configurations and workflows

## 🔧 Development

```bash
# Clone repository
git clone https://github.com/iankar8/qa-mcp.git
cd qa-mcp

# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Run tests
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/iankar8/qa-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/iankar8/qa-mcp/discussions)
- **Documentation**: [GitHub Wiki](https://github.com/iankar8/qa-mcp/wiki)

## 🌟 Features at a Glance

| Feature | Description | Benefit |
|---------|-------------|---------|
| 🏥 Health Diagnostics | Detailed failure analysis | Faster debugging |
| 🖥️ Console Monitoring | Real-time error detection | Catch issues early |
| 🧪 Functional QA | Comprehensive testing suite | Prevent user issues |
| 🐛 Bug Reports | Professional issue tracking | Actionable development |
| 📸 Visual Evidence | Automated screenshots | Clear problem documentation |
| 🎯 Priority Ranking | Issue severity classification | Efficient development focus |
| 🤖 Framework Detection | Automatic project analysis | Zero configuration |
| 📊 Performance Analysis | Speed and memory monitoring | Optimization insights |

---

**QA MCP** - Your automated QA engineer for localhost applications! 🚀