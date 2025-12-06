import React, { useState } from 'react'
import { FloorSelector } from './components/FloorSelector'
import { FloorMap } from './components/FloorMap'
import './App.css'

export default function App() {
  const [currentFloor, setCurrentFloor] = useState('floor1')
//
  return (
    <div className="app">
      <header className="app-header">
        <h1>Interactive Building Map</h1>
      </header>
      <FloorSelector 
        currentFloor={currentFloor} 
        onFloorChange={setCurrentFloor} 
      />
      <FloorMap currentFloor={currentFloor} />
    </div>
  )
}
