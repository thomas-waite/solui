import { isAddress } from 'web3-utils'

import { _ } from '../utils'

export const isValidId = id => (!(/[^A-Za-z0-9-]/gm.exec(id)))

export const inputIsPresent = (ctx, key) => (
  Object.keys(_.get(ctx, 'inputs', {})).includes(key)
)

export const methodArgExists = (methodAbi, argId) => (
  !!methodAbi.inputs.find(({ name }) => name === argId)
)

export const getAbi = (ctx, contractId) => {
  const { abi } = ctx.artifacts[contractId]
  return abi
}

export const getBytecode = (ctx, contractId) => {
  const { bytecode } = ctx.artifacts[contractId]
  return bytecode
}

export const getMethod = (ctx, contractId, methodName) => {
  const { abi } = ctx.artifacts[contractId]
  return abi.find(def => (
    'constructor' === methodName
      ? (def.type === 'constructor')
      : (def.name === methodName && def.type === 'function')
  ))
}

export class ProcessingErrors {
  constructor () {
    this.errors = {
      '': [],
    }
  }

  add (id, msg) {
    if (!msg) {
      msg = id
      id = ''
    }
    this.errors[id] = this.errors[id] || []
    this.errors[id].push(msg)

    this.notEmpty = true
  }

  _format ({ id, msg }) {
    return id ? `${id}: ${msg}` : msg
  }

  toObject () {
    return this.notEmpty ? this.errors : null
  }

  toStringArray () {
    let e = [ ...this.errors[''].map(msg => this._format({ msg })) ]
    Object.keys(this.errors).forEach(id => {
      if (id) {
        e = e.concat(...this.errors[id].map(msg => this._format({ id, msg })))
      }
    })
    return e
  }
}

export const checkAddressIsValid = async (ctx, value, allowedTypes) => {
  if (!isAddress(value)) {
    ctx.errors.add(ctx.id, `must be a valid address`)
  } else {
    // do the on-chain check...

    const { web3 } = ctx

    if (!allowedTypes || !web3) {
      return
    }

    if (!Array.isArray(allowedTypes)) {
      ctx.errors.add(ctx.id, `allowedTypes must be an array`)
    } else {
      let isContract = false
      try {
        // check if there is code at the address
        const code = await web3.eth.getCode(value)
        isContract = ('0x' !== code)

        if (isContract && !allowedTypes.includes('contract')) {
          ctx.errors.add(ctx.id, 'must not be a contract address')
        }

        if (!isContract && !allowedTypes.includes('eoa')) {
          ctx.errors.add(ctx.id, 'must be a contract address')
        }
      } catch (err) {
        ctx.errors.add(ctx.id, 'got an internal error while checking for code at address')
      }
    }
  }
}

export const getWeb3Account = async web3 => {
  const [ account ] = await web3.eth.getAccounts()

  if (!account) {
    throw new Error('Unable to get Ethereum address. Ensure your dapp browser / Metamask is properly connected.')
  }

  return account
}