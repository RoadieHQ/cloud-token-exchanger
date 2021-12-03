export interface TokenExchanger {
  getToken(): Promise<any>;
}

export type GKEAccessTokenResponse = {
  access_token: string;
  issued_token_type: string;
  token_type: string;
  expires_in: number;
  error?: string;
  error_description?: string;
};

export type GKEOAuthTokenResponse = {
  expireTime: string;
  accessToken: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
};

export type AWSOptions = {
  region?: string;
  assumeRole?: string;
  gkeAccountNumber: string;
  gkeServiceAccountEmail: string;
  gkeProviderPool: string;
  gkeProviderId: string;
};
