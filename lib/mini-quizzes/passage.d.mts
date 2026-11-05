export type PassagePart = { kind: "label" | "title" | "paragraph" | "verse" | "source"; text: string }
export declare function formatPassage(passage: string): PassagePart[]
