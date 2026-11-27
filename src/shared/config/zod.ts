import { z } from 'zod';

// CSP enforces script-src 'self' without 'unsafe-eval'; disable Zod v4 JIT new Function() probing.
export const zodSecurityConfig = z.config({ jitless: true });
