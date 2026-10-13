export const PDF_BUCKET: "materiais"
export const MAX_PDF_BYTES: number
export const MAX_PDFS_PER_UPLOAD: number
export function isUuid(value: unknown): value is string
export function buildPdfStoragePath(courseId: string, materialId: string): string
export function parsePdfStoragePath(path: unknown, courseId?: string): { courseId: string; materialId: string } | null
export function materialFileRoute(materialId: string): string
export function isMaterialFileRoute(url: unknown): boolean
export function titleFromPdfFilename(filename: string): string
export function validatePdfFile(file: { name: string; type: string; size: number } | null | undefined): string | null
