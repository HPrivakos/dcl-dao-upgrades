const abi = require('web3-eth-abi')

const { abis, roles, utils } = require('../src')

const {
  chainEnv,
  debug,
  encoding: { encodeCallsScript, encodeForward },
} = utils

const additionalChainConfig = {
  mainnet: {
    SABSwap: {
      oldMember: '0xfc4ef0903bb924d06db9cbaba1e4bda6b71d2f82',
      newMember: '0x4ece6e896e79a8e61199badb6e99b1dbfcd9ffb5',
    },
  },
  rinkeby: {
    SABSwap: {
      oldMember: '',
      newMember: '',
    },
  },
}

const { orgUrl, kernel, acl, sabVoting, sabTokenManager, committeeTokenManager, SABSwap } =
  chainEnv.buildConfig(additionalChainConfig)

/*******************
 * BUILD EVMSCRIPT *
 *******************/

async function main() {
  console.log()
  console.log('============================================================')
  console.log()
  console.log(`Planning modifications to the Decentraland DAO on network ${chainEnv.getName()}:`)
  console.log('  Rotate SAB member list')
  console.log()
  console.log('This organization will be targetted:')
  console.log(`  - Url:                     ${orgUrl}`)
  console.log(`  - Kernel:                  ${kernel}`)
  console.log(`  - ACL:                     ${acl}`)
  console.log(`  - SAB Voting:              ${sabVoting}`)
  console.log(`  - SAB Token Manager:       ${sabTokenManager}`)
  console.log(`  - Committee Token Manager: ${committeeTokenManager}`)
  console.log()
  console.log('And planning these changes as steps:')
  console.log(`  1. Granting permissions:`)
  console.log(`      + SABTokenManager:MINT_ROLE => SAB Voting`)
  console.log(`      + SABTokenManager:BURN_ROLE => SAB Voting`)
  console.log(`  2. Burning old sab membership token (removing ${SABSwap.oldMember}):`)
  console.log(`  3. Minting new sab membership token (adding ${SABSwap.newMember}):`)
  console.log(`  1. Removing permissions:`)
  console.log(`      + SABTokenManager:MINT_ROLE => SAB Voting`)
  console.log(`      + SABTokenManager:BURN_ROLE => SAB Voting`)

  console.log()
  console.log('============================================================')
  console.log()

  // Swap SAB membership
  const swapSABMemberScriptSteps = [
    // Grant mint permission to SAB
    {
      to: acl,
      data: abi.encodeFunctionCall(abis.ACL_GRANT_PERMISSION, [
        sabVoting, // Who
        sabTokenManager, // Where
        roles.TOKEN_MANAGER_MINT_ROLE, // What
      ]),
    },
    // Grant burn permission to SAB
    {
      to: acl,
      data: abi.encodeFunctionCall(abis.ACL_GRANT_PERMISSION, [
        sabVoting, // Who
        sabTokenManager, // Where
        roles.TOKEN_MANAGER_BURN_ROLE, // What
      ]),
    },

    // Burn old committee membership token
    {
      to: sabTokenManager,
      data: abi.encodeFunctionCall(abis.TOKEN_MANAGER_BURN, [SABSwap.oldMember, '1']),
    },
    // Mint new committee membership token
    {
      to: sabTokenManager,
      data: abi.encodeFunctionCall(abis.TOKEN_MANAGER_MINT, [SABSwap.newMember, '1']),
    },
    // Revoke mint permission from SAB Voting
    {
      to: acl,
      data: abi.encodeFunctionCall(abis.ACL_REVOKE_PERMISSION, [
        sabVoting, // Who
        sabTokenManager, // Where
        roles.TOKEN_MANAGER_MINT_ROLE, // What
      ]),
    },
    // Revoke burn permission from SAB Voting
    {
      to: acl,
      data: abi.encodeFunctionCall(abis.ACL_REVOKE_PERMISSION, [
        sabVoting, // Who
        sabTokenManager, // Where
        roles.TOKEN_MANAGER_BURN_ROLE, // What
      ]),
    },
  ]
  const swapSABMemberCallsScript = encodeCallsScript(swapSABMemberScriptSteps)
  const sabVoteForwardDataForTokenManager = encodeForward(swapSABMemberCallsScript)
  const sabVoteForwardCallScriptForTokenManager = encodeCallsScript([
    { to: sabVoting, data: sabVoteForwardDataForTokenManager },
  ])
  const sabForwardDataForTokenManager = encodeForward(sabVoteForwardCallScriptForTokenManager)

  console.log('Rotate SAB member list')
  console.log('  Raw data to create a vote through SAB Token Manager:')
  console.log(`    ${sabForwardDataForTokenManager}`)
  console.log()
  console.log('  Send as raw transaction with:')
  console.log(`    { "to": "${sabTokenManager}", "data": "${sabForwardDataForTokenManager}" }`)
  console.log()

  debug(`Calls script steps (length: ${swapSABMemberScriptSteps.length}):`)
  debug(swapSABMemberScriptSteps)
  debug()
}

/*******
 * RUN *
 *******/

main()
