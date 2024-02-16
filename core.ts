// reference: https://en.wikipedia.org/wiki/Huffman_coding

import '@beenotung/tslib/object'
import { incObject } from '@beenotung/tslib/object'

function compress(message: string) {
  let counts = countWords(message)
  let prefixTable = buildPrefixTable(counts)
  let codes = encode(prefixTable, message)
  return { prefixTable, codes }
}

function decode(prefixTable: PrefixTable, codes: number[]): string {
  let { root } = prefixTable
  let message = ''

  let node = root
  for (let code of codes) {
    if (node.type === 'leaf') {
      message += node.char
      node = root
    }
    if (node.type === 'internal') {
      node = code == 0 ? node.left : node.right
    } else {
      throw new Error('Invalid codes')
    }
  }
  if (node.type == 'leaf') {
    message += node.char
  } else {
    throw new Error('Invalid codes')
  }

  return message
}

// TODO output in bytes instead of bits
function encode(prefixTable: PrefixTable, message: string): number[] {
  let { to_code } = prefixTable
  let codes: number[] = []
  for (let char of message) {
    let code = to_code[char]
    codes.push(...code)
  }
  return codes
}

type PrefixTable = {
  list: {
    char: string
    weight: number
    code: number[]
  }[]

  root: PrefixNode

  // char -> number[]
  to_code: Record<string, number[]>
}

type PrefixNode = {
  weight: number
} & (
  | {
      type: 'internal'
      left: PrefixNode
      right: PrefixNode
    }
  | {
      type: 'leaf'
      char: string
    }
)

function buildPrefixTable(counts: Record<string, number>) {
  type Node = {
    parent: Node | null
    weight: number
  } & (
    | {
        type: 'leaf'
        char: string
      }
    | {
        type: 'internal'
        left: Node
        right: Node
      }
  )

  let leafNodes: Node[] = Object.entries(counts).map(
    ([char, count]): Node => ({
      type: 'leaf',
      parent: null,
      char,
      weight: count,
    }),
  )
  for (; leafNodes.length > 1; ) {
    // find two min node
    let left = leafNodes[0]
    let right = leafNodes[1]
    for (let i = 2; i < leafNodes.length; i++) {
      let node = leafNodes[i]
      if (node.weight < left.weight) {
        left = node
      } else if (node.weight < right.weight) {
        right = node
      }
    }

    let parent: Node = {
      type: 'internal',
      parent: null,
      left: left,
      right: right,
      weight: left.weight + right.weight,
    }
    left.parent = parent
    right.parent = parent
    leafNodes.splice(leafNodes.indexOf(left), 1)
    leafNodes.splice(leafNodes.indexOf(right), 1)
    leafNodes.push(parent)
  }

  let list: PrefixTable['list'] = []
  let to_code: PrefixTable['to_code'] = {}

  function buildNode(node: Node, code: number[]): PrefixNode {
    if (node.type == 'leaf') {
      list.push({
        char: node.char,
        weight: node.weight,
        code,
      })
      to_code[node.char] = code
      return {
        type: 'leaf',
        weight: node.weight,
        char: node.char,
      }
    }
    return {
      type: 'internal',
      weight: node.weight,
      left: buildNode(node.left, [...code, 0]),
      right: buildNode(node.right, [...code, 1]),
    }
  }

  let root = buildNode(leafNodes[0], [])

  return { list, root, to_code }
}

function countWords(message: string) {
  let counts: Record<string, number> = {}
  for (let char of message) {
    incObject(counts, char)
  }
  return counts
}

function test() {
  let message = 'this is an example of a huffman tree'
  // message = readFileSync('package.json').toString()
  // message = readFileSync('pnpm-lock.yaml').toString()
  let { prefixTable, codes } = compress(message)
  let output = decode(prefixTable, codes)
  console.log({
    match: output == message,
    // message,
    // codes,
    message_length: message.length,
    codes_bits: codes.length,
    codes_bytes: codes.length / 8,
    compression_rate: codes.length / 8 / message.length,
  })
}

test()
