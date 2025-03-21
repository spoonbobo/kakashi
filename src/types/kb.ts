export interface Document {
    // Content fields
    content?: string;           // The actual text content (optional)
    content_path?: string;      // Path to content file (recommended for large documents)
    embedding?: number[];       // Vector representation
    
    // Core metadata
    id: string;                 // Unique identifier
    metadata: DocumentMetadata; // Detailed metadata
    
    // Relationships
    parent_id?: string;         // Parent document reference
    child_ids?: string[];       // Child document references
  }
  
export interface DocumentMetadata {
    // Source information
    source: {
      type: 'file' | 'web' | 'api' | 'manual';
      name: string;
      url?: string;
      file_type?: string;
    };
    
    // Document information
    title: string;
    author?: string[];
    created_at?: Date;
    last_modified?: Date;
    ingested_at: Date;
    
    // Content classification
    language: string;
    document_type: string;      // paper, article, manual, etc.
    tags: string[];
    topics?: string[];
    categories?: string[];
    
    // Chunking information
    chunk_info?: {
      index: number;
      total_chunks: number;
      chunk_strategy: string;   // e.g., "fixed", "semantic", "recursive"
      chunk_size: number;
      overlap: number;
      section?: string;
    };
    
    // Embedding information
    embedding_info?: {
      model: string;            // e.g., "text-embedding-ada-002"
      version: string;
      dimensions: number;
      created_at: Date;
    };
    
    // Relevance signals
    relevance_metrics?: {
      importance: number;       // 0-1 scale
      recency: number;          // 0-1 scale
      view_count: number;
      feedback_score?: number;  // e.g., user ratings
    };
    
    // Domain-specific metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }