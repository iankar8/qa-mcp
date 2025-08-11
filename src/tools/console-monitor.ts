import puppeteer from 'puppeteer';
import { z } from 'zod';

const ConsoleMonitorArgsSchema = z.object({
  url: z.string(),
  duration: z.number().default(30000), // 30 seconds default
  filters: z.object({
    errors: z.boolean().default(true),
    warnings: z.boolean().default(true),
    network: z.boolean().default(true),
    performance: z.boolean().default(false),
    security: z.boolean().default(true),
  }).default({}),
  interactions: z.array(z.object({
    action: z.enum(['click', 'type', 'navigate', 'wait']),
    selector: z.string().optional(),
    value: z.string().optional(),
    timeout: z.number().default(5000),
  })).default([]),
});

type ConsoleMonitorArgs = z.infer<typeof ConsoleMonitorArgsSchema>;

export async function consoleMonitorTool(args: any) {
  const validatedArgs = ConsoleMonitorArgsSchema.parse(args);
  const { url, duration, filters, interactions } = validatedArgs;

  let browser;
  const consoleMessages: any[] = [];
  const networkErrors: any[] = [];
  const performanceMetrics: any[] = [];
  const securityIssues: any[] = [];
  const jsErrors: any[] = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
    });

    const page = await browser.newPage();
    
    // Enable console monitoring
    page.on('console', (msg) => {
      if (!filters.errors && msg.type() === 'error') return;
      if (!filters.warnings && msg.type() === 'warning') return;
      
      const message = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString(),
        args: msg.args().length,
      };
      
      consoleMessages.push(message);
      
      if (msg.type() === 'error') {
        jsErrors.push({
          ...message,
          severity: 'high',
          category: 'JavaScript Error',
        });
      }
    });

    // Monitor network failures
    if (filters.network) {
      page.on('requestfailed', (request) => {
        networkErrors.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText || 'Unknown error',
          timestamp: new Date().toISOString(),
          severity: 'medium',
          category: 'Network Error',
        });
      });

      page.on('response', (response) => {
        if (response.status() >= 400) {
          networkErrors.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: new Date().toISOString(),
            severity: response.status() >= 500 ? 'high' : 'medium',
            category: 'HTTP Error',
          });
        }
      });
    }

    // Monitor security issues
    if (filters.security) {
      page.on('console', (msg) => {
        const text = msg.text().toLowerCase();
        if (text.includes('mixed content') || 
            text.includes('insecure') || 
            text.includes('cors') ||
            text.includes('csp') ||
            text.includes('xss')) {
          securityIssues.push({
            type: 'security_warning',
            message: msg.text(),
            timestamp: new Date().toISOString(),
            severity: 'high',
            category: 'Security Issue',
          });
        }
      });
    }

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const initialLoadTime = Date.now() - startTime;

    // Perform user interactions if specified
    for (const interaction of interactions) {
      try {
        switch (interaction.action) {
          case 'click':
            if (interaction.selector) {
              await page.waitForSelector(interaction.selector, { timeout: interaction.timeout });
              await page.click(interaction.selector);
              await page.waitForTimeout(1000); // Wait for any resulting actions
            }
            break;
          case 'type':
            if (interaction.selector && interaction.value) {
              await page.waitForSelector(interaction.selector, { timeout: interaction.timeout });
              await page.type(interaction.selector, interaction.value);
            }
            break;
          case 'navigate':
            if (interaction.value) {
              await page.goto(interaction.value, { waitUntil: 'networkidle2' });
            }
            break;
          case 'wait':
            await page.waitForTimeout(interaction.timeout);
            break;
        }
      } catch (interactionError) {
        jsErrors.push({
          type: 'interaction_error',
          action: interaction.action,
          selector: interaction.selector,
          error: interactionError instanceof Error ? interactionError.message : String(interactionError),
          timestamp: new Date().toISOString(),
          severity: 'medium',
          category: 'User Interaction Error',
        });
      }
    }

    // Wait for specified duration to capture ongoing issues
    await page.waitForTimeout(duration - (Date.now() - startTime));

    // Collect performance metrics
    if (filters.performance) {
      const metrics = await page.metrics();
      const perfEntries = await page.evaluate(() => {
        return JSON.stringify(performance.getEntriesByType('navigation'));
      });

      performanceMetrics.push({
        domContentLoaded: metrics.JSHeapUsedSize,
        heapUsed: metrics.JSHeapUsedSize,
        heapTotal: metrics.JSHeapTotalSize,
        navigationEntries: JSON.parse(perfEntries),
        timestamp: new Date().toISOString(),
      });
    }

    // Run accessibility checks
    const accessibilityIssues = await page.evaluate(() => {
      const issues: any[] = [];
      
      // Check for missing alt text
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.getAttribute('alt')) {
          issues.push({
            type: 'accessibility',
            issue: 'Missing alt text',
            element: `img[${index}]`,
            severity: 'medium',
            category: 'Accessibility Issue',
          });
        }
      });

      // Check for missing form labels
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
      inputs.forEach((input, index) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        if (!label && !ariaLabel) {
          issues.push({
            type: 'accessibility',
            issue: 'Input missing label',
            element: `${input.tagName.toLowerCase()}[${index}]`,
            severity: 'high',
            category: 'Accessibility Issue',
          });
        }
      });

      return issues;
    });

    // Analyze all collected issues
    const allIssues = [
      ...jsErrors,
      ...networkErrors,
      ...securityIssues,
      ...accessibilityIssues,
    ];

    const severityCounts = {
      high: allIssues.filter(issue => issue.severity === 'high').length,
      medium: allIssues.filter(issue => issue.severity === 'medium').length,
      low: allIssues.filter(issue => issue.severity === 'low').length,
    };

    const categoryCounts = allIssues.reduce((counts, issue) => {
      counts[issue.category] = (counts[issue.category] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: {
              url,
              duration,
              initialLoadTime,
              totalIssues: allIssues.length,
              severityCounts,
              categoryCounts,
              timestamp: new Date().toISOString(),
            },
            issues: allIssues,
            consoleMessages: filters.errors || filters.warnings ? consoleMessages : [],
            networkErrors: filters.network ? networkErrors : [],
            performanceMetrics: filters.performance ? performanceMetrics : [],
            interactions: interactions.length > 0 ? {
              performed: interactions.length,
              errors: jsErrors.filter(e => e.category === 'User Interaction Error').length,
            } : undefined,
            recommendations: generateRecommendations(allIssues),
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
            summary: `Console monitoring FAILED: ${url} - ${errorMessage}`,
            partialResults: {
              consoleMessages: consoleMessages.length,
              networkErrors: networkErrors.length,
              jsErrors: jsErrors.length,
            },
          }, null, 2),
        },
      ],
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateRecommendations(issues: any[]): string[] {
  const recommendations: string[] = [];
  
  const errorTypes = issues.reduce((types, issue) => {
    types[issue.category] = (types[issue.category] || 0) + 1;
    return types;
  }, {} as Record<string, number>);

  if (errorTypes['JavaScript Error'] > 0) {
    recommendations.push('🔧 Fix JavaScript errors to improve application stability');
  }

  if (errorTypes['Network Error'] > 0) {
    recommendations.push('🌐 Resolve network connectivity issues and API endpoint problems');
  }

  if (errorTypes['Security Issue'] > 0) {
    recommendations.push('🔒 Address security warnings to protect user data');
  }

  if (errorTypes['Accessibility Issue'] > 0) {
    recommendations.push('♿ Improve accessibility by adding alt text and form labels');
  }

  if (errorTypes['HTTP Error'] > 0) {
    recommendations.push('📡 Check server responses and fix HTTP error codes');
  }

  if (issues.length === 0) {
    recommendations.push('✅ No issues detected - application appears to be working well');
  }

  return recommendations;
}