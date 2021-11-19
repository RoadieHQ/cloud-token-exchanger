// import AWS from 'aws-sdk';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/types'
import { defaultProvider } from "@aws-sdk/credential-provider-node";
// import AWS from 'aws-sdk';
// import { Signers } from 'aws-sdk/lib/signers/v4'
import { Sha256 } from '@aws-crypto/sha256-browser';
import fetch from 'node-fetch';
import logger from './logger';
import { AWSOptions, TokenExchanger, GKEStsTokenResponse } from './types';

export class AWSToGKEExchanger implements TokenExchanger {
  DEFAULT_REGION = 'eu-west-1';
  private readonly region: string;
  private readonly providerId: string;
  private readonly providerPool: string;
  private readonly accountNumber: string;
  private readonly email: string;
  private accessToken: GKEStsTokenResponse;

  constructor(options: AWSOptions){
    this.region = options.region || this.DEFAULT_REGION;
    this.email = options.gkeServiceAccountEmail;
    this.providerId = options.gkeProviderId;
    this.providerPool = options.gkeProviderPool;
    this.accountNumber = options.gkeAccountNumber;
  }

  private createRequest = async (): Promise<HttpRequest> => {
    // const url = `https://sts.${this.region}.amazonaws.com`;
    // const endpoint = new AWS.Endpoint(url);
    // const request = new AWS.HttpRequest(endpoint, this.region);
  
    // request.method = 'POST';
    // request.headers['host'] = endpoint.hostname;
    // request.path = '/?Action=GetCallerIdentity&Version=2011-06-15';
    // request.headers['Content-Type'] = 'application/plain-text';
  
    // const credentials = new AWS.EnvironmentCredentials('AWS');
    // const signer = new AWS.Signers.V4(request, 'sts');
    // signer.addAuthorization(credentials, new Date());
  
    // return request;
    const url = `https://sts.${this.region}.amazonaws.com`;
    const request: HttpRequest = {
      method: 'POST',
      headers: {
        host: url,
        'Content-Type': 'application/plain-text'
      },
      path: '/?Action=GetCallerIdentity&Version=2011-06-15',
      protocol: 'HTTPS',
      hostname: url
    }
    // Sign the request
    const signer = new SignatureV4({
      credentials: defaultProvider(),
      region: this.region,
      service: 'es',
      sha256: Sha256
    });
  
    return await signer.sign(request);
  }

  private generateTokenPayload = (data) => {
    const headers = [
      {
        "key":"Authorization",
        "value": data.headers['Authorization']
      },
      {
        "key":"host",
        "value": data.headers['host']
      },
      {
        "key":"x-amz-date",
        "value":data.headers['X-Amz-Date']
      },
      {
        "key":"x-goog-cloud-target-resource",
        "value":`//iam.googleapis.com/projects/${this.accountNumber}/locations/global/workloadIdentityPools/${this.providerPool}/providers/${this.providerId}`
      },
      {
        "key":"x-amz-security-token",
        "value": data.headers['x-amz-security-token']
      }
    ]
    return JSON.stringify(
      {
        "headers": headers,
        "method": "POST",
        "url": `${data.url}`
      }    
    )
  }

  private generatePayload = (token) => {
    return JSON.stringify({
      audience : `//iam.googleapis.com/projects/${this.accountNumber}/locations/global/workloadIdentityPools/${this.providerPool}/providers/${this.providerId}`,
      grantType : "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType : "urn:ietf:params:oauth:token-type:access_token",
      scope : "https://www.googleapis.com/auth/cloud-platform",
      subjectTokenType : "urn:ietf:params:aws:token-type:aws4_request",
      subjectToken: token
    })
  };

  private getAccessToken = async (data): Promise<string> => {
    const serializedTokenPayload = this.generateTokenPayload(data);
    const payload = this.generatePayload(encodeURIComponent(serializedTokenPayload));
    return await fetch("https://sts.googleapis.com/v1/token", {
      method: "POST", 
      body: payload,
      headers: {
        'Content-Type': 'text/json; charset=utf-8'
      }
    }).then(res => {
      return res.json()
    }).then((res) => {
      const gkeSTSResponse: GKEStsTokenResponse = res as GKEStsTokenResponse;
      return gkeSTSResponse.access_token as string;
    }
    ).catch((err) => {
      logger.error(`There was an error ${err}`)
      throw new Error("Unable to get access token");
    });
  }

  private getOauthToken = async (token) : Promise<GKEStsTokenResponse>=> {
    const email = this.email.replace('@', '%40');
    return await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${email}:generateAccessToken`, {
        method: "POST",
        headers: {
          'Content-Type': 'text/json; charset=utf-8',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({"scope": [ "https://www.googleapis.com/auth/cloud-platform" ]})
      }).then(res => {
        return res.json()
      }).then( (res) => {
        const oauthResponse: GKEStsTokenResponse = res as GKEStsTokenResponse;
        return oauthResponse;
      }).catch((err) => {
        logger.error(`There was an error ${err}`)
        throw new Error("Unable to get OAuth token");
      });
    }

  getToken = async ():Promise<string> => {
    if(!this.accessToken){
      return this.accessToken.access_token;
    }
    const signedRequest: HttpRequest = await this.createRequest();
    const transformed = {
      url: `https://${signedRequest.hostname}/?${signedRequest.query}`,
      headers: signedRequest.headers,
      body: signedRequest.body,
    };
  
    const accessToken: string = await this.getAccessToken(transformed);
    const oauth: GKEStsTokenResponse = await this.getOauthToken(accessToken);
    logger.info(`This is your oauth token: ${oauth}`);
    this.accessToken = oauth;
    return this.accessToken.access_token;
  }
}

