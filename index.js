const axios = require('axios')
const moment = require('moment')
const Web3 = require('web3')
const { ApiPromise, WsProvider } = require('@polkadot/api')
const config = require('./config.json');

const BTCURL = config.BTCURL
const ETHURL = config.ETHURL
const STXURL = config.STXURL
const AVAXURL = config.AVAXURL
const MATICURL = config.MATICURL
const ATOMURL = config.ATOMURL
const LTCURL = config.LTCURL
const OPURL = config.OPURL
const ARBURL = config.ARBURL
const DOTURL = config.DOTURL
let dotApi

const sleepSeconds = (s) => {
  return new Promise((resolve) => setTimeout(resolve, s * 1000))
}

const initPolkadot = async () => {
  if (!dotApi) {
    const wsProvider = new WsProvider(DOTURL);
    dotApi = await ApiPromise.create({ provider: wsProvider });
  }
  else {
    return dotApi
  }
}

const getDOTBlockResult = async (indexOrHash) => {
  await initPolkadot()
  const blockHash = (await dotApi.rpc.chain.getBlockHash(indexOrHash)).toString()
  const result = await dotApi.rpc.chain.getBlock(blockHash)
  const timestamp = parseInt(moment(result.block.extrinsics[0].method.args[0]).format('x'))
  return timestamp
}

const getDOTlatestBlock = async () => {
  await initPolkadot()
  const header = await dotApi.rpc.chain.getHeader()
  const block = header.number.toNumber()
  return block
}

const getATOMBlockResult = async (indexOrHash) => {
  let data, timestamp
  data = (await axios.get(`${ATOMURL}/blocks/${indexOrHash}`)).data
  timestamp = parseInt(moment(data.block.header.time).format('x'))
  return timestamp
}
const getATOMlatestBlock = async () => {
  const re = await axios.get(`${ATOMURL}/blocks/latest`)
  const block = re?.data.block.header.height
  return block
}

const getBTCBlockResult = async (chain,indexOrHash) => {
  let data, timestamp
  let URL
  switch (chain) {
    case 'BTC':
      URL = BTCURL
      break
    case 'LTC':
      URL = LTCURL
      break
  }
  if (typeof indexOrHash === 'number') {
    data = (await axios.get(`${URL}/block/${indexOrHash}`)).data
    timestamp = parseInt(moment(data.time).format('x'))
  }
  return {
    hash: data.hash,
    timestamp: timestamp
  }
}
const getBTClatestBlock = async (chain) => {
  let URL
  switch (chain) {
    case 'BTC':
      URL = BTCURL
      break
    case 'LTC':
      URL = LTCURL
      break
  }
  const re = await axios.get(`${URL}/block/tip`)
  const block = re?.data.height
  return block
}
const getSTXlatestBlock = async () => {
  const re = await axios.get(`${STXURL}/extended/v1/block?limit=1`)
  console.log(re?.data.results[0].height)
  return re?.data.results[0].height
}

const getSTXBlockResult = async (indexOrHash) => {
  const re = await axios.get(`${STXURL}/extended/v1/block/by_height/${indexOrHash}`)
  const block = re?.data
  const timestamp = block.burn_block_time * 1000
  return timestamp
}

const getETHBlockResult = async (chain, indexOrHash) => {
  let URL
  switch (chain) {
    case 'ARB':
      URL = ARBURL
      break
    case 'OP':
      URL = OPURL
      break
    case 'AVAX':
      URL = AVAXURL
      break
    case 'MATIC':
      URL = MATICURL
      break
    case 'ETH':
      URL = ETHURL
      break
  }
  const web3 = new Web3(URL)
  const block = await web3.eth.getBlock(indexOrHash, true)
  const timestamp = block.timestamp * 1000
  return timestamp
}

const getETHlatestBlock = async (chain) => {
  let URL
  switch (chain) {
    case 'ARB':
      URL = ARBURL
      break
    case 'OP':
      URL = OPURL
      break
    case 'AVAX':
      URL = AVAXURL
      break
    case 'MATIC':
      URL = MATICURL
      break
    case 'ETH':
      URL = ETHURL
      break
  }
  const payload = {
    jsonrpc: '2.0',
    id: '1',
    method: 'eth_getBlockByNumber',
    params: [
      'latest',
      false
    ]
  }
  const re = await axios.post(URL, payload)
  const block = re?.data.result.number
  return parseInt(block)
}

const getLatestBlock = async (chain) => {
  let blockNumber
  switch (chain) {
    case 'OP':
    case 'ARB':
    case 'AVAX':
    case 'MATIC':
    case 'ETH':
      blockNumber = await getETHlatestBlock(chain)
      break
    case 'BTC':
    case 'LTC':
      blockNumber = await getBTClatestBlock(chain)
      break
    case 'STX':
      blockNumber = await getSTXlatestBlock()
      break
    case 'ATOM':
      blockNumber = await getATOMlatestBlock()
      break
    case 'DOT':
      blockNumber = await getDOTlatestBlock()
      break
  }
  return blockNumber
}

const getBlock = async (chain, block) => {
  let timestamp
  switch (chain) {
    case 'STX':
      timestamp = await getSTXBlockResult(block)
      break
    case 'BTC':
    case 'LTC':
      timestamp = (await getBTCBlockResult(chain,block)).timestamp
      break
    case 'ATOM':
      timestamp = (await getATOMBlockResult(block))
      break
    case 'OP':
    case 'ARB':
    case 'AVAX':
    case 'MATIC':
    case 'ETH':
      timestamp = await getETHBlockResult(chain, block)
      break
    case 'DOT':
      timestamp = await getDOTBlockResult(block)
      break
  }
  return timestamp
}

const getBlockNumber = async (chain, timestamp, left = 100000, right) => {
  right = right || await getLatestBlock(chain)
  while (left <= right) {
    const mid = left + ((right - left) >> 1)
    await sleepSeconds(0.01)
    const midTime = await getBlock(chain, mid)
    if (midTime === timestamp) {
      const midDay = moment(midTime).format('YYYY-MM-DD HH:mm:ss')
      console.log(chain, `mid=${mid}`, `time=${midDay}`)
      return mid
    } else if (midTime > timestamp) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }
  const leftTime = await getBlock(chain, left)
  const rightTime = await getBlock(chain, right)
  const leftDay = moment(leftTime).format('YYYY-MM-DD HH:mm:ss')
  const rightDay = moment(rightTime).format('YYYY-MM-DD HH:mm:ss')
  console.log(chain, `${left}`, `time=${leftDay}`)
  console.log(chain, `${right}`, `time=${rightDay}`)
  return left
}

if (require.main === module) {
  const test = async () => {
    const date = new Date('2023-10-24 14:00:00')
    const timestamp = date.getTime()
    console.log('timestamp', timestamp)
    //await getBlockNumber('ETH', timestamp, 33907882)
    //await getBlockNumber('AVAX', timestamp, 24019400)
    //await getBlockNumber('MATIC', timestamp, 39963387)
    //await getBlockNumber('BTC', timestamp, 33907882)
    //await getBlockNumber('LTC', timestamp, 2941117)
    //await getBlockNumber('STX', timestamp, 10000)
    //await getBlockNumber('ATOM', timestamp, 17851671)
    await getBlockNumber('DOT', timestamp, 18001547)
    //await getBlockNumber('ARB', timestamp, 10000)
  }
  test()
}

// ('AVAX', timestamp, 20956326) 填入timestamp之前的blockNumber
