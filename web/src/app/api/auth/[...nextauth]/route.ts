import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
	createRequestContext,
	finalizeLogContext,
	withCorrelationHeader,
} from '@/lib/observability/requestContext';

const handler = NextAuth(authOptions);

export async function GET(req: Request): Promise<Response> {
	const requestContext = createRequestContext(req);
	try {
		const response = await handler(req as never);
		return withCorrelationHeader(response, requestContext);
	} catch (error) {
		logger.error({
			event: EVENT_CODES.AUTH_PROVIDER_ERROR,
			domain: 'AUTH',
			message: 'Erreur provider NextAuth sur GET',
			context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
			error,
		});
		throw error;
	}
}

export async function POST(req: Request): Promise<Response> {
	const requestContext = createRequestContext(req);
	try {
		const response = await handler(req as never);
		return withCorrelationHeader(response, requestContext);
	} catch (error) {
		logger.error({
			event: EVENT_CODES.AUTH_PROVIDER_ERROR,
			domain: 'AUTH',
			message: 'Erreur provider NextAuth sur POST',
			context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
			error,
		});
		throw error;
	}
}
