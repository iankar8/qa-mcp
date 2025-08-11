import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const FrameworkDetectionArgsSchema = z.object({
  projectPath: z.string().default('.'),
});

type FrameworkDetectionArgs = z.infer<typeof FrameworkDetectionArgsSchema>;

interface ProjectInfo {
  framework: string;
  version?: string;
  buildSystem: string;
  packageManager: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  defaultPort: number;
  healthCheckPath: string;
  buildCommand?: string;
  devCommand?: string;
  startCommand?: string;
  testCommand?: string;
}

export async function frameworkDetectionTool(args: any) {
  const validatedArgs = FrameworkDetectionArgsSchema.parse(args);
  const { projectPath } = validatedArgs;

  try {
    const projectInfo: Partial<ProjectInfo> = {
      framework: 'unknown',
      buildSystem: 'unknown',
      packageManager: 'npm',
      scripts: {},
      dependencies: {},
      devDependencies: {},
      defaultPort: 3000,
      healthCheckPath: '/health',
    };

    // Check for package.json (Node.js projects)
    const packageJsonPath = path.join(projectPath, 'package.json');
    let packageJson = null;

    try {
      const packageData = await fs.readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(packageData);
      
      projectInfo.scripts = (packageJson as any).scripts || {};
      projectInfo.dependencies = (packageJson as any).dependencies || {};
      projectInfo.devDependencies = (packageJson as any).devDependencies || {};
      projectInfo.version = (packageJson as any).version;
    } catch {
      // package.json not found or invalid
    }

    // Detect package manager
    const lockFiles = {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'bun.lockb': 'bun',
    };

    for (const [lockFile, manager] of Object.entries(lockFiles)) {
      try {
        await fs.access(path.join(projectPath, lockFile));
        projectInfo.packageManager = manager;
        break;
      } catch {
        // Lock file doesn't exist
      }
    }

    // Framework detection logic
    if (packageJson) {
      // Next.js detection
      if ((packageJson as any).dependencies?.next || (packageJson as any).devDependencies?.next) {
        projectInfo.framework = 'Next.js';
        projectInfo.buildSystem = 'Next.js';
        projectInfo.defaultPort = 3000;
        projectInfo.healthCheckPath = '/api/health';
        projectInfo.devCommand = 'next dev';
        projectInfo.buildCommand = 'next build';
        projectInfo.startCommand = 'next start';

        // Check for existing health endpoint
        try {
          await fs.access(path.join(projectPath, 'src/app/api/health'));
          projectInfo.healthCheckPath = '/api/health';
        } catch {
          try {
            await fs.access(path.join(projectPath, 'pages/api/health.js'));
            projectInfo.healthCheckPath = '/api/health';
          } catch {
            projectInfo.healthCheckPath = '/'; // Fallback to root
          }
        }
      }
      // React detection (without Next.js)
      else if ((packageJson as any).dependencies?.react || (packageJson as any).devDependencies?.react) {
        if ((packageJson as any).dependencies?.['react-scripts'] || (packageJson as any).devDependencies?.['react-scripts']) {
          projectInfo.framework = 'Create React App';
          projectInfo.buildSystem = 'React Scripts';
          projectInfo.defaultPort = 3000;
        } else if ((packageJson as any).dependencies?.vite || (packageJson as any).devDependencies?.vite) {
          projectInfo.framework = 'React + Vite';
          projectInfo.buildSystem = 'Vite';
          projectInfo.defaultPort = 5173;
        } else {
          projectInfo.framework = 'React';
          projectInfo.buildSystem = 'Custom';
        }
        projectInfo.healthCheckPath = '/'; // React apps typically don't have API endpoints
      }
      // Vue.js detection
      else if ((packageJson as any).dependencies?.vue || (packageJson as any).devDependencies?.vue) {
        if ((packageJson as any).dependencies?.vite || (packageJson as any).devDependencies?.vite) {
          projectInfo.framework = 'Vue + Vite';
          projectInfo.buildSystem = 'Vite';
          projectInfo.defaultPort = 5173;
        } else {
          projectInfo.framework = 'Vue.js';
          projectInfo.buildSystem = 'Vue CLI';
          projectInfo.defaultPort = 8080;
        }
      }
      // Express.js detection
      else if ((packageJson as any).dependencies?.express || (packageJson as any).devDependencies?.express) {
        projectInfo.framework = 'Express.js';
        projectInfo.buildSystem = 'Node.js';
        projectInfo.defaultPort = 3000;
        projectInfo.healthCheckPath = '/health';
      }
      // Fastify detection
      else if ((packageJson as any).dependencies?.fastify || (packageJson as any).devDependencies?.fastify) {
        projectInfo.framework = 'Fastify';
        projectInfo.buildSystem = 'Node.js';
        projectInfo.defaultPort = 3000;
        projectInfo.healthCheckPath = '/health';
      }
      // Generic Node.js
      else if ((packageJson as any).main || (packageJson as any).type) {
        projectInfo.framework = 'Node.js';
        projectInfo.buildSystem = 'Node.js';
        projectInfo.defaultPort = 3000;
      }

      // Extract common commands from scripts
      if (projectInfo.scripts) {
        projectInfo.devCommand = projectInfo.scripts.dev || projectInfo.scripts.start || projectInfo.devCommand;
        projectInfo.buildCommand = projectInfo.scripts.build || projectInfo.buildCommand;
        projectInfo.startCommand = projectInfo.scripts.start || projectInfo.startCommand;
        projectInfo.testCommand = projectInfo.scripts.test || projectInfo.testCommand;
      }
    }

    // Check for other framework indicators
    const configFiles = {
      'next.config.js': 'Next.js',
      'next.config.ts': 'Next.js',
      'nuxt.config.js': 'Nuxt.js',
      'nuxt.config.ts': 'Nuxt.js',
      'vite.config.js': 'Vite',
      'vite.config.ts': 'Vite',
      'webpack.config.js': 'Webpack',
      'angular.json': 'Angular',
      'gatsby-config.js': 'Gatsby',
      'remix.config.js': 'Remix',
      'tsconfig.json': 'TypeScript',
    };

    const detectedConfigs: Array<{file: string, framework: string}> = [];
    for (const [configFile, framework] of Object.entries(configFiles)) {
      try {
        await fs.access(path.join(projectPath, configFile));
        detectedConfigs.push({ file: configFile, framework });
        
        // Update framework if not already detected
        if (projectInfo.framework === 'unknown' || framework !== 'TypeScript') {
          if (framework === 'Vite' && projectInfo.framework === 'unknown') {
            projectInfo.framework = 'Vite';
            projectInfo.defaultPort = 5173;
          } else if (framework !== 'TypeScript') {
            projectInfo.framework = framework;
          }
        }
      } catch {
        // Config file doesn't exist
      }
    }

    // Generate smart test suggestions
    const testSuggestions: string[] = [];
    
    if (projectInfo.framework === 'Next.js') {
      testSuggestions.push(
        `Health check: http://localhost:${projectInfo.defaultPort}${projectInfo.healthCheckPath}`,
        `Homepage: http://localhost:${projectInfo.defaultPort}/`,
        `API routes: Check /api/* endpoints`
      );
    } else if (projectInfo.framework?.includes('React')) {
      testSuggestions.push(
        `Homepage: http://localhost:${projectInfo.defaultPort}/`,
        `Static assets: Check /static/* or /public/*`,
        `Console: Check for JavaScript errors`
      );
    } else if (projectInfo.framework?.includes('Express') || projectInfo.framework?.includes('Fastify')) {
      testSuggestions.push(
        `Health check: http://localhost:${projectInfo.defaultPort}/health`,
        `API endpoints: Check documented routes`,
        `Static files: Check /public/* if serving static content`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            projectPath: path.resolve(projectPath),
            ...projectInfo,
            detectedConfigs,
            testSuggestions,
            timestamp: new Date().toISOString(),
            summary: `Detected ${projectInfo.framework} project with ${projectInfo.packageManager} package manager`,
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
            projectPath,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            summary: `Framework detection FAILED: ${projectPath} - ${errorMessage}`,
          }, null, 2),
        },
      ],
    };
  }
}