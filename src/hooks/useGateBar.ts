import { Currency, SUSHI_ADDRESS, Token } from '@sushiswap/sdk'

import { useSushiBarContract } from './useContract'
import { useTransactionAdder } from '../state/transactions/hooks'

import { ChainId, CurrencyAmount, JSBI } from '@sushiswap/sdk'
import { Dispatch, useCallback, useEffect, useMemo, useState } from 'react'

import { Contract } from '@ethersproject/contracts'

import { Zero } from '@ethersproject/constants'
import concat from 'lodash/concat'
import zip from 'lodash/zip'
import { useChefContract } from '../features/onsen/hooks'
import { useActiveWeb3React, useContract, useTokenContract } from '.'
import { useSingleCallResult } from '../state/multicall/hooks'
import { SUSHI, XSUSHI } from '../config/tokens'
import { useToken } from './Tokens'
import { useTokenBalance } from '../state/wallet/hooks'

export function useGateBar() {
  const { account, chainId } = useActiveWeb3React()

  const gateTokenContract = useTokenContract(SUSHI_ADDRESS[ChainId.CRO])

  const result1 = useSingleCallResult(gateTokenContract, 'balanceOf', [XSUSHI.address])?.result

  const value1 = result1?.[0]

  const amount1 = value1 ? JSBI.BigInt(value1.toString()) : undefined

  const contract = useSushiBarContract()

  const result = useSingleCallResult(contract, 'totalSupply')?.result

  const value = result?.[0]

  const amount = value ? JSBI.BigInt(value.toString()) : undefined

  return useMemo(() => {
    if (amount && amount1) {
      const ratio = JSBI.toNumber(amount1) / JSBI.toNumber(amount)
      const totalSupply = CurrencyAmount.fromRawAmount(XSUSHI, amount)
      return [ratio, totalSupply]
    }
    return [undefined, undefined]
  }, [amount, amount1])
}
