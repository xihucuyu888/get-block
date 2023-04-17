const axios = require('axios')
const moment = require('moment')
const Web3 = require('web3')
const config = require('./config.json');

const BTCURL = config.BTCURL
const ETHURL = config.ETHURL
const STXURL = config.STXURL
const AVAXURL = config.AVAXURL
const MATICURL = config.MATICURL

const sleepSeconds = (s) => {
  return new Promise((resolve) => setTimeout(resolve, s * 1000))
}

const getBTCBlockResult = async (indexOrHash) => {
  let data, timestamp
  if (typeof indexOrHash === 'number') {
    data = (await axios.get(`${BTCURL}/block/${indexOrHash}`)).data
    timestamp = parseInt(moment(data.time).format('x'))
  }
  return {
    hash: data.hash,
    timestamp: timestamp
  }
}
const getBTClatestBlock = async () => {
  const re = await axios.get(`${BTCURL}/block/tip`)
  const block = re?.data.height
  return block
}
const getSTXlatestBlock = async () => {
  const re = await axios.get(`${STXURL}/extended/v1/block?limit=1`)
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
    case 'AVAX':
    case 'MATIC':
    case 'ETH':
      blockNumber = await getETHlatestBlock(chain)
      break
    case 'BTC':
      blockNumber = await getBTClatestBlock()
      break
    case 'STX':
      blockNumber = await getSTXlatestBlock()
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
      timestamp = (await getBTCBlockResult(block)).timestamp
      break
    case 'AVAX':
    case 'MATIC':
    case 'ETH':
      timestamp = await getETHBlockResult(chain, block)
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
  console.log(chain, `left=${left}`, `time=${leftDay}`)
  console.log(chain, `right=${right}`, `time=${rightDay}`)
  return left
}

if (require.main === module) {
  const test = async () => {
    const date = new Date('2023-04-17 15:00:00')
    const timestamp = date.getTime()
    console.log('timestamp', timestamp)
    //await getBlockNumber('ETH', timestamp, 33907882)
    await getBlockNumber('AVAX', timestamp, 20956326)
    await getBlockNumber('MATIC', timestamp, 33907882)
    // await getBlockNumber('BTC', timestamp, 33907882)
    // await getBlockNumber('STX', timestamp, 33907882)
  }
  test()
}

// ('AVAX', timestamp, 20956326) 填入timestamp之前的blockNumber
