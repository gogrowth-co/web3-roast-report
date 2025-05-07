
interface Window {
  dataLayer: any[];
  gtag: (
    command: 'js' | 'config' | 'event',
    targetOrEventName: Date | string,
    configOrEventParams?: Record<string, any>
  ) => void;
}
