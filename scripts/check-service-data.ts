import { db } from '../lib/db/index'
import { serviceCosts, dealers } from '../lib/db/schema'

async function main() {
  const [costs, dealerList] = await Promise.all([
    db.select().from(serviceCosts).limit(5),
    db.select().from(dealers).limit(5),
  ])

  console.log('service_costs:', costs.length, 'rows')
  if (costs.length > 0) console.log('  Sample:', JSON.stringify(costs[0], null, 2))

  console.log('dealers:', dealerList.length, 'rows')
  if (dealerList.length > 0) console.log('  Sample:', JSON.stringify(dealerList[0], null, 2))

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
