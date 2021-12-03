import aws4, { Request } from "aws4";
import {
  AWSOptions,
  TokenExchanger,
  GKEAccessTokenResponse,
  GKEOAuthTokenResponse,
} from "./types";

const fetch = require("node-fetch");

export class GKEOAuthTokenError extends Error {
  constructor(message: any) {
    super(message); // (1)
    this.name = "GKEOAuthTokenError"; // (2)
  }
}

export class GKEAccessTokenError extends Error {
  constructor(message: any) {
    super(message); // (1)
    this.name = "GKEAccessTokenError"; // (2)
  }
}
export class AWSToGKEExchanger implements TokenExchanger {
  DEFAULT_REGION = "eu-west-1";
  private readonly region: string;
  private readonly providerId: string;
  private readonly providerPool: string;
  private readonly accountNumber: string;
  private readonly email: string;
  private accessToken: GKEOAuthTokenResponse | undefined;

  constructor(options: AWSOptions) {
    this.region = options.region || this.DEFAULT_REGION;
    this.email = options.gkeServiceAccountEmail;
    this.providerId = options.gkeProviderId;
    this.providerPool = options.gkeProviderPool;
    this.accountNumber = options.gkeAccountNumber;
    this.accessToken = undefined;
  }

  private createRequest = (): Request => {
    const opts = {
      host: `sts.${this.region}.amazonaws.com`,
      path: "/?Action=GetCallerIdentity&Version=2011-06-15",
      service: "sts",
      region: this.region,
      method: "POST",
    };
    aws4.sign(opts);
    return opts;
  };

  private generateTokenPayload = (data: any) => {
    const headers = [
      {
        key: "Authorization",
        value: data.headers["Authorization"],
      },
      {
        key: "host",
        value: data.headers["Host"],
      },
      {
        key: "x-amz-date",
        value: data.headers["X-Amz-Date"],
      },
      {
        key: "x-goog-cloud-target-resource",
        value: `//iam.googleapis.com/projects/${this.accountNumber}/locations/global/workloadIdentityPools/${this.providerPool}/providers/${this.providerId}`,
      },
      {
        key: "x-amz-security-token",
        value: data.headers["X-Amz-Security-Token"],
      },
    ];
    return JSON.stringify({
      headers: headers,
      method: "POST",
      url: `${data.url}`,
    });
  };

  private generatePayload = (token: any) => {
    return JSON.stringify({
      audience: `//iam.googleapis.com/projects/${this.accountNumber}/locations/global/workloadIdentityPools/${this.providerPool}/providers/${this.providerId}`,
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subjectTokenType: "urn:ietf:params:aws:token-type:aws4_request",
      subjectToken: token,
    });
  };

  private getAccessToken = async (data: any): Promise<string> => {
    const serializedTokenPayload = this.generateTokenPayload(data);
    const payload = this.generatePayload(
      encodeURIComponent(serializedTokenPayload)
    );
    const res = await fetch("https://sts.googleapis.com/v1/token", {
      method: "POST",
      body: payload,
      headers: {
        "Content-Type": "text/json; charset=utf-8",
      },
    });
    const gkeSTSResponse: GKEAccessTokenResponse = await res.json();
    if (gkeSTSResponse.error) {
      throw new GKEAccessTokenError(
        `Unable to get Access token ${gkeSTSResponse.error_description}`
      );
    }
    return gkeSTSResponse.access_token as string;
  };

  private getOAuthToken = async (
    token: any
  ): Promise<GKEOAuthTokenResponse> => {
    const email = this.email.replace("@", "%40");
    const res = await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${email}:generateAccessToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/json; charset=utf-8",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scope: ["https://www.googleapis.com/auth/cloud-platform"],
        }),
      }
    );
    const body: GKEOAuthTokenResponse = await res.json();
    if (body.error) {
      throw new GKEOAuthTokenError(`Unable to get OAuth ${body.error.message}`);
    }
    return body;
  };

  getToken = async (): Promise<GKEOAuthTokenResponse> => {
    if (!this.accessToken) {
      const signedRequest: Request = await this.createRequest();
      const transformed = {
        url: `https://sts.eu-west-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15`,
        headers: signedRequest.headers,
      };

      const accessToken: string = await this.getAccessToken(transformed);
      const oauth: GKEOAuthTokenResponse = await this.getOAuthToken(
        accessToken
      );
      this.accessToken = oauth;
    }
    return this.accessToken;
  };
}
