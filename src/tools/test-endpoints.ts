import axios from 'axios';
import { z } from 'zod';

const EndpointSchema = z.object({
  url: z.string(),
  method: z.string().default('GET'),
  expectedStatus: z.number().default(200),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
});

const TestEndpointsArgsSchema = z.object({
  endpoints: z.array(EndpointSchema),
  timeout: z.number().default(5000),
  maxConcurrency: z.number().default(5),
});

type TestEndpointsArgs = z.infer<typeof TestEndpointsArgsSchema>;
type EndpointConfig = z.infer<typeof EndpointSchema>;

interface EndpointResult {
  url: string;
  method: string;
  status: number;
  responseTime: number;
  success: boolean;
  expectedStatus: number;
  error?: string;
  headers: any;
  statusText: string;
  contentLength?: number;
  contentType?: string;
  timestamp: string;
}

export async function testEndpointsTool(args: any) {
  const validatedArgs = TestEndpointsArgsSchema.parse(args);
  const { endpoints, timeout, maxConcurrency } = validatedArgs;

  const results: EndpointResult[] = [];
  const startTime = Date.now();

  // Helper function to test a single endpoint
  async function testSingleEndpoint(endpoint: EndpointConfig): Promise<EndpointResult> {
    const testStartTime = Date.now();
    
    try {
      const response = await axios({
        method: endpoint.method as any,
        url: endpoint.url,
        timeout,
        headers: endpoint.headers,
        data: endpoint.body,
        validateStatus: () => true, // Don't throw on any status code
      });

      const responseTime = Date.now() - testStartTime;
      const success = response.status === endpoint.expectedStatus;

      return {
        url: endpoint.url,
        method: endpoint.method,
        status: response.status,
        responseTime,
        success,
        expectedStatus: endpoint.expectedStatus,
        headers: response.headers,
        statusText: response.statusText,
        contentLength: response.headers['content-length'] ? parseInt(response.headers['content-length']) : undefined,
        contentType: response.headers['content-type'],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - testStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        url: endpoint.url,
        method: endpoint.method,
        status: 0,
        responseTime,
        success: false,
        expectedStatus: endpoint.expectedStatus,
        error: errorMessage,
        headers: {},
        statusText: 'Error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  try {
    // Process endpoints in batches to respect concurrency limits
    const batches: EndpointConfig[][] = [];
    for (let i = 0; i < endpoints.length; i += maxConcurrency) {
      batches.push(endpoints.slice(i, i + maxConcurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map((endpoint: EndpointConfig) => testSingleEndpoint(endpoint));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Calculate summary statistics
    const stats = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      averageResponseTime: results.length > 0 ? 
        Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length) : 0,
      fastestResponse: results.length > 0 ? Math.min(...results.map(r => r.responseTime)) : 0,
      slowestResponse: results.length > 0 ? Math.max(...results.map(r => r.responseTime)) : 0,
      totalTime,
    };

    // Group results by status
    const statusGroups = results.reduce((groups, result) => {
      const status = result.status.toString();
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(result);
      return groups;
    }, {} as Record<string, EndpointResult[]>);

    // Extract common errors
    const errors = results
      .filter(r => r.error)
      .map(r => ({ url: r.url, error: r.error }));

    const summary = `Tested ${stats.total} endpoints: ${stats.passed} passed, ${stats.failed} failed (avg response: ${stats.averageResponseTime}ms)`;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary,
            stats,
            results,
            statusGroups,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
            config: {
              timeout,
              maxConcurrency,
              endpointCount: endpoints.length,
            },
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
            summary: `Batch endpoint testing FAILED: ${errorMessage}`,
            partialResults: results.length > 0 ? results : undefined,
          }, null, 2),
        },
      ],
    };
  }
}