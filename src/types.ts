export interface TokenExchanger {
  getToken(): Promise<any>;
}

export type GKEStsTokenResponse ={
  access_token: string;
  issued_token_type: string;
  token_type: string;
  expires_in: number;
}
  
export type AWSOptions = {
  region?: string;
  assumeRole?: string;
  gkeAccountNumber: string;
  gkeServiceAccountEmail: string;
  gkeProviderPool: string;
  gkeProviderId: string;
}