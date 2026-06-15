import { redirect } from 'next/navigation'

export function generateStaticParams() {
  return [{ market: 'au' }]
}

export default function MarketHomePage() {
  redirect('/home/au')
}
