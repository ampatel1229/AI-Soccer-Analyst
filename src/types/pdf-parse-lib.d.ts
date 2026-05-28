declare module "pdf-parse/lib/pdf-parse.js" {
  type ParseResult = {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  };

  type ParseOptions = {
    max?: number;
    version?: string;
  };

  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: ParseOptions): Promise<ParseResult>;
  export default pdfParse;
}

