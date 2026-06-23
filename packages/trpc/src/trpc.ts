import { initTRPC } from '@trpc/server';
const t = initTRPC.create();
export const router = t.router; // rotuer > function declare
export const procedure = t.procedure; // functions