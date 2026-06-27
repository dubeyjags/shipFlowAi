export const SIGN_IN_PATH = "/sign-in";
export const DEFAULT_AUTH_CALLBACK = "/dashboard";

export function getSafeCallbackPath(callbackUrl: string | null | undefined): string {
    if (!callbackUrl) return DEFAULT_AUTH_CALLBACK;
    // Allow only relative paths: starts with "/" but not "//" (protocol-relative)
    if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
        return callbackUrl;
    }
    return DEFAULT_AUTH_CALLBACK;
}
