import { type ExtractionWarning } from './walk-template';
export interface ExtractOptions {
    cwd: string;
    include: string[];
    outDir: string;
}
export interface ExtractResult {
    shimsWritten: number;
    warnings: ExtractionWarning[];
}
export declare function extractTemplates(opts: ExtractOptions): ExtractResult;
export declare function cleanExtracted(cwd: string, outDir: string): void;
