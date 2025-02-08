export interface Author {
  name: string;
  bio?: string;
  socialLinks: string[];
}

export interface Article {
  title: string;
  author: Author;
  publishDate: string;
  content: string;
  summary: string;
  keyPoints: string[];
  url: string;
}

export interface FirecrawlJobResponse {
  jobId: string;
}

export interface FirecrawlJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    formats: {
      extract?: Article;
      html?: string;
      markdown?: string;
    };
  };
  error?: string;
}

export interface FirecrawlResponse {
  success: boolean;
  data: {
    formats: {
      extract?: Article;
      html?: string;
      markdown?: string;
    };
  };
}

export interface FirecrawlResult {
  content: string;
  summary: string;
  keyPoints: string[];
  author?: Author;
  title?: string;
  publishDate?: string;
}
