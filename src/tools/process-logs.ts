import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

const ProcessLogsArgsSchema = z.object({
  processName: z.string(),
  duration: z.number().default(10000),
  filter: z.string().optional(),
});

type ProcessLogsArgs = z.infer<typeof ProcessLogsArgsSchema>;

export async function processLogsTool(args: any) {
  const validatedArgs = ProcessLogsArgsSchema.parse(args);
  const { processName, duration, filter } = validatedArgs;

  try {
    // First, try to find running processes
    const { stdout: psOutput } = await execAsync(`ps aux | grep "${processName}" | grep -v grep`);
    const processes = psOutput.trim().split('\n').filter(line => line.length > 0);

    if (processes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              processName,
              error: `No running processes found for "${processName}"`,
              timestamp: new Date().toISOString(),
              suggestion: `Try starting your application first (e.g., npm run dev, npm start, etc.)`,
            }, null, 2),
          },
        ],
      };
    }

    // Extract PIDs and process info
    const pids = processes.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        command: parts.slice(10).join(' ')
      };
    });

    const logs: string[] = [];
    const errors: string[] = [];
    const startTime = Date.now();

    // For demo purposes, simulate log collection
    // In a real implementation, you'd connect to actual log sources
    const simulationInterval = setInterval(() => {
      const timestamp = new Date().toISOString();
      
      // Generate some sample log entries
      logs.push(`${timestamp} [INFO] Application running normally`);
      
      // Add some random log types
      const logTypes = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
      const messages = [
        'Request processed successfully',
        'Database query executed',
        'User session created',
        'Cache miss, loading from database',
        'Memory usage: 45%',
        'Network latency: 23ms'
      ];
      
      if (Math.random() > 0.7) {
        const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        logs.push(`${timestamp} [${logType}] ${message}`);
      }

      // Occasionally add an error
      if (Math.random() > 0.95) {
        errors.push(`${timestamp} [ERROR] Simulated error for testing`);
        logs.push(`${timestamp} [ERROR] Simulated error for testing`);
      }
    }, 1000);

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        clearInterval(simulationInterval);
        
        const endTime = Date.now();
        const actualDuration = endTime - startTime;

        // Filter logs if pattern provided
        let filteredLogs = logs;
        if (filter) {
          const regex = new RegExp(filter, 'i');
          filteredLogs = logs.filter(log => regex.test(log));
        }

        // Categorize log levels
        const logLevels = {
          error: filteredLogs.filter(log => /error|err|exception|fail/i.test(log)).length,
          warn: filteredLogs.filter(log => /warn|warning/i.test(log)).length,
          info: filteredLogs.filter(log => /info|log/i.test(log)).length,
          debug: filteredLogs.filter(log => /debug|trace/i.test(log)).length,
        };

        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                processName,
                pids,
                duration: actualDuration,
                logsCount: filteredLogs.length,
                logLevels,
                logs: filteredLogs,
                errors,
                filter,
                timestamp: new Date().toISOString(),
                summary: `Captured ${filteredLogs.length} log entries from ${pids.length} ${processName} process(es) over ${actualDuration}ms`,
                note: "This is a simulation. In production, this would connect to actual log sources like PM2 logs, Docker logs, or application log files."
              }, null, 2),
            },
          ],
        });
      }, duration);
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            processName,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            summary: `Process logs monitoring FAILED: ${processName} - ${errorMessage}`,
          }, null, 2),
        },
      ],
    };
  }
}