import { Chef, PairType } from '../features/onsen/enum'
import {
  useAverageBlockTime,
  useBlock,
  useEthPrice,
  useFarms,
  useKashiPairs,
  useMasterChefV1SushiPerBlock,
  useMasterChefV1TotalAllocPoint,
  useMaticPrice,
  useNativePrice,
  useOnePrice,
  useStakePrice,
  useSushiPairs,
  useSushiPrice,
} from '../services/graph'

import { ChainId } from '@sushiswap/sdk'
import { getAddress } from '@ethersproject/address'
import useActiveWeb3React from './useActiveWeb3React'
import { useCallback, useMemo } from 'react'
import { usePositions } from '../features/onsen/hooks'
import { aprToApy } from '../functions/convert/apyApr'

import { Token, ZERO, JSBI, MASTERCHEF_ADDRESS } from '@sushiswap/sdk'
import { useTokenBalances } from '../state/wallet/hooks'
import { useMasterChefContract } from '.'
import { useSingleCallResult } from '../state/multicall/hooks'

export function useMasterInfoCheck() {
  const { account } = useActiveWeb3React()

  const contract = useMasterChefContract(false)

  // Deposit
  const rewardPerBlock = useCallback(async () => {
    try {
      let tx = await contract?.obelPerBlock()
      return tx
    } catch (e) {
      console.error(e)
      return e
    }
  }, [account, contract])
  return { rewardPerBlock }
}

export function useMasterChefRewardPerBlock() {
  // const { account, chainId } = useActiveWeb3React()

  const { rewardPerBlock } = useMasterInfoCheck()

  const chainId = ChainId.CRO

  const contract = useMasterChefContract(false)

  const info = useSingleCallResult(contract, 'obelPerBlock')?.result

  const value = info?.[0]

  const amount = value ? JSBI.BigInt(value.toString()) : undefined

  return useMemo(() => {
    if (amount) {
      const rewardPerblock = JSBI.toNumber(amount) / 1e18
      return rewardPerblock
    }
    return 0
  }, [amount])
}

export default function useFarmRewards() {
  const { chainId } = useActiveWeb3React()

  // const positions = usePositions(chainId)

  const block1w = useBlock({ daysAgo: 7, chainId })

  const farms = [
    {
      accSushiPerShare: '',
      allocPoint: 100,
      balance: 0,
      chef: 0,
      id: '0',
      lastRewardTime: 1631266290,
      owner: {
        id: '0xFA01e72d662E1d8d7cb0f9D98A9bA9f6cC450490',
        totalAllocPoint: 100,
      },
      pair: '0xd2285E1DfF5714a03abB081572e68929bdbC3204',
      slpBalance: 0,
      userCount: '0',
    },
  ]

  const liquidityTokens = useMemo(
    () =>
      farms.map((farm) => {
        const token = new Token(chainId, getAddress(farm.pair), 18, 'GTLP')
        return token
      }),
    [farms]
  )

  const stakedBalaces = useTokenBalances(MASTERCHEF_ADDRESS[ChainId.CRO], liquidityTokens)

  console.log('stakedBalaces:', stakedBalaces, MASTERCHEF_ADDRESS[ChainId.CRO], liquidityTokens)

  // const farms = useFarms({ chainId })
  const farmAddresses = useMemo(() => farms.map((farm) => farm.pair), [farms])
  // const swapPairs = useSushiPairs({ subset: farmAddresses, shouldFetch: !!farmAddresses, chainId })
  // const swapPairs1w = useSushiPairs({
  //   subset: farmAddresses,
  //   block: block1w,
  //   shouldFetch: !!block1w && !!farmAddresses,
  //   chainId,
  // })
  // const kashiPairs = useKashiPairs({ subset: farmAddresses, shouldFetch: !!farmAddresses, chainId })

  const averageBlockTime = useAverageBlockTime()
  const masterChefV1TotalAllocPoint = 100 //
  const masterChefV1SushiPerBlock = useMasterChefRewardPerBlock() // useMasterChefV1SushiPerBlock()

  const [sushiPrice, ethPrice, maticPrice, stakePrice, onePrice] = [
    useSushiPrice(),
    useEthPrice(),
    useMaticPrice(),
    useStakePrice(),
    useOnePrice(),
  ]

  const obelPrice = 0.02

  const blocksPerDay = 86400 / Number(averageBlockTime)

  const map = (pool) => {
    // TODO: Deal with inconsistencies between properties on subgraph
    pool.owner = pool?.owner || pool?.masterChef || pool?.miniChef
    pool.balance = pool?.balance || pool?.slpBalance

    // const swapPair = swapPairs?.find((pair) => pair.id === pool.pair)
    // const swapPair1w = swapPairs1w?.find((pair) => pair.id === pool.pair)
    // const kashiPair = kashiPairs?.find((pair) => pair.id === pool.pair)

    // const pair = swapPair
    const pair = {
      decimals: 18,
      id: '0xd2285E1DfF5714a03abB081572e68929bdbC3204',
      reserve0: 0.0887405995540289756,
      reserve1: 0.04641,
      reserveETH: 1183.351142427706157233201110976883,
      reserveUSD: 0.004,
      timestamp: 1621898381,
      token0: {
        derivedETH: 0.0003068283960261003490764609134664169,
        id: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
        name: 'Wrapped CRO',
        symbol: 'WCRO',
        totalSupply: 1680,
      },
      token0Price: 0.749748,
      token1: {
        derivedETH: 0.034,
        id: '0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03',
        name: 'VVSToken',
        symbol: 'VVS',
        totalSupply: 16840,
      },

      token1Price: 0.014,
      totalSupply: 0.316227765016,
      trackedReserveETH: 1183.351142427706157233201110976883,
      txCount: 81365,
      type: 0,
      untrackedVolumeUSD: 46853.79482616671033425777223395,
      volumeUSD: 4684.23711596607606598865310647,
    }

    // const pair1w = swapPair1w

    const type = PairType.SWAP // swapPair ? PairType.SWAP : PairType.KASHI

    const blocksPerHour = 3600 / averageBlockTime

    function getRewards() {
      // TODO: Some subgraphs give sushiPerBlock & sushiPerSecond, and mcv2 gives nothing
      const sushiPerBlock =
        pool?.owner?.sushiPerBlock / 1e18 ||
        (pool?.owner?.sushiPerSecond / 1e18) * averageBlockTime ||
        masterChefV1SushiPerBlock

      const rewardPerBlock = (pool.allocPoint / pool.owner.totalAllocPoint) * sushiPerBlock

      const defaultReward = {
        token: 'OBEL',
        icon: '/obel.jpg',
        rewardPerBlock,
        rewardPerDay: rewardPerBlock * blocksPerDay,
        rewardPrice: obelPrice,
      }

      let rewards = [defaultReward]

      if (pool.chef === Chef.MASTERCHEF_V2) {
        // override for mcv2...
        pool.owner.totalAllocPoint = masterChefV1TotalAllocPoint

        const icon = ['0', '3', '4', '8'].includes(pool.id)
          ? `https://raw.githubusercontent.com/sushiswap/icons/master/token/${pool.rewardToken.symbol.toLowerCase()}.jpg`
          : `https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/ethereum/assets/${getAddress(
              pool.rewarder.rewardToken
            )}/logo.png`

        const decimals = 10 ** pool.rewardToken.decimals

        const rewardPerBlock =
          pool.rewardToken.symbol === 'ALCX'
            ? pool.rewarder.rewardPerSecond / decimals
            : (pool.rewarder.rewardPerSecond / decimals) * averageBlockTime

        const rewardPerDay =
          pool.rewardToken.symbol === 'ALCX'
            ? (pool.rewarder.rewardPerSecond / decimals) * blocksPerDay
            : (pool.rewarder.rewardPerSecond / decimals) * averageBlockTime * blocksPerDay

        const reward = {
          token: pool.rewardToken.symbol,
          icon: icon,
          rewardPerBlock: rewardPerBlock,
          rewardPerDay: rewardPerDay,
          rewardPrice: pool.rewardToken.derivedETH * ethPrice,
        }

        rewards[1] = reward
      } else if (pool.chef === Chef.MINICHEF) {
        const sushiPerSecond = ((pool.allocPoint / pool.miniChef.totalAllocPoint) * pool.miniChef.sushiPerSecond) / 1e18
        const sushiPerBlock = sushiPerSecond * averageBlockTime
        const sushiPerDay = sushiPerBlock * blocksPerDay
        const rewardPerSecond =
          ((pool.allocPoint / pool.miniChef.totalAllocPoint) * pool.rewarder.rewardPerSecond) / 1e18
        const rewardPerBlock = rewardPerSecond * averageBlockTime
        const rewardPerDay = rewardPerBlock * blocksPerDay

        const reward = {
          [ChainId.MATIC]: {
            token: 'MATIC',
            icon: 'https://raw.githubusercontent.com/sushiswap/icons/master/token/polygon.jpg',
            rewardPrice: maticPrice,
            rewardPerBlock,
            rewardPerDay,
          },
          [ChainId.XDAI]: {
            token: 'STAKE',
            icon: 'https://raw.githubusercontent.com/sushiswap/icons/master/token/stake.jpg',
            rewardPerBlock,
            rewardPerDay,
            rewardPrice: stakePrice,
          },
          [ChainId.HARMONY]: {
            token: 'ONE',
            icon: 'https://raw.githubusercontent.com/sushiswap/icons/master/token/one.jpg',
            rewardPrice: onePrice,
          },
        }

        rewards[0] = {
          ...defaultReward,
          rewardPerBlock: sushiPerBlock,
          rewardPerDay: sushiPerDay,
        }

        if (chainId in reward) {
          rewards[1] = reward[chainId]
        }
      }

      return rewards
    }

    const rewards = getRewards()

    let balance = Number(pool.balance / 1e18)

    if (stakedBalaces) {
      const stakedBalance = Object.values(stakedBalaces).find(
        (token) => token.currency.address.toLowerCase() === pool.pair.toLowerCase()
      )
      console.log('stakedBalace:', pool.pair, stakedBalance?.toExact())
      if (stakedBalance) {
        balance = parseFloat(stakedBalance.toExact())
      }
    }

    const tvl = (balance / Number(pair.totalSupply)) * Number(pair.reserveUSD)

    const feeApyPerYear = pair
      ? aprToApy((((((pair?.volumeUSD - pair?.volumeUSD) * 0.0025) / 7) * 365) / pair?.reserveUSD) * 100, 3650) / 100
      : 0

    const feeApyPerMonth = feeApyPerYear / 12
    const feeApyPerDay = feeApyPerMonth / 30
    const feeApyPerHour = feeApyPerDay / blocksPerHour

    const roiPerBlock =
      rewards.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.rewardPerBlock * currentValue.rewardPrice
      }, 0) / tvl

    const rewardAprPerHour = roiPerBlock * blocksPerHour
    const rewardAprPerDay = rewardAprPerHour * 24
    const rewardAprPerMonth = rewardAprPerDay * 30
    const rewardAprPerYear = rewardAprPerMonth * 12

    const roiPerHour = rewardAprPerHour + feeApyPerHour
    const roiPerMonth = rewardAprPerMonth + feeApyPerMonth
    const roiPerDay = rewardAprPerDay + feeApyPerDay
    const roiPerYear = rewardAprPerYear + feeApyPerYear

    // const position = positions.find((position) => position.id === pool.id && position.chef === pool.chef)

    return {
      ...pool,
      pair: {
        ...pair,
        decimals: 18,
        type,
      },
      balance,
      feeApyPerHour,
      feeApyPerDay,
      feeApyPerMonth,
      feeApyPerYear,
      rewardAprPerHour,
      rewardAprPerDay,
      rewardAprPerMonth,
      rewardAprPerYear,
      roiPerBlock,
      roiPerHour,
      roiPerDay,
      roiPerMonth,
      roiPerYear,
      rewards,
      tvl,
    }
  }

  return (
    farms
      // .filter((farm) => {
      //   return swapPairs && swapPairs.find((pair) => pair.id === farm.pair)
      // })
      .map(map)
  )
}
