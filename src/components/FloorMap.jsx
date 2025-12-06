import React from 'react'
import { InteractiveSVGMap } from './InteractiveSVGMap'
import './FloorMap.css'

// Import SVG files as URLs -   Vite will handle these
import floor1Svg from '../assets/floor1.svg?url'
import floor2Svg from '../assets/floor2.svg?url'
import floor3Svg from '../assets/floor3.svg?url'
import etlMapSvg from '../assets/Drew-and-ETL-Map-4_1.svg?url'

const floorImages = {
  floor1: floor1Svg,
  floor2: floor2Svg,
  floor3: floor3Svg,
  etl: etlMapSvg
}

const floorViewBoxes = {
  floor1: '0 0 6883 5333',
  floor2: '0 0 6883 5333',
  floor3: '0 0 6883 5333',
  etl: '0 0 3300 2550'
}

export function FloorMap({ currentFloor }) {
  const viewBox = floorViewBoxes[currentFloor] || floorViewBoxes.floor1

  // Use InteractiveSVGMap for all floors to have consistent green overlay boxes
  return (
    <div className="floor-map-container">
      <InteractiveSVGMap 
        svgUrl={floorImages[currentFloor]} 
        viewBox={viewBox}
        currentFloor={currentFloor}
      />
    </div>
  )
}
