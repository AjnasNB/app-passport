export function approveRelease(artifactDigest: string, reviewValid: boolean) { return artifactDigest.startsWith("sha256:") && reviewValid; }
