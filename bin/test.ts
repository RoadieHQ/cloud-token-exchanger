import { AWSToGKEExchanger } from '../src/index';

const testToken = async () => {
  const options = {
    gkeAccountNumber: '163556754530',
    gkeProviderPool: 'roadiehq-aws-accounts',
    gkeServiceAccountEmail: 'nic-test@roadie-dev-283705.iam.gserviceaccount.com',
    gkeProviderId: 'roadiehq-dev'
  }
  const awsTokenExchanger = new AWSToGKEExchanger(options);
  const token = await awsTokenExchanger.getToken();
  return token;
}

(async () => {
  const token = await testToken();
  console.log(token);
})().catch(e => {
  console.log(`There was an error ${e}`);
});

export {};