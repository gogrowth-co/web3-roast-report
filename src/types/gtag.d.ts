interface Window {
  dataLayer: any[];
  gtag: {
    (
      command: 'js' | 'config' | 'event',
      targetOrEventName: Date | string,
      configOrEventParams?: Record<string, any>
    ): void;
    (
      command: 'get',
      targetId: string,
      fieldName: string,
      callback: (value: unknown) => void
    ): void;
  };
}
