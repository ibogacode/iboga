export const metadata = {
  title: 'Messages | Patient Portal',
}

export default function PatientMessagesPage() {
  return (
    <div className="space-y-6">
      <h1 
        className="text-3xl font-medium"
        style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
      >
        Messages
      </h1>
      <p className="text-gray-600">
        Your messages will appear here. Content coming soon.
      </p>
    </div>
  )
}
