'use client'

export default function SchematicBuilder() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
      <div className="border-2 border-dashed border-gray-600 rounded-lg w-full h-full flex flex-col items-center justify-center gap-3">
        <svg
          className="w-12 h-12 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
          />
        </svg>
        <p className="text-sm font-medium">Schematic Builder placeholder</p>
        <p className="text-xs text-gray-500">React Flow canvas goes here</p>
      </div>
    </div>
  )
}
