import { assert } from '@0x/assert';
import { Callback, ErrorCallback, Subprovider } from '@0x/subproviders';
import { fetchAsync } from '@0x/utils';
import { JSONRPCRequestPayload } from 'ethereum-types';

import { InternalServerError } from './errors';

/**
 * This class implements the [web3-provider-engine](https://github.com/MetaMask/provider-engine) subprovider interface.
 * It forwards on JSON RPC requests to the supplied `rpcUrl` endpoint
 */
export class RPCSubprovider extends Subprovider {
    private readonly _rpcUrl: string;
    private readonly _requestTimeoutMs: number;
    /**
     * @param rpcUrl URL to the backing Ethereum node to which JSON RPC requests should be sent
     * @param requestTimeoutMs Amount of miliseconds to wait before timing out the JSON RPC request
     */
    constructor(rpcUrl: string, requestTimeoutMs: number = 20000) {
        super();
        assert.isString('rpcUrl', rpcUrl);
        assert.isNumber('requestTimeoutMs', requestTimeoutMs);
        this._rpcUrl = rpcUrl;
        this._requestTimeoutMs = requestTimeoutMs;
    }
    /**
     * This method conforms to the web3-provider-engine interface.
     * It is called internally by the ProviderEngine when it is this subproviders
     * turn to handle a JSON RPC request.
     * @param payload JSON RPC payload
     * @param _next Callback to call if this subprovider decides not to handle the request
     * @param end Callback to call if subprovider handled the request and wants to pass back the request.
     */
    // tslint:disable-next-line:prefer-function-over-method async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, _next: Callback, end: ErrorCallback): Promise<void> {
        const finalPayload = Subprovider._createFinalPayload(payload);
        const headers = new Headers({
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            Connection: 'keep-alive',
            'Content-Type': 'application/json',
        });

        let response: Response;
        try {
            response = await fetchAsync(
                this._rpcUrl,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(finalPayload),
                    keepalive: true,
                },
                this._requestTimeoutMs,
            );
        } catch (err) {
            end(err);
            return;
        }

        if (!response.ok) {
            const msg = `RPCSubprovider: ${response.status} ${response.statusText}`;
            return end(new InternalServerError(msg));
        }

        let data;
        try {
            data = JSON.parse(await response.text());
        } catch (err) {
            end(err);
            return;
        }

        if (data.error) {
            end(data.error);
            return;
        }
        end(null, data.result);
    }
}
