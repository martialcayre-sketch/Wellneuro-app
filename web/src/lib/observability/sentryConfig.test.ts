import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../../');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('sentry config privacy guards', () => {
  it('scrubs request data in server and edge configs', () => {
    const server = read('sentry.server.config.ts');
    const edge = read('sentry.edge.config.ts');

    for (const content of [server, edge]) {
      expect(content).toContain('delete event.request.cookies');
      expect(content).toContain('delete event.request.headers');
      expect(content).toContain('delete event.request.data');
      expect(content).toContain("event.request.url = event.request.url.split('?')[0]");
    }
  });
});
