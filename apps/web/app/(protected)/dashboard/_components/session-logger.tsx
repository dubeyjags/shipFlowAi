"use client";

import { useEffect } from "react";

export default function SessionLogger({ session }: { session: unknown }) {
    useEffect(() => {
        console.log("[Login] Session details:", session);
    }, [session]);

    return null;
}
