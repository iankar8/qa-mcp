import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const GenerateReportArgsSchema = z.object({
  testResults: z.object({
    framework: z.string().optional(),
    healthChecks: z.array(z.any()).optional(),
    screenshots: z.array(z.any()).optional(),
    endpointTests: z.array(z.any()).optional(),
    processLogs: z.any().optional(),
    consoleMonitoring: z.any().optional(),
    functionalQA: z.any().optional(),
    issues: z.array(z.any()).optional(),
    qaMetrics: z.object({
      totalTests: z.number().optional(),
      passed: z.number().optional(),
      failed: z.number().optional(),
      criticalIssues: z.number().optional(),
      majorIssues: z.number().optional(),
      minorIssues: z.number().optional(),
    }).optional(),
    timestamp: z.string().optional(),
  }),
  outputFormat: z.enum(['html', 'json', 'markdown']).default('html'),
  outputPath: z.string().optional(),
});

type GenerateReportArgs = z.infer<typeof GenerateReportArgsSchema>;

function generateHTMLReport(testResults: any): string {
  const timestamp = testResults.timestamp || new Date().toISOString();
  const framework = testResults.framework || 'Unknown';
  const qaMetrics = testResults.qaMetrics || {};
  const issues = testResults.issues || [];
  
  const severityColors = {
    critical: '#dc3545',
    major: '#fd7e14', 
    minor: '#ffc107'
  };
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QA Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
        }
        .header .meta {
            margin-top: 10px;
            opacity: 0.9;
        }
        .section {
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
        }
        .metric {
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
        }
        .screenshot {
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .log-entry {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            padding: 8px;
            background: #f8f9fa;
            border-left: 3px solid #667eea;
            margin: 5px 0;
        }
        .error-entry {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 QA Test Report</h1>
        <div class="meta">
            <strong>Framework:</strong> ${framework}<br>
            <strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}<br>
            <strong>Test Duration:</strong> ${testResults.totalTime || 'N/A'}ms
        </div>
    </div>

    <!-- QA Metrics Summary -->
    ${qaMetrics && Object.keys(qaMetrics).length > 0 ? `
    <div class="section">
        <h2>📊 QA Summary</h2>
        <div class="grid">
            <div class="card">
                <div class="metric">${qaMetrics.totalTests || 0}</div>
                <p>Total Tests</p>
            </div>
            <div class="card">
                <div class="metric status-passed">${qaMetrics.passed || 0}</div>
                <p>Passed</p>
            </div>
            <div class="card">
                <div class="metric status-failed">${qaMetrics.failed || 0}</div>
                <p>Failed</p>
            </div>
            <div class="card">
                <div class="metric" style="color: ${severityColors.critical}">${qaMetrics.criticalIssues || 0}</div>
                <p>Critical Issues</p>
            </div>
            <div class="card">
                <div class="metric" style="color: ${severityColors.major}">${qaMetrics.majorIssues || 0}</div>
                <p>Major Issues</p>
            </div>
            <div class="card">
                <div class="metric" style="color: ${severityColors.minor}">${qaMetrics.minorIssues || 0}</div>
                <p>Minor Issues</p>
            </div>
        </div>
    </div>
    ` : ''}

    <!-- Issues Breakdown -->
    ${issues && issues.length > 0 ? `
    <div class="section">
        <h2>🐛 Issues Found</h2>
        ${['critical', 'major', 'minor'].map(severity => {
          const severityIssues = issues.filter(issue => issue.severity === severity);
          if (severityIssues.length === 0) return '';
          
          return `
            <h3 style="color: ${severityColors[severity]}">
              ${severity.charAt(0).toUpperCase() + severity.slice(1)} Issues (${severityIssues.length})
            </h3>
            ${severityIssues.map((issue, index) => `
              <div class="card" style="border-left: 4px solid ${severityColors[severity]}">
                <h4>${issue.category || 'General'}: ${issue.issue}</h4>
                <p><strong>Recommendation:</strong> ${issue.recommendation}</p>
                ${issue.details ? `<p><strong>Details:</strong> ${JSON.stringify(issue.details, null, 2)}</p>` : ''}
              </div>
            `).join('')}
          `;
        }).join('')}
    </div>
    ` : ''}

    <!-- Console Monitoring Results -->
    ${testResults.consoleMonitoring ? `
    <div class="section">
        <h2>🖥️ Console Monitoring</h2>
        <div class="grid">
            <div class="card">
                <div class="metric">${testResults.consoleMonitoring.summary?.totalIssues || 0}</div>
                <p>Total Issues</p>
            </div>
            <div class="card">
                <div class="metric status-failed">${testResults.consoleMonitoring.summary?.severityCounts?.high || 0}</div>
                <p>High Severity</p>
            </div>
            <div class="card">
                <div class="metric status-warning">${testResults.consoleMonitoring.summary?.severityCounts?.medium || 0}</div>
                <p>Medium Severity</p>
            </div>
            <div class="card">
                <div class="metric">${testResults.consoleMonitoring.consoleMessages?.length || 0}</div>
                <p>Console Messages</p>
            </div>
        </div>
        
        ${testResults.consoleMonitoring.issues && testResults.consoleMonitoring.issues.length > 0 ? `
          <h3>Console Issues</h3>
          ${testResults.consoleMonitoring.issues.map(issue => `
            <div class="log-entry ${issue.severity === 'high' ? 'error-entry' : ''}">
              <strong>${issue.category}:</strong> ${issue.issue || issue.message}
              ${issue.timestamp ? `<small> - ${new Date(issue.timestamp).toLocaleTimeString()}</small>` : ''}
            </div>
          `).join('')}
        ` : ''}
    </div>
    ` : ''}

    <!-- Functional QA Results -->
    ${testResults.functionalQA ? `
    <div class="section">
        <h2>🧪 Functional QA</h2>
        <div class="grid">
            <div class="card">
                <div class="metric">${testResults.functionalQA.summary?.totalTests || 0}</div>
                <p>Tests Run</p>
            </div>
            <div class="card">
                <div class="metric status-passed">${testResults.functionalQA.summary?.passed || 0}</div>
                <p>Passed</p>
            </div>
            <div class="card">
                <div class="metric status-failed">${testResults.functionalQA.summary?.failed || 0}</div>
                <p>Failed</p>
            </div>
        </div>
        
        ${testResults.functionalQA.qaResults ? `
          <h3>Test Results</h3>
          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Result</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${testResults.functionalQA.qaResults.map(result => `
                <tr>
                  <td>${result.testName}</td>
                  <td class="status-${result.passed ? 'passed' : 'failed'}">
                    ${result.passed ? 'PASS' : 'FAIL'}
                  </td>
                  <td>${result.error || JSON.stringify(result.details || {})}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
    </div>
    ` : ''}

    ${testResults.healthChecks ? `
    <div class="section">
        <h2>🏥 Health Checks</h2>
        <div class="grid">
            ${testResults.healthChecks.map(check => `
                <div class="card">
                    <h4>${check.url}</h4>
                    <p class="status-${check.isHealthy ? 'passed' : 'failed'}">
                        ${check.isHealthy ? 'PASSED' : 'FAILED'}
                    </p>
                    <p><strong>Status:</strong> ${check.status || 'Error'}</p>
                    <p><strong>Response Time:</strong> ${check.responseTime || 'N/A'}ms</p>
                    ${check.error ? `<p class="status-failed">Error: ${check.error}</p>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${testResults.endpointTests ? `
    <div class="section">
        <h2>🔗 Endpoint Tests</h2>
        ${testResults.endpointTests.stats ? `
            <div class="grid">
                <div class="card">
                    <div class="metric">${testResults.endpointTests.stats.total}</div>
                    <p>Total Endpoints</p>
                </div>
                <div class="card">
                    <div class="metric status-passed">${testResults.endpointTests.stats.passed}</div>
                    <p>Passed</p>
                </div>
                <div class="card">
                    <div class="metric status-failed">${testResults.endpointTests.stats.failed}</div>
                    <p>Failed</p>
                </div>
                <div class="card">
                    <div class="metric">${testResults.endpointTests.stats.averageResponseTime}ms</div>
                    <p>Average Response</p>
                </div>
            </div>
        ` : ''}
        
        ${testResults.endpointTests.results ? `
            <table>
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Response Time</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    ${testResults.endpointTests.results.map(result => `
                        <tr>
                            <td>${result.url}</td>
                            <td>${result.method}</td>
                            <td>${result.status}</td>
                            <td>${result.responseTime}ms</td>
                            <td class="status-${result.success ? 'passed' : 'failed'}">
                                ${result.success ? 'PASS' : 'FAIL'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
    </div>
    ` : ''}

    ${testResults.screenshots ? `
    <div class="section">
        <h2>📸 Screenshots</h2>
        <div class="grid">
            ${testResults.screenshots.map(screenshot => `
                <div class="card">
                    <h4>${screenshot.pageTitle || screenshot.url}</h4>
                    <img src="${screenshot.screenshotPath}" alt="Screenshot" class="screenshot">
                    <p><strong>Load Time:</strong> ${screenshot.loadTime}ms</p>
                    <p><strong>File Size:</strong> ${(screenshot.fileSize / 1024).toFixed(1)}KB</p>
                    ${screenshot.consoleErrors && screenshot.consoleErrors.length > 0 ? 
                        `<p class="status-warning">Console Errors: ${screenshot.consoleErrors.length}</p>` : 
                        '<p class="status-passed">No Console Errors</p>'
                    }
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${testResults.processLogs ? `
    <div class="section">
        <h2>📋 Process Logs</h2>
        <div class="card">
            <p><strong>Process:</strong> ${testResults.processLogs.processName}</p>
            <p><strong>Logs Captured:</strong> ${testResults.processLogs.logsCount || 0}</p>
            <p><strong>Errors:</strong> ${testResults.processLogs.logLevels?.error || 0}</p>
            <p><strong>Warnings:</strong> ${testResults.processLogs.logLevels?.warn || 0}</p>
            
            ${testResults.processLogs.logs ? `
                <div style="max-height: 400px; overflow-y: scroll; margin-top: 15px;">
                    ${testResults.processLogs.logs.slice(0, 50).map(log => {
                        const isError = /error|err|exception|fail/i.test(log);
                        return `<div class="log-entry ${isError ? 'error-entry' : ''}">${log}</div>`;
                    }).join('')}
                    ${testResults.processLogs.logs.length > 50 ? '<p><em>... and more logs</em></p>' : ''}
                </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>📊 Summary</h2>
        <div class="card">
            <p>This deployment test report was generated automatically by the Deployment Tester MCP extension.</p>
            <p><strong>Framework Detected:</strong> ${framework}</p>
            <p><strong>Test Timestamp:</strong> ${timestamp}</p>
            <p><strong>Overall Status:</strong> 
                <span class="status-${testResults.overallSuccess !== false ? 'passed' : 'failed'}">
                    ${testResults.overallSuccess !== false ? 'PASSED' : 'FAILED'}
                </span>
            </p>
        </div>
    </div>
</body>
</html>`;
}

function generateMarkdownReport(testResults: any): string {
  const timestamp = testResults.timestamp || new Date().toISOString();
  const framework = testResults.framework || 'Unknown';
  
  let markdown = `# 🚀 Deployment Test Report

**Framework:** ${framework}  
**Generated:** ${new Date(timestamp).toLocaleString()}  
**Test Duration:** ${testResults.totalTime || 'N/A'}ms

---

`;

  if (testResults.healthChecks) {
    markdown += `## 🏥 Health Checks\n\n`;
    testResults.healthChecks.forEach(check => {
      const status = check.isHealthy ? '✅ PASSED' : '❌ FAILED';
      markdown += `### ${check.url}\n- **Status:** ${status}\n- **Response Code:** ${check.status || 'Error'}\n- **Response Time:** ${check.responseTime || 'N/A'}ms\n`;
      if (check.error) {
        markdown += `- **Error:** ${check.error}\n`;
      }
      markdown += '\n';
    });
  }

  if (testResults.endpointTests?.stats) {
    markdown += `## 🔗 Endpoint Tests\n\n`;
    markdown += `- **Total Endpoints:** ${testResults.endpointTests.stats.total}\n`;
    markdown += `- **Passed:** ${testResults.endpointTests.stats.passed}\n`;
    markdown += `- **Failed:** ${testResults.endpointTests.stats.failed}\n`;
    markdown += `- **Average Response Time:** ${testResults.endpointTests.stats.averageResponseTime}ms\n\n`;
    
    if (testResults.endpointTests.results) {
      markdown += `| URL | Method | Status | Response Time | Result |\n`;
      markdown += `|-----|--------|--------|---------------|--------|\n`;
      testResults.endpointTests.results.forEach(result => {
        const resultIcon = result.success ? '✅' : '❌';
        markdown += `| ${result.url} | ${result.method} | ${result.status} | ${result.responseTime}ms | ${resultIcon} |\n`;
      });
      markdown += '\n';
    }
  }

  if (testResults.screenshots) {
    markdown += `## 📸 Screenshots\n\n`;
    testResults.screenshots.forEach(screenshot => {
      markdown += `### ${screenshot.pageTitle || screenshot.url}\n`;
      markdown += `- **Screenshot:** ${screenshot.screenshotPath}\n`;
      markdown += `- **Load Time:** ${screenshot.loadTime}ms\n`;
      markdown += `- **File Size:** ${(screenshot.fileSize / 1024).toFixed(1)}KB\n`;
      if (screenshot.consoleErrors && screenshot.consoleErrors.length > 0) {
        markdown += `- **Console Errors:** ${screenshot.consoleErrors.length}\n`;
      } else {
        markdown += `- **Console Errors:** None\n`;
      }
      markdown += '\n';
    });
  }

  if (testResults.processLogs) {
    markdown += `## 📋 Process Logs\n\n`;
    markdown += `- **Process:** ${testResults.processLogs.processName}\n`;
    markdown += `- **Logs Captured:** ${testResults.processLogs.logsCount || 0}\n`;
    markdown += `- **Errors:** ${testResults.processLogs.logLevels?.error || 0}\n`;
    markdown += `- **Warnings:** ${testResults.processLogs.logLevels?.warn || 0}\n\n`;
  }

  markdown += `---\n\n`;
  markdown += `**Overall Status:** ${testResults.overallSuccess !== false ? '✅ PASSED' : '❌ FAILED'}\n\n`;
  markdown += `*Report generated by Deployment Tester MCP extension*`;

  return markdown;
}

export async function generateReportTool(args: any) {
  const validatedArgs = GenerateReportArgsSchema.parse(args);
  const { testResults, outputFormat, outputPath } = validatedArgs;

  try {
    let reportContent: string;
    let fileExtension: string;
    let mimeType: string;

    switch (outputFormat) {
      case 'html':
        reportContent = generateHTMLReport(testResults);
        fileExtension = 'html';
        mimeType = 'text/html';
        break;
      case 'json':
        reportContent = JSON.stringify(testResults, null, 2);
        fileExtension = 'json';
        mimeType = 'application/json';
        break;
      case 'markdown':
        reportContent = generateMarkdownReport(testResults);
        fileExtension = 'md';
        mimeType = 'text/markdown';
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = outputPath || `deployment-test-report-${timestamp}.${fileExtension}`;
    const fullPath = path.resolve(filename);

    // Write the report to file
    await fs.writeFile(fullPath, reportContent, 'utf-8');

    // Get file stats
    const stats = await fs.stat(fullPath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            reportPath: fullPath,
            filename: path.basename(fullPath),
            format: outputFormat,
            fileSize: stats.size,
            mimeType,
            timestamp: new Date().toISOString(),
            preview: outputFormat === 'json' ? testResults : `Report generated with ${Object.keys(testResults).length} sections`,
            summary: `Generated ${outputFormat.toUpperCase()} report: ${path.basename(fullPath)} (${stats.size} bytes)`,
          }, null, 2),
        },
      ],
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            timestamp: new Date().toISOString(),
            summary: `Report generation FAILED: ${outputFormat} - ${errorMessage}`,
          }, null, 2),
        },
      ],
    };
  }
}