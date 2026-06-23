'use client';
import { trpc } from "@/trpc/trpc";
export default function Health(){
    const health = trpc.health.useQuery();
    console.log(health.data);
    return (
        <div>
            <h1>Healthy</h1>
            <p>{health.data?.message}</p>
        </div>
    )
}