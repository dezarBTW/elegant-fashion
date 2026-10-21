import { Bachs } from '@bachs/sdk';
export function bachsClient(apiKey=process.env.BACHS_API_KEY){
 return new Bachs({apiKey,environment:apiKey?.startsWith('sk_sandbox_')?'sandbox':'production',timeoutMs:20000});
}
