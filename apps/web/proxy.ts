import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@monorepo/auth";
import { SIGN_IN_PATH, getSafeCallbackPath } from "@/lib/auth-routes";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = await auth.api.getSession({ headers: request.headers });

    if (pathname === SIGN_IN_PATH) {
        if (session?.user) {
            // Already signed in — send to safe callbackUrl or dashboard
            const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
            return NextResponse.redirect(
                new URL(getSafeCallbackPath(callbackUrl), request.url)
            );
        }
        return NextResponse.next();
    }

    // All other matched routes are protected
    if (!session?.user) {
        // Preserve the original destination so the user lands there after sign-in
        const callbackUrl = pathname + request.nextUrl.search;
        return NextResponse.redirect(
            new URL(
                `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
                request.url
            )
        );
    }

    // Pass pathname downstream so the layout can use it as a fallback callbackUrl
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export const config = {
    matcher: ["/sign-in", "/dashboard", "/dashboard/:path*"],
};
