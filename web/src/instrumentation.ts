import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';

export async function register(): Promise<void> {
  // Capture des erreurs Node non interceptées au niveau process.
  process.on('unhandledRejection', reason => {
    logger.error({
      event: EVENT_CODES.SYSTEM_UNHANDLED_ERROR,
      domain: 'SYSTEM',
      message: 'Unhandled promise rejection',
      context: {
        environment: process.env.VERCEL_ENV === 'production' ? 'production' : 'development',
        release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
        runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
      },
      error: reason,
    });
  });

  process.on('uncaughtException', error => {
    logger.fatal({
      event: EVENT_CODES.SYSTEM_UNHANDLED_ERROR,
      domain: 'SYSTEM',
      message: 'Uncaught exception',
      context: {
        environment: process.env.VERCEL_ENV === 'production' ? 'production' : 'development',
        release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
        runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
      },
      error,
      metadata: { retryable: false },
    });
  });
}
