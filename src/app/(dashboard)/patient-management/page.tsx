export default function PatientManagementPage() {
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
          Patient Management
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Daily forms, dosing, and treatment status.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Patients */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Active Patients</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">14</p>
          <p className="text-emerald-600 text-sm font-medium">Capacity : 7/7 beds</p>
        </div>

        {/* Forms Completed Today */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Forms Completed Today</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">24/42</p>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded">18</span>
            <span className="text-gray-400 text-sm">missing</span>
          </div>
        </div>

        {/* Upcoming Departures */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Upcoming Departures</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">4</p>
          <p className="text-gray-400 text-sm">Next 7 days</p>
        </div>

        {/* Average Symptom Improvement */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Average Symptom Improvement</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">41%</p>
          <p className="text-emerald-600 text-sm font-medium">vs Day 1</p>
        </div>
      </div>
    </div>
  )
}
