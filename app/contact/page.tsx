import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact | EVAftermarket',
  description: 'Get in touch with the EVAftermarket team.',
}

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <p className="text-gray-600 mb-4">
        Have a question, found an error, or want to suggest a new vehicle or data source?
      </p>
      <p>
        Email: <a href="mailto:hello@evaftermarket.com" className="text-blue-600 underline">hello@evaftermarket.com</a>
      </p>
      <p className="mt-4 text-sm text-gray-500">We aim to respond within 48 hours.</p>
    </main>
  )
}
