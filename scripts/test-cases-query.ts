import { getProblemCasesForModel } from '../lib/db/cases'

async function main() {
  const cases = await getProblemCasesForModel('byd-atto3', 'au')
  console.log('Cases returned:', cases.length)
  console.log('First case:', JSON.stringify(cases[0], null, 2))
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
