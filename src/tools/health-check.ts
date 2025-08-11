import axios from 'axios';
import { z } from 'zod';

const HealthCheckArgsSchema = z.object({
  url: z.string(),
  timeout: z.number().default(5000),
  expectedStatus: z.number().default(200),
});

type HealthCheckArgs = z.infer<typeof HealthCheckArgsSchema>;

export async function healthCheckTool(args: any) {
  const validatedArgs = HealthCheckArgsSchema.parse(args);
  const { url, timeout, expectedStatus } = validatedArgs;

  const diagnosis = {
    connectivity: 'unknown',
    serverResponse: 'unknown',
    contentType: 'unknown',
    potentialIssues: [] as string[],
    troubleshooting: [] as string[],
  };

  try {
    const startTime = Date.now();
    
    const response = await axios({
      method: 'GET',
      url,
      timeout,
      validateStatus: () => true, // Don't throw on any status code
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const isHealthy = response.status === expectedStatus;
    
    // Enhanced diagnostics
    diagnosis.connectivity = 'success';
    diagnosis.serverResponse = `HTTP ${response.status}`;
    diagnosis.contentType = response.headers['content-type'] || 'unknown';

    // Analyze potential issues
    if (response.status >= 500) {
      diagnosis.potentialIssues.push('Server error - internal server problem');
      diagnosis.troubleshooting.push('Check server logs for errors', 'Restart development server', 'Check database connectivity');
    } else if (response.status >= 400) {
      diagnosis.potentialIssues.push('Client error - request or routing issue');
      diagnosis.troubleshooting.push('Verify URL path is correct', 'Check if route exists in application', 'Review authentication requirements');
    } else if (response.status >= 300) {
      diagnosis.potentialIssues.push('Redirection detected');
      diagnosis.troubleshooting.push('Check if redirect is intentional', 'Verify final destination URL');
    }

    if (responseTime > 5000) {
      diagnosis.potentialIssues.push('Slow response time detected');
      diagnosis.troubleshooting.push('Check database performance', 'Review API endpoint efficiency', 'Check network connectivity');
    }

    // Try to parse response body for additional health info
    let healthData = null;
    let contentAnalysis: any = null;
    try {
      if (response.data && typeof response.data === 'object') {
        healthData = response.data;
      } else if (typeof response.data === 'string') {
        contentAnalysis = {
          length: response.data.length,
          containsHtml: response.data.includes('<html'),
          containsError: /error|exception|fail/i.test(response.data),
          isEmpty: response.data.trim().length === 0,
        };
        
        if (contentAnalysis.containsError) {
          diagnosis.potentialIssues.push('Error content detected in response');
          diagnosis.troubleshooting.push('Review server error logs', 'Check application error handling');
        }
        
        if (contentAnalysis.isEmpty) {
          diagnosis.potentialIssues.push('Empty response body');
          diagnosis.troubleshooting.push('Verify endpoint returns expected content', 'Check if endpoint is properly implemented');
        }
      }
    } catch {
      // Ignore parsing errors
    }

    const result = {
      url,
      status: response.status,
      responseTime,
      isHealthy,
      expectedStatus,
      timestamp: new Date().toISOString(),
      headers: response.headers,
      statusText: response.statusText,
      diagnosis,
      healthData,
      contentAnalysis,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...result,
            summary: isHealthy ? 
              `✅ Health check PASSED: ${url} returned ${response.status} in ${responseTime}ms` :
              `❌ Health check FAILED: ${url} returned ${response.status} in ${responseTime}ms`,
            recommendations: generateHealthRecommendations(result),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Enhanced error diagnosis
    diagnosis.connectivity = 'failed';
    
    if (errorMessage.includes('ECONNREFUSED')) {
      diagnosis.potentialIssues.push('Connection refused - server not running');
      diagnosis.troubleshooting.push('Start the development server (npm run dev)', 'Check if port is correct', 'Verify server is binding to correct interface');
    } else if (errorMessage.includes('ENOTFOUND')) {
      diagnosis.potentialIssues.push('DNS/hostname resolution failed');
      diagnosis.troubleshooting.push('Check URL hostname', 'Use localhost instead of custom domains', 'Verify /etc/hosts file if using custom domains');
    } else if (errorMessage.includes('timeout')) {
      diagnosis.potentialIssues.push('Request timeout - server not responding');
      diagnosis.troubleshooting.push('Increase timeout value', 'Check if server is overloaded', 'Review server performance logs');
    } else if (errorMessage.includes('ECONNRESET')) {
      diagnosis.potentialIssues.push('Connection reset by server');
      diagnosis.troubleshooting.push('Check server stability', 'Review server error logs', 'Restart development server');
    } else {
      diagnosis.potentialIssues.push('Unknown connection error');
      diagnosis.troubleshooting.push('Check network connectivity', 'Verify server is running', 'Review firewall settings');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url,
            isHealthy: false,
            error: errorMessage,
            diagnosis,
            timestamp: new Date().toISOString(),
            summary: `❌ Health check FAILED: ${url} - ${errorMessage}`,
            recommendations: [
              'Server appears to be down or unreachable',
              ...diagnosis.troubleshooting,
            ],
          }, null, 2),
        },
      ],
    };
  }
}

function generateHealthRecommendations(result: any): string[] {
  const recommendations: string[] = [];
  
  if (result.isHealthy) {
    recommendations.push('✅ Endpoint is healthy and responding correctly');
    
    if (result.responseTime > 1000) {
      recommendations.push('⚡ Consider optimizing response time (currently ' + result.responseTime + 'ms)');
    }
  } else {
    recommendations.push('❌ Endpoint health check failed - requires attention');
    recommendations.push(...result.diagnosis.troubleshooting);
  }
  
  if (result.diagnosis.potentialIssues.length > 0) {
    recommendations.push('🔍 Issues detected: ' + result.diagnosis.potentialIssues.join(', '));
  }
  
  return recommendations;
}