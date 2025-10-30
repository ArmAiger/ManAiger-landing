declare global {
  interface Window {
    manaiTrack?: (event: string) => void;
    ttqTrack?: (event: string) => void;
    gtagTrack?: (eventName: string, eventParams?: Record<string, any>) => void;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export {};
