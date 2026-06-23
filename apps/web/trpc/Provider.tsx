'use client';
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./trpc";

export function Provider({ children }: { children: React.ReactNode }) {
    // React Query client — manages server state caching, background refetching, etc.
    const [queryClient] = useState(() => new QueryClient());

    // tRPC client — batches multiple procedure calls into a single HTTP request to /trpc
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: "http://localhost:5000/trpc",
                }),
            ],
        })
    );

    // trpc.Provider bridges tRPC with React Query so tRPC hooks use the shared queryClient
    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}

/*
 * What this file does:
 * ---------------------
 * Sets up the tRPC + React Query context for the entire Next.js app.
 *
 * - QueryClient      → React Query's cache store. Holds all server-state (queries/mutations).
 * - trpcClient       → HTTP client that sends batched requests to the Express backend at
 *                      http://localhost:5000/trpc using tRPC's httpBatchLink.
 * - trpc.Provider    → Makes tRPC hooks (trpc.*.useQuery / useMutation) available in the tree.
 * - QueryClientProvider → Makes React Query hooks (useQuery, useMutation) available in the tree.
 *
 * Both providers share the same queryClient so tRPC and React Query stay in sync.
 * Wrap the root layout (layout.tsx) with this Provider to enable tRPC across the whole app.
 */