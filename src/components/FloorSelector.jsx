import React from 'react'
import './FloorSelector.css'

export function FloorSelector({ currentFloor, onFloorChange }) {
  const floors = [
    { id: 'floor1', label: 'Drew Floor 1' },
    { id: 'floor2', label: 'Drew Floor 2' },
    { id: 'floor3', label: 'Drew Floor 3' },
    { id: 'etl', label: 'Drew ETL' }
  ]

  return (
    <div className="floor-selector">
      <h2 className="selector-title">Select Floor</h2>
      <div className="floor-buttons">
        {floors.map(floor => (
          <button
            key={floor.id}
            className={`floor-button ${currentFloor === floor.id ? 'active' : ''}`}
            onClick={() => onFloorChange(floor.id)}
          >
            {floor.label}
          </button>
        ))}
      </div>
    </div>
  )
}
