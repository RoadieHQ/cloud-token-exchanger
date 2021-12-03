# cloud-token-exchanger

This is a simple token exchanger library that currently supports AWS -> GKE. Feel free to add more functionality + tests.

AWS -> GKE

```
import { AWSToGKEExchanger } from 'aws-google-token-exchange';

const options = {
    gkeAccountNumber: '<your account-id>',
    gkeProviderPool: '<your pool>',
    gkeServiceAccountEmail: '<service-account-email>',
    gkeProviderId: '<gkeproviderid>'
}
const awsTokenExchanger = new AWSToGKEExchanger(options);
const token = await awsTokenExchanger.getToken();
```

# TODO

GKE -> AWS
