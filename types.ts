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
