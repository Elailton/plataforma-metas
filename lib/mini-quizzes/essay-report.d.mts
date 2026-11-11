export const REPORT_BUCKET: string
export const REPORT_MAX_BYTES: number
export function validReportPdf(type: string, size: number, header: string): boolean
export function reportPath(courseId: string, essayId: string, versionId: string): string | null
export function reportHref(essayId: string): string
