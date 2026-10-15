import type { ResendDependencies } from "./resend-access.mjs"
export declare function handleAccessRequest(request: Request, options: {
  dependencies(): ResendDependencies
  schedule(work: () => Promise<unknown>): void
  siteUrl: string
}): Promise<Response>
