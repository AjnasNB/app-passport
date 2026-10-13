import fs from 'node:fs/promises';
import path from 'node:path';
import {privateKeyToAccount} from 'viem/accounts';
import {createPublicClient} from '@arkiv-network/sdk';
import {tiramisu} from '@arkiv-network/sdk/chains';
import {http} from 'viem';
import type {Policy} from '../packages/sdk/src/index';
import {RPC} from '../packages/sdk/src/arkiv';

export async function operators(){
 const outside=path.join(process.env.LOCALAPPDATA!,'ScamSignal');
 const file=process.env.PASSPORT_WALLET_FILE||path.join(outside,'passport-wallets.json');
 const resolved=await fs.realpath(file);const relative=path.relative(await fs.realpath(process.cwd()),resolved);
 if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw new Error('Wallet credentials must stay outside the repository');
 const wallet=JSON.parse(await fs.readFile(resolved,'utf8'));
 const reviewer=privateKeyToAccount(wallet.reviewer_private_key);
 const key=(await fs.readFile(process.env.PASSPORT_ARKIV_KEY_FILE||path.join(outside,'arkiv-access-key.txt'),'utf8')).trim();
 const headers={'X-API-KEY':key};
 const producer=privateKeyToAccount(wallet.producer_private_key);
 const transport=http(RPC,{timeout:18000,retryCount:0,fetchOptions:{headers}});
 const reader=createPublicClient({chain:tiramisu,transport});
 if(await reader.getBalance({address:producer.address})===0n)throw new Error('Fund the dedicated producer with free Tiramisu testnet GLM');
 const policy:Policy={issuers:[producer.address],reviewers:[reviewer.address],scope:'identity-and-protocol'};
 return {producer,reviewer,policy,headers,reader};
}
