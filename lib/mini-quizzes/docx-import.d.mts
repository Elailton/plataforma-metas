export interface ParsedDocxQuestion {
  number: number
  statement: string
  alternatives: Array<{ key: string; text: string }>
  correctKey: string
  explanation: string
}

export interface ParsedDocxImage {
  hash: string
  mime: string
  base64: string
  size: number
}

export function unzip(buffer: ArrayBuffer | Uint8Array): Promise<{ names: string[]; read(name: string): Promise<Uint8Array | null> }>
export function parseXml(xml: string): unknown
export function cleanText(value: string): string
export function parseMiniQuizDocx(buffer: ArrayBuffer | Uint8Array): Promise<{
  title: string | null
  questions: ParsedDocxQuestion[]
  images: ParsedDocxImage[]
  warnings: string[]
}>
export function titleFromFilename(filename: string): string
