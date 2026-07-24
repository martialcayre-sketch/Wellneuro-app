import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { deploymentEnv, releaseSha } from '@/lib/observability/deploymentEnv';

export async function register(): Promise<void> {
  const context = {
    environment: deploymentEnv(),
    release: releaseSha(),
    runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
  };

  // Capture des erreurs Node non interceptées au niveau process.
  process.on('unhandledRejection', reason => {
    logger.error({
      event: EVENT_CODES.SYSTEM_UNHANDLED_ERROR,
      domain: 'SYSTEM',
      message: 'Unhandled promise rejection',
      context,
      error: reason,
    });
  });

  process.on('uncaughtException', error => {
    logger.fatal({
      event: EVENT_CODES.SYSTEM_UNHANDLED_ERROR,
      domain: 'SYSTEM',
      message: 'Uncaught exception',
      context,
      error,
      metadata: { retryable: false },
    });
  });
}
