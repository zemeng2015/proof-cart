import {describe, expect, it} from 'vitest';
import {rejectUnsupportedMethod} from '../../app/lib/request-policy.server';

describe('read-only request boundary', () => {
  it.each(['GET', 'HEAD'])('allows %s for routing', (method) => {
    expect(rejectUnsupportedMethod(new Request('http://localhost/', {method}))).toBeUndefined();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects %s before route execution', async (method) => {
    const response = rejectUnsupportedMethod(new Request('http://localhost/', {method}));
    expect(response?.status).toBe(405);
    expect(response?.headers.get('Allow')).toBe('GET, HEAD');
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
    expect(await response?.text()).toBe('This preview is read-only.');
  });
});
