import { AWSToGKEExchanger } from "./index";

const testToken = async () => {
  const options = {
    gkeAccountNumber: "<your account-id>",
    gkeProviderPool: "<your pool>",
    gkeServiceAccountEmail: "<service-account-email>",
    gkeProviderId: "<gkeproviderid>",
  };
  const awsTokenExchanger = new AWSToGKEExchanger(options);
  const token = await awsTokenExchanger.getToken();
  return token;
};

(async () => {
  const token = await testToken();
  console.log(token);
})().catch((e) => {
  console.log(`There was an error ${e}`);
});
