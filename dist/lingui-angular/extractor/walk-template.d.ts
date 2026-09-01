export interface ExtractedCall {
    kind: 't' | 'tPlural' | 'tSelect';
    message?: string;
    context?: string;
    id?: string;
    plural?: Record<string, string>;
    select?: Record<string, string>;
    comment?: string;
    line: number;
    column: number;
}
export interface ExtractionWarning {
    reason: string;
    line: number;
    column: number;
    file: string;
}
export interface WalkResult {
    calls: ExtractedCall[];
    warnings: ExtractionWarning[];
    emit(): string;
}
export declare function walkTemplate(source: string, filePath: string): WalkResult;
