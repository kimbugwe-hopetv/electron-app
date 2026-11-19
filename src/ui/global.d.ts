
export {};

declare global {
  interface Window {
    databaseAPI: {
      getCollection: (
        collectionName: string
      ) => Promise<{
        success: boolean;
        data: any[];
        message?: string;
      }>;

      getStatistics: () => Promise<{
        success: boolean;
        data?: {
          transactions: number;
          assessments: number;
          incentives: number;
          taxpayers: number;
          total: number;
        };
        message?: string;
      }>;

      testConnection: () => Promise<{
        success: boolean;
        message: string;
      }>;
    };
  }
}
