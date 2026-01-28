import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export type FormatType = 'full' | 'date' | 'time' | 'relative';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(
  input: string | Date | undefined, 
  type: FormatType = 'full'
): string {
  if (!input) return "N/A";

  const date = typeof input === 'string' ? new Date(input.replace(' ', 'T')) : input;
  
  if (isNaN(date.getTime())) return "Invalid Date";

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  switch (type) {
    case 'date':
      return date.toLocaleDateString('en-US', dateOptions);
    
    case 'time':
      return date.toLocaleTimeString('en-US', timeOptions);
    
    case 'full':
      return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
    
    case 'relative':
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      
      if (diffInMs < 0) return "Just now"; 
      
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMins / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMins < 1) return "Just now";
      if (diffInMins < 60) return `${diffInMins}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays === 1) return "Yesterday";
      if (diffInDays < 7) return `${diffInDays}d ago`;
      return date.toLocaleDateString('en-US', dateOptions);

    default:
      return date.toLocaleString();
  }
}