import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Movie {
  id: string;
  title: string;
  year: string;
  rating: string;
  image: string;
  description: string;
  director?: string;
  cast?: string[];
  reviews?: string[];
  trailer_url?: string;
  video_url?: string;
  genre?: string;
  is_featured?: boolean;
}
