#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { healthCheckTool } from './tools/health-check.js';
import { screenshotTool } from './tools/screenshot.js';
import { processLogsTool } from './tools/process-logs.js';
import { frameworkDetectionTool } from './tools/framework-detection.js';
import { testEndpointsTool } from './tools/test-endpoints.js';
import { generateReportTool } from './tools/generate-report.js';
import { consoleMonitorTool } from './tools/console-monitor.js';
import { functionalQATool } from './tools/functional-qa.js';

class DeploymentTesterServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'deployment-tester',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'health_check',
            description: 'Test endpoint availability with detailed failure analysis and troubleshooting recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to test (e.g., http://localhost:3000)',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 5000)',
                  default: 5000,
                },
                expectedStatus: {
                  type: 'number',
                  description: 'Expected HTTP status code (default: 200)',
                  default: 200,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'capture_screenshot',
            description: 'Capture screenshot of a webpage',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to screenshot',
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector to focus on (optional)',
                },
                viewport: {
                  type: 'object',
                  description: 'Viewport size',
                  properties: {
                    width: { type: 'number', default: 1280 },
                    height: { type: 'number', default: 720 },
                  },
                },
                outputPath: {
                  type: 'string',
                  description: 'Output file path (optional)',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'monitor_process_logs',
            description: 'Monitor and capture process logs',
            inputSchema: {
              type: 'object',
              properties: {
                processName: {
                  type: 'string',
                  description: 'Process name to monitor (e.g., "node", "npm")',
                },
                duration: {
                  type: 'number',
                  description: 'Duration to monitor in milliseconds (default: 10000)',
                  default: 10000,
                },
                filter: {
                  type: 'string',
                  description: 'Filter logs by pattern (optional)',
                },
              },
              required: ['processName'],
            },
          },
          {
            name: 'detect_framework',
            description: 'Auto-detect project framework and configuration',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory (default: current)',
                  default: '.',
                },
              },
            },
          },
          {
            name: 'test_endpoints',
            description: 'Test multiple endpoints in batch',
            inputSchema: {
              type: 'object',
              properties: {
                endpoints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      method: { type: 'string', default: 'GET' },
                      expectedStatus: { type: 'number', default: 200 },
                    },
                    required: ['url'],
                  },
                  description: 'Array of endpoints to test',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout per request in milliseconds',
                  default: 5000,
                },
              },
              required: ['endpoints'],
            },
          },
          {
            name: 'console_monitor',
            description: 'Monitor console logs, JavaScript errors, network failures, and security issues in real-time',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to monitor',
                },
                duration: {
                  type: 'number',
                  description: 'Duration to monitor in milliseconds (default: 30000)',
                  default: 30000,
                },
                filters: {
                  type: 'object',
                  description: 'What types of issues to monitor',
                  properties: {
                    errors: { type: 'boolean', default: true },
                    warnings: { type: 'boolean', default: true },
                    network: { type: 'boolean', default: true },
                    performance: { type: 'boolean', default: false },
                    security: { type: 'boolean', default: true },
                  },
                },
                interactions: {
                  type: 'array',
                  description: 'User interactions to perform while monitoring',
                  items: {
                    type: 'object',
                    properties: {
                      action: { type: 'string', enum: ['click', 'type', 'navigate', 'wait'] },
                      selector: { type: 'string' },
                      value: { type: 'string' },
                      timeout: { type: 'number', default: 5000 },
                    },
                  },
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'functional_qa',
            description: 'Comprehensive QA testing including forms, navigation, responsiveness, and user flows',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to test',
                },
                testSuite: {
                  type: 'string',
                  enum: ['basic', 'auth', 'forms', 'navigation', 'responsive', 'comprehensive'],
                  description: 'Type of QA test suite to run',
                  default: 'comprehensive',
                },
                userFlows: {
                  type: 'array',
                  description: 'Custom user flows to test',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      steps: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            action: { type: 'string', enum: ['goto', 'click', 'type', 'wait', 'screenshot', 'verify'] },
                            selector: { type: 'string' },
                            value: { type: 'string' },
                            expected: { type: 'string' },
                            timeout: { type: 'number', default: 5000 },
                          },
                        },
                      },
                    },
                  },
                },
                viewport: {
                  type: 'object',
                  properties: {
                    width: { type: 'number', default: 1280 },
                    height: { type: 'number', default: 720 },
                  },
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'generate_test_report',
            description: 'Generate comprehensive test report',
            inputSchema: {
              type: 'object',
              properties: {
                testResults: {
                  type: 'object',
                  description: 'Combined results from all tests',
                },
                outputFormat: {
                  type: 'string',
                  enum: ['html', 'json', 'markdown'],
                  description: 'Output format (default: html)',
                  default: 'html',
                },
                outputPath: {
                  type: 'string',
                  description: 'Output file path (optional)',
                },
              },
              required: ['testResults'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'health_check':
            return await healthCheckTool(args) as any;
          case 'capture_screenshot':
            return await screenshotTool(args) as any;
          case 'monitor_process_logs':
            return await processLogsTool(args) as any;
          case 'detect_framework':
            return await frameworkDetectionTool(args) as any;
          case 'test_endpoints':
            return await testEndpointsTool(args) as any;
          case 'console_monitor':
            return await consoleMonitorTool(args) as any;
          case 'functional_qa':
            return await functionalQATool(args) as any;
          case 'generate_test_report':
            return await generateReportTool(args) as any;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        } as any;
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new DeploymentTesterServer();
server.run().catch(console.error);