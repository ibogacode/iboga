export default function OnboardingPage() {
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
          Onboarding
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Track pre-arrival paperwork, signatures, and readiness
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patients in Onboarding */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Patients in Onboarding</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">9</p>
          <p className="text-emerald-600 text-sm font-medium">3 arriving this week</p>
        </div>

        {/* Forms Completed */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Forms Completed</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">47/72</p>
          <p className="text-amber-600 text-sm font-medium">14 forms overdue</p>
        </div>

        {/* Ready for Arrival */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Ready for Arrival</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">4</p>
          <p className="text-emerald-600 text-sm font-medium">All forms signed</p>
        </div>

        {/* Avg. Time to Complete */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Avg. Time to Complete</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">5.2 days</p>
          <p className="text-gray-400 text-sm">Goal: &lt; 4 days</p>
        </div>
      </div>
    </div>
  )
}
