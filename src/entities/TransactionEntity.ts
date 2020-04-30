import { assert } from '@0x/assert';
import { BigNumber } from '@0x/utils';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ONE_SECOND_MS } from '../constants';
import { TransactionStates } from '../types';

import { BigNumberTransformer } from './transformers';
import { TransactionEntityOpts } from './types';

@Entity({ name: 'transactions' })
export class TransactionEntity {
    @PrimaryColumn({ name: 'hash', type: 'varchar' })
    public hash: string;

    @Column({ name: 'status', type: 'varchar' })
    public status: string;

    @Column({ name: 'expected_mined_in_sec', type: 'int' })
    public expectedMinedInSec?: number;

    @Column({ name: 'nonce', type: 'bigint' })
    public nonce: number;

    @Column({ name: 'gas_price', type: 'varchar', transformer: BigNumberTransformer })
    public gasPrice: BigNumber;

    @Column({ name: 'block_number', type: 'bigint', nullable: true })
    public blockNumber?: number;

    @Column({ name: 'meta_txn_relayer_address', type: 'varchar' })
    public metaTxnRelayerAddress: string;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt?: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt?: Date;

    @Column({ name: 'expected_at', type: 'timestamptz' })
    public expectedAt: Date;

    public static make(opts: TransactionEntityOpts): TransactionEntity {
        assert.isHexString('hash', opts.hash);
        assert.isETHAddressHex('metaTxnRelayerAddress', opts.metaTxnRelayerAddress);
        assert.doesBelongToStringEnum('status', opts.status, TransactionStates);
        if (!Number.isInteger(opts.nonce) && opts.nonce >= 0) {
            throw new Error(`Expected nonce to be an integer, encountered: ${opts.nonce}`);
        }
        if (opts.blockNumber !== undefined && !Number.isInteger(opts.blockNumber) && opts.blockNumber <= 0) {
            throw new Error(`Expected blockNumber to be a positive integer, encountered: ${opts.blockNumber}`);
        }
        return new TransactionEntity(opts);
    }

    // HACK(oskar) we want all fields to be set and valid, otherwise we should
    // not accept a transaction entity, however because of this issue:
    // https://github.com/typeorm/typeorm/issues/1772 we cannot accept undefined
    // as an argument to the constructor, to not break migrations with
    // serialize. Please use the public static make method instead.
    private constructor(
        opts: TransactionEntityOpts = {
            hash: '',
            status: '',
            expectedMinedInSec: 120,
            nonce: 0,
            gasPrice: new BigNumber(0),
            metaTxnRelayerAddress: '',
        },
    ) {
        this.hash = opts.hash;
        this.status = opts.status;
        this.expectedMinedInSec = opts.expectedMinedInSec;
        this.nonce = opts.nonce;
        this.gasPrice = opts.gasPrice;
        this.blockNumber = opts.blockNumber;
        this.metaTxnRelayerAddress = opts.metaTxnRelayerAddress;
        const now = new Date();
        this.expectedAt = new Date(now.getTime() + this.expectedMinedInSec * ONE_SECOND_MS);
    }
}