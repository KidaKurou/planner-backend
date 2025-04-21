export interface YandexGptMessage {
    role: 'system' | 'user' | 'assistant';
    text: string;
}
  
export interface YandexGptResponse {
    result: {
        alternatives: [
            {
                message: {
                    role: string;
                    text: string;
                };
                status: string;
            }
        ];
        usage: {
            inputTextTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
        modelVersion: string;
    };
}