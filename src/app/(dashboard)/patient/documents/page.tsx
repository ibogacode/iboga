export const metadata = {
  title: 'Documents | Patient Portal',
}

export default function PatientDocumentsPage() {
  return (
    <div className="space-y-6">
      <h1 
        className="text-3xl font-medium"
        style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
      >
        Documents
      </h1>
      <p className="text-gray-600">
        Your documents will appear here. Content coming soon.
      </p>
    </div>
  )
}
