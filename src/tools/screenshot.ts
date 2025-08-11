import puppeteer from 'puppeteer';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

const ScreenshotArgsSchema = z.object({
  url: z.string(),
  selector: z.string().optional(),
  viewport: z.object({
    width: z.number().default(1280),
    height: z.number().default(720),
  }).default({ width: 1280, height: 720 }),
  outputPath: z.string().optional(),
});

type ScreenshotArgs = z.infer<typeof ScreenshotArgsSchema>;

export async function screenshotTool(args: any) {
  const validatedArgs = ScreenshotArgsSchema.parse(args);
  const { url, selector, viewport, outputPath } = validatedArgs;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Wait a bit for any dynamic content
    await page.waitForTimeout(1000);

    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = outputPath || `screenshot-${timestamp}.png`;
    const fullPath = path.resolve(filename);

    let element = null;
    if (selector) {
      try {
        element = await page.$(selector);
        if (!element) {
          throw new Error(`Selector "${selector}" not found`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                url,
                error: `Selector error: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }
    }

    // Take screenshot
    if (element) {
      await (element as any).screenshot({ path: fullPath });
    } else {
      await page.screenshot({ path: fullPath, fullPage: true });
    }

    // Get page title and basic info
    const pageTitle = await page.title();
    const pageUrl = page.url();

    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));

    // Check if file was created successfully
    const stats = await fs.stat(fullPath);

    const result = {
      url: pageUrl,
      screenshotPath: fullPath,
      filename,
      fileSize: stats.size,
      pageTitle,
      loadTime,
      viewport,
      dimensions,
      consoleErrors,
      selector,
      timestamp: new Date().toISOString(),
      success: true,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...result,
            summary: `Screenshot captured: ${pageTitle} (${stats.size} bytes) -> ${filename}`,
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
            url,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            success: false,
            summary: `Screenshot FAILED: ${url} - ${errorMessage}`,
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