import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | EVAftermarket',
  description: 'EVAftermarket privacy policy — how we collect and use data.',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-gray-600 mb-4">Last updated: {new Date().getFullYear()}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Information We Collect</h2>
        <p>We collect anonymous usage data via Plausible Analytics. No personal information or cookies are stored.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Third-Party Services</h2>
        <p>We may display advertisements via Google AdSense. Google may use cookies to serve relevant ads based on your prior visits to this and other websites.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Affiliate Links</h2>
        <p>Some links on this site may be affiliate links. We earn a small commission if you make a purchase through these links, at no extra cost to you.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p>For privacy concerns, please contact us at the address listed on our <a href="/contact" className="text-blue-600 underline">Contact page</a>.</p>
      </section>
    </main>
  )
}
