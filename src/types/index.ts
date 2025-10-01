export interface Product {
  id: number;
  order_date: string //or Date;
  name: string;
  amount: number;
}

// XML Processing Types
export interface IdToTagMap {
  [id: string]: string;
}

export interface IdToPathMap {
  [id: string]: string[];
}

export interface ColumnToIdMap {
  [column: number]: string;
}

export interface XmlProcessingResult {
  rowValues: string[];
  success: boolean;
  error?: string;
}

export interface BatchProcessingResult {
  [filename: string]: XmlProcessingResult;
}

export interface XmlFile {
  name: string;
  content: string;
}

export interface ProcessedXmlData {
  rowValues: string[];
  filename: string;
  processedAt: string;
}