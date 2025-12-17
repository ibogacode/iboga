export default function ResearchPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
            wordWrap: 'break-word'
          }}
        >
          Research Overview
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Treatment outcomes, conversion, and profitability by diagnosis.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patients with Data */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Patients with Data</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">234</p>
          <p className="text-gray-400 text-sm">Across diagnoses</p>
        </div>

        {/* Data Points Collected */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Data Points Collected</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">18.9K</p>
          <p className="text-gray-400 text-sm">Daily Forms & Vitals</p>
        </div>

        {/* Active Studies */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Active Studies</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">4</p>
          <p className="text-emerald-600 text-sm font-medium">Parkinson's • PTSD • Addiction</p>
        </div>

        {/* Published Reports */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Published Reports</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">6</p>
          <p className="text-gray-400 text-sm">Ready for sharing / SEO</p>
        </div>
      </div>
    </div>
  )
}
