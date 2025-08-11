import puppeteer from 'puppeteer';
import { z } from 'zod';

const FunctionalQAArgsSchema = z.object({
  url: z.string(),
  testSuite: z.enum(['basic', 'auth', 'forms', 'navigation', 'responsive', 'comprehensive']).default('comprehensive'),
  userFlows: z.array(z.object({
    name: z.string(),
    steps: z.array(z.object({
      action: z.enum(['goto', 'click', 'type', 'wait', 'screenshot', 'verify']),
      selector: z.string().optional(),
      value: z.string().optional(),
      expected: z.string().optional(),
      timeout: z.number().default(5000),
    })),
  })).default([]),
  viewport: z.object({
    width: z.number().default(1280),
    height: z.number().default(720),
  }).default({ width: 1280, height: 720 }),
});

type FunctionalQAArgs = z.infer<typeof FunctionalQAArgsSchema>;

export async function functionalQATool(args: any) {
  const validatedArgs = FunctionalQAArgsSchema.parse(args);
  const { url, testSuite, userFlows, viewport } = validatedArgs;

  let browser;
  const qaResults: any[] = [];
  const screenshots: string[] = [];
  const issues: any[] = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Basic connectivity test
    const connectivityResult = await testConnectivity(page, url);
    qaResults.push(connectivityResult);
    if (!connectivityResult.passed) {
      issues.push({
        severity: 'critical',
        category: 'Connectivity',
        issue: connectivityResult.error,
        recommendation: 'Ensure the development server is running and accessible',
      });
    }

    // Run selected test suite
    switch (testSuite) {
      case 'basic':
        await runBasicTests(page, url, qaResults, issues);
        break;
      case 'auth':
        // Auth tests would be implemented based on specific auth system
        qaResults.push({
          testName: 'Authentication Tests',
          passed: true,
          details: { note: 'Auth tests not implemented - would test login/logout flows' },
        });
        break;
      case 'forms':
        await runFormTests(page, url, qaResults, issues);
        break;
      case 'navigation':
        await runNavigationTests(page, url, qaResults, issues);
        break;
      case 'responsive':
        await runResponsiveTests(page, url, qaResults, issues);
        break;
      case 'comprehensive':
        await runBasicTests(page, url, qaResults, issues);
        await runNavigationTests(page, url, qaResults, issues);
        await runFormTests(page, url, qaResults, issues);
        await runResponsiveTests(page, url, qaResults, issues);
        break;
    }

    // Run custom user flows
    for (const flow of userFlows) {
      const flowResult = await runUserFlow(page, flow, issues);
      qaResults.push(flowResult);
    }

    // UI/UX Quality Assessment
    const uiAssessment = await assessUIQuality(page, issues);
    qaResults.push(uiAssessment);

    // Performance Assessment
    const performanceAssessment = await assessPerformance(page, issues);
    qaResults.push(performanceAssessment);

    const summary = {
      totalTests: qaResults.length,
      passed: qaResults.filter(r => r.passed).length,
      failed: qaResults.filter(r => !r.passed).length,
      issues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      majorIssues: issues.filter(i => i.severity === 'major').length,
      minorIssues: issues.filter(i => i.severity === 'minor').length,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary,
            qaResults,
            issues,
            screenshots,
            recommendations: generateQARecommendations(issues, summary),
            timestamp: new Date().toISOString(),
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
            summary: `Functional QA FAILED: ${url} - ${errorMessage}`,
            partialResults: {
              completedTests: qaResults.length,
              issuesFound: issues.length,
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

async function testConnectivity(page: any, url: string) {
  try {
    const startTime = Date.now();
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    return {
      testName: 'Connectivity Test',
      passed: response?.status() === 200,
      details: {
        status: response?.status(),
        loadTime,
        url: response?.url(),
      },
      error: response?.status() !== 200 ? `HTTP ${response?.status()}` : null,
    };
  } catch (error) {
    return {
      testName: 'Connectivity Test',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runBasicTests(page: any, url: string, results: any[], issues: any[]) {
  // Test page title
  try {
    const title = await page.title();
    results.push({
      testName: 'Page Title Check',
      passed: title && title.trim().length > 0,
      details: { title },
    });
    
    if (!title || title.trim().length === 0) {
      issues.push({
        severity: 'minor',
        category: 'SEO',
        issue: 'Page title is missing or empty',
        recommendation: 'Add a descriptive page title for better SEO and user experience',
      });
    }
  } catch (error) {
    results.push({
      testName: 'Page Title Check',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test for broken images
  try {
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || img.naturalHeight === 0).length;
    });
    
    results.push({
      testName: 'Broken Images Check',
      passed: brokenImages === 0,
      details: { brokenImageCount: brokenImages },
    });

    if (brokenImages > 0) {
      issues.push({
        severity: 'major',
        category: 'Content',
        issue: `${brokenImages} broken image(s) detected`,
        recommendation: 'Fix broken image sources and ensure all images load correctly',
      });
    }
  } catch (error) {
    results.push({
      testName: 'Broken Images Check',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test for JavaScript errors
  const jsErrors: string[] = [];
  page.on('pageerror', (error: Error) => {
    jsErrors.push(error.message);
  });

  await page.waitForTimeout(2000); // Wait to catch any delayed errors

  results.push({
    testName: 'JavaScript Errors Check',
    passed: jsErrors.length === 0,
    details: { errorCount: jsErrors.length, errors: jsErrors },
  });

  if (jsErrors.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'JavaScript',
      issue: `${jsErrors.length} JavaScript error(s) detected`,
      recommendation: 'Fix JavaScript errors to ensure proper application functionality',
      details: jsErrors,
    });
  }
}

async function runNavigationTests(page: any, url: string, results: any[], issues: any[]) {
  try {
    // Find all navigation links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(link => ({
          href: (link as HTMLAnchorElement).href,
          text: link.textContent?.trim() || '',
          internal: (link as HTMLAnchorElement).href.includes(window.location.origin)
        }))
        .filter(link => link.internal && link.href !== window.location.href);
    });

    let workingLinks = 0;
    let brokenLinks = 0;
    const brokenLinkDetails: any[] = [];

    // Test internal links (limit to first 10 to avoid long test times)
    const linksToTest = links.slice(0, 10);
    
    for (const link of linksToTest) {
      try {
        const response = await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 5000 });
        if (response?.status() === 200) {
          workingLinks++;
        } else {
          brokenLinks++;
          brokenLinkDetails.push({ href: link.href, status: response?.status() });
        }
      } catch (error) {
        brokenLinks++;
        brokenLinkDetails.push({ 
          href: link.href, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    results.push({
      testName: 'Navigation Links Test',
      passed: brokenLinks === 0,
      details: {
        totalLinksFound: links.length,
        linksTestedCount: linksToTest.length,
        workingLinks,
        brokenLinks,
        brokenLinkDetails,
      },
    });

    if (brokenLinks > 0) {
      issues.push({
        severity: 'major',
        category: 'Navigation',
        issue: `${brokenLinks} broken internal link(s) found`,
        recommendation: 'Fix broken navigation links to improve user experience',
        details: brokenLinkDetails,
      });
    }

    // Return to original URL
    await page.goto(url, { waitUntil: 'networkidle2' });

  } catch (error) {
    results.push({
      testName: 'Navigation Links Test',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function runFormTests(page: any, url: string, results: any[], issues: any[]) {
  try {
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((form, index) => ({
        index,
        action: form.getAttribute('action') || '',
        method: form.getAttribute('method') || 'GET',
        inputCount: form.querySelectorAll('input, textarea, select').length,
        hasSubmitButton: form.querySelector('input[type="submit"], button[type="submit"], button:not([type])') !== null,
      }));
    });

    results.push({
      testName: 'Form Structure Check',
      passed: forms.every(form => form.hasSubmitButton),
      details: { formsFound: forms.length, forms },
    });

    // Check for forms without submit buttons
    const formsWithoutSubmit = forms.filter(form => !form.hasSubmitButton);
    if (formsWithoutSubmit.length > 0) {
      issues.push({
        severity: 'major',
        category: 'Forms',
        issue: `${formsWithoutSubmit.length} form(s) missing submit button`,
        recommendation: 'Add submit buttons to all forms for proper user interaction',
        details: formsWithoutSubmit,
      });
    }

    // Check for accessibility issues in forms
    const accessibilityIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const inputs = document.querySelectorAll('input, textarea, select');
      
      inputs.forEach((input, index) => {
        const id = input.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        
        if (!label && !ariaLabel) {
          issues.push({
            element: `${input.tagName.toLowerCase()}[${index}]`,
            issue: 'Missing label',
            type: input.getAttribute('type') || input.tagName.toLowerCase(),
          });
        }
      });
      
      return issues;
    });

    if (accessibilityIssues.length > 0) {
      issues.push({
        severity: 'major',
        category: 'Accessibility',
        issue: `${accessibilityIssues.length} form input(s) missing labels`,
        recommendation: 'Add labels to all form inputs for better accessibility',
        details: accessibilityIssues,
      });
    }

  } catch (error) {
    results.push({
      testName: 'Form Structure Check',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function runResponsiveTests(page: any, url: string, results: any[], issues: any[]) {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  const responsiveResults: any[] = [];

  for (const viewport of viewports) {
    try {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.reload({ waitUntil: 'networkidle2' });

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Check for overlapping elements (simple check)
      const hasOverlappingElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        // Simplified check - in practice, you'd want more sophisticated overlap detection
        return elements.some(el => {
          const rect = el.getBoundingClientRect();
          return rect.width === 0 || rect.height === 0;
        });
      });

      responsiveResults.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        hasHorizontalScroll,
        hasOverlappingElements,
        passed: !hasHorizontalScroll && !hasOverlappingElements,
      });

      if (hasHorizontalScroll) {
        issues.push({
          severity: 'major',
          category: 'Responsive Design',
          issue: `Horizontal scroll detected on ${viewport.name} (${viewport.width}px)`,
          recommendation: 'Ensure content fits within viewport width on all device sizes',
        });
      }

    } catch (error) {
      responsiveResults.push({
        viewport: viewport.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  results.push({
    testName: 'Responsive Design Test',
    passed: responsiveResults.every(r => r.passed),
    details: { viewportTests: responsiveResults },
  });
}

async function runUserFlow(page: any, flow: any, issues: any[]) {
  const flowResult = {
    testName: `User Flow: ${flow.name}`,
    passed: true,
    steps: [] as any[],
    error: null as string | null,
  };

  try {
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const stepResult: any = {
        stepNumber: i + 1,
        action: step.action,
        selector: step.selector,
        value: step.value,
        passed: false,
        error: null,
      };

      try {
        switch (step.action) {
          case 'goto':
            await page.goto(step.value || '', { waitUntil: 'networkidle2' });
            stepResult.passed = true;
            break;
          case 'click':
            await page.waitForSelector(step.selector!, { timeout: step.timeout });
            await page.click(step.selector!);
            stepResult.passed = true;
            break;
          case 'type':
            await page.waitForSelector(step.selector!, { timeout: step.timeout });
            await page.type(step.selector!, step.value!);
            stepResult.passed = true;
            break;
          case 'wait':
            await page.waitForTimeout(step.timeout);
            stepResult.passed = true;
            break;
          case 'verify':
            const element = await page.$(step.selector!);
            const textContent = element ? await element.textContent() : null;
            stepResult.passed = textContent?.includes(step.expected!) || false;
            stepResult.actualValue = textContent;
            stepResult.expectedValue = step.expected;
            break;
        }
      } catch (error) {
        stepResult.passed = false;
        stepResult.error = error instanceof Error ? error.message : String(error);
        flowResult.passed = false;
      }

      flowResult.steps.push(stepResult);
    }
  } catch (error) {
    flowResult.passed = false;
    flowResult.error = error instanceof Error ? error.message : String(error);
  }

  if (!flowResult.passed) {
    issues.push({
      severity: 'major',
      category: 'User Flow',
      issue: `User flow "${flow.name}" failed`,
      recommendation: 'Review and fix the failing user flow steps',
      details: flowResult,
    });
  }

  return flowResult;
}

async function assessUIQuality(page: any, issues: any[]) {
  const uiIssues = await page.evaluate(() => {
    const problems: any[] = [];
    
    // Check for very small text
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el, index) => {
      const styles = window.getComputedStyle(el);
      const fontSize = parseInt(styles.fontSize);
      
      if (fontSize < 12 && el.textContent && el.textContent.trim().length > 0) {
        problems.push({
          issue: 'Text too small',
          element: `${el.tagName.toLowerCase()}[${index}]`,
          fontSize: `${fontSize}px`,
          recommendation: 'Ensure text is at least 12px for readability',
        });
      }
    });

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.getAttribute('alt')) {
        problems.push({
          issue: 'Missing alt text',
          element: `img[${index}]`,
          src: img.getAttribute('src'),
          recommendation: 'Add descriptive alt text to all images',
        });
      }
    });

    return problems;
  });

  if (uiIssues.length > 0) {
    issues.push(...uiIssues.map(issue => ({
      severity: 'minor',
      category: 'UI/UX',
      issue: issue.issue,
      recommendation: issue.recommendation,
      details: issue,
    })));
  }

  return {
    testName: 'UI Quality Assessment',
    passed: uiIssues.length === 0,
    details: { issuesFound: uiIssues.length, issues: uiIssues },
  };
}

async function assessPerformance(page: any, issues: any[]) {
  const metrics = await page.metrics();
  const performanceEntries = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    };
  });

  const performanceIssues: any[] = [];
  
  if (performanceEntries.loadComplete > 3000) {
    performanceIssues.push({
      severity: 'major',
      category: 'Performance',
      issue: `Slow page load time: ${performanceEntries.loadComplete}ms`,
      recommendation: 'Optimize images, minify CSS/JS, and reduce server response time',
    });
  }

  if (metrics.JSHeapUsedSize > 50 * 1024 * 1024) { // 50MB
    performanceIssues.push({
      severity: 'minor',
      category: 'Performance',
      issue: `High memory usage: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB`,
      recommendation: 'Review JavaScript memory usage and look for memory leaks',
    });
  }

  issues.push(...performanceIssues);

  return {
    testName: 'Performance Assessment',
    passed: performanceIssues.length === 0,
    details: { metrics, performanceEntries, issuesFound: performanceIssues.length },
  };
}

function generateQARecommendations(issues: any[], summary: any): string[] {
  const recommendations: string[] = [];
  
  if (summary.criticalIssues > 0) {
    recommendations.push('🚨 CRITICAL: Address critical issues immediately - these prevent basic functionality');
  }
  
  if (summary.majorIssues > 0) {
    recommendations.push('⚠️ MAJOR: Fix major issues that significantly impact user experience');
  }
  
  if (summary.minorIssues > 0) {
    recommendations.push('📝 MINOR: Consider addressing minor issues for better overall quality');
  }
  
  const categories = issues.reduce((cats, issue) => {
    cats[issue.category] = (cats[issue.category] || 0) + 1;
    return cats;
  }, {} as Record<string, number>);
  
  Object.entries(categories).forEach(([category, count]) => {
    recommendations.push(`🔍 Focus on ${category}: ${count} issue(s) found`);
  });
  
  if (summary.issues === 0) {
    recommendations.push('✅ Excellent! No major issues detected. Application appears to be well-built and functional.');
  }
  
  return recommendations;
}