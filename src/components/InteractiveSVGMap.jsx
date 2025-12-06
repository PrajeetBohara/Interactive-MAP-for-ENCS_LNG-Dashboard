import React, { useState, useEffect, useRef } from 'react'
import { RoomPopup } from './RoomPopup'
import { roomsConfig } from '../data/roomsConfig'
import './InteractiveSVGMap.css'

export function InteractiveSVGMap({ svgUrl, viewBox, currentFloor = 'etl' }) {
  const [selectedPath, setSelectedPath] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [svgContent, setSvgContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const overlaySvgRef = useRef(null)

  const rooms = roomsConfig[currentFloor] || []

  // Load and parse SVG
  useEffect(() => {
    if (!svgUrl) {
      setLoading(false)
      return
    }

    setLoading(true)
    setSvgContent(null)
    
    fetch(svgUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.text()
      })
      .then(svgText => {
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
        const svgElement = svgDoc.documentElement
        
        // Check for parsing errors
        const parserError = svgDoc.querySelector('parsererror')
        if (parserError) {
          console.error('SVG parsing error:', parserError.textContent)
          setLoading(false)
          return
        }
        
        // Get the inner HTML and set it
        setSvgContent(svgElement.innerHTML)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading SVG:', err)
        setLoading(false)
      })
  }, [svgUrl])

  // Find text element near a point (for room numbers)
  const findNearbyText = (x, y, svgElement) => {
    // Try to find text elements - they might be in various forms
    const allTexts = []
    
    // Get all text elements
    const textElements = svgElement.querySelectorAll('text')
    textElements.forEach(text => {
      const content = text.textContent?.trim() || ''
      if (content) {
        allTexts.push({ element: text, content })
      }
    })
    
    // Also check tspan elements
    const tspanElements = svgElement.querySelectorAll('tspan')
    tspanElements.forEach(tspan => {
      const content = tspan.textContent?.trim() || ''
      if (content) {
        allTexts.push({ element: tspan, content })
      }
    })
    
    let closestText = null
    let minDistance = Infinity

    allTexts.forEach(({ element, content }) => {
      try {
        const bbox = element.getBBox()
        const centerX = bbox.x + bbox.width / 2
        const centerY = bbox.y + bbox.height / 2
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2)
        )
        
        // Check if text contains a number (room number) - 2-4 digits
        const isNumber = /^\d{2,4}$/.test(content)
        
        // Also check for numbers within text (like "Room 235")
        const numberMatch = content.match(/\b(\d{2,4})\b/)
        const roomNumber = numberMatch ? numberMatch[1] : null
        
        if ((isNumber || roomNumber) && distance < minDistance && distance < 200) {
          minDistance = distance
          closestText = isNumber ? content : roomNumber
        }
      } catch (e) {
        // Skip if getBBox fails
      }
    })

    return closestText
  }

  // Check if path forms a closed shape (likely a room)
  const isClosedPath = (pathElement) => {
    const d = pathElement.getAttribute('d') || ''
    // Check if path ends with 'z' or 'Z' (closed path)
    return /[zZ]\s*$/.test(d.trim())
  }

  // Get path center point
  const getPathCenter = (pathElement) => {
    try {
      const bbox = pathElement.getBBox()
      return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
      }
    } catch (e) {
      return null
    }
  }

  // Check if a point is inside a path
  const isPointInPath = (pathElement, x, y) => {
    try {
      // Create an SVG point
      const point = svgRef.current.createSVGPoint()
      point.x = x
      point.y = y
      
      // Check if point is in path
      return pathElement.isPointInFill(point) || pathElement.isPointInStroke(point)
    } catch (e) {
      // Fallback: check bounding box
      try {
        const bbox = pathElement.getBBox()
        return x >= bbox.x && x <= bbox.x + bbox.width &&
               y >= bbox.y && y <= bbox.y + bbox.height
      } catch (e2) {
        return false
      }
    }
  }

  // Find the path that contains a point
  const findPathAtPoint = (x, y) => {
    if (!svgRef.current) return null

    const paths = svgRef.current.querySelectorAll('path')
    let bestMatch = null
    let minDistance = Infinity

    paths.forEach((path) => {
      // Check if point is inside path
      if (isPointInPath(path, x, y)) {
        // If point is inside, this is a good match
        try {
          const bbox = path.getBBox()
          const centerX = bbox.x + bbox.width / 2
          const centerY = bbox.y + bbox.height / 2
          const distance = Math.sqrt(
            Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2)
          )
          if (distance < minDistance) {
            minDistance = distance
            bestMatch = path
          }
        } catch (e) {
          // If we can't calculate distance, still use this path
          if (!bestMatch) {
            bestMatch = path
          }
        }
      }
    })

    return bestMatch
  }

  // Handle click anywhere on the map
  const handleMapClick = (event) => {
    if (!containerRef.current || !svgRef.current) return

    event.preventDefault()
    event.stopPropagation()

    const containerRect = containerRef.current.getBoundingClientRect()
    const svgRect = svgRef.current.getBoundingClientRect()
    const clientX = event.touches?.[0]?.clientX || event.clientX || 0
    const clientY = event.touches?.[0]?.clientY || event.clientY || 0

    // Convert screen coordinates to SVG coordinates using proper transformation
    const svgPoint = svgRef.current.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    
    // Get the transformation matrix
    const ctm = svgRef.current.getScreenCTM()
    if (ctm) {
      const invertedCTM = ctm.inverse()
      const transformedPoint = svgPoint.matrixTransform(invertedCTM)
      svgPoint.x = transformedPoint.x
      svgPoint.y = transformedPoint.y
    } else {
      // Fallback: manual calculation using viewBox
      const viewBox = svgRef.current.viewBox.baseVal
      const scaleX = viewBox.width / svgRect.width
      const scaleY = viewBox.height / svgRect.height
      svgPoint.x = (clientX - svgRect.left) * scaleX + viewBox.x
      svgPoint.y = (clientY - svgRect.top) * scaleY + viewBox.y
    }

    // Find the path at this point
    const clickedPath = findPathAtPoint(svgPoint.x, svgPoint.y)
    
    if (clickedPath) {
      handlePathClick(clickedPath, event)
    } else {
      // If no path found, still try to find nearby text for room number
      const roomNumber = findNearbyText(svgPoint.x, svgPoint.y, svgRef.current)
      
      if (roomNumber) {
        const roomData = {
          id: `room-${roomNumber}`,
          name: `Room ${roomNumber}`,
          description: `Room ${roomNumber} details`,
          capacity: 0,
          amenities: [],
          status: 'Available'
        }

        const popupWidth = 300
        const popupHeight = 150
        let popupX = clientX - containerRect.left - (popupWidth / 2)
        let popupY = clientY - containerRect.top - popupHeight - 10

        if (popupX < 10) popupX = 10
        if (popupX + popupWidth > containerRect.width - 10) {
          popupX = containerRect.width - popupWidth - 10
        }
        if (popupY < 10) {
          popupY = clientY - containerRect.top + 20
        }

        setPopupPosition({ x: popupX, y: popupY })
        setSelectedPath(roomData)
      }
    }
  }

  const handlePathClick = (pathElement, event) => {
    if (!containerRef.current || !svgRef.current) return

    event.preventDefault()
    event.stopPropagation()

    const containerRect = containerRef.current.getBoundingClientRect()
    const clientX = event.touches?.[0]?.clientX || event.clientX || 0
    const clientY = event.touches?.[0]?.clientY || event.clientY || 0

    // Get path center to find nearby room number
    const pathCenter = getPathCenter(pathElement)
    let roomNumber = null
    
    if (pathCenter && svgRef.current) {
      roomNumber = findNearbyText(pathCenter.x, pathCenter.y, svgRef.current)
    }

    // Create a room-like object for the popup
    const roomData = {
      id: pathElement.getAttribute('data-path-id') || `path-${Date.now()}`,
      name: roomNumber ? `Room ${roomNumber}` : pathElement.getAttribute('data-room-name') || 'Room',
      description: pathElement.getAttribute('data-description') || roomNumber ? `Room ${roomNumber} details` : 'Room details',
      capacity: parseInt(pathElement.getAttribute('data-capacity')) || 0,
      amenities: pathElement.getAttribute('data-amenities')?.split(',') || [],
      status: pathElement.getAttribute('data-status') || 'Available'
    }

    // Calculate popup position
    const popupWidth = 300
    const popupHeight = 150
    let popupX = clientX - containerRect.left - (popupWidth / 2)
    let popupY = clientY - containerRect.top - popupHeight - 10

    // Adjust if popup would go off screen
    if (popupX < 10) popupX = 10
    if (popupX + popupWidth > containerRect.width - 10) {
      popupX = containerRect.width - popupWidth - 10
    }
    if (popupY < 10) {
      popupY = clientY - containerRect.top + 20
    }

    setPopupPosition({ x: popupX, y: popupY })
    setSelectedPath(roomData)
  }

  const handleClosePopup = () => {
    setSelectedPath(null)
  }

  // Add click handler to entire SVG after it's loaded
  useEffect(() => {
    if (!svgContent || !svgRef.current) return

    let cleanupFunctions = []

    // Wait a bit for DOM to update
    const timeoutId = setTimeout(() => {
      const svgElement = svgRef.current
      if (!svgElement) return
      
      // Make the entire SVG clickable
      svgElement.style.cursor = 'pointer'
      
      // Add click handler to SVG
      const clickHandler = (e) => {
        handleMapClick(e)
      }
      
      const touchHandler = (e) => {
        e.preventDefault()
        e.stopPropagation()
        handleMapClick(e)
      }
      
      svgElement.addEventListener('click', clickHandler)
      svgElement.addEventListener('touchstart', touchHandler)
      
      cleanupFunctions.push(() => {
        svgElement.removeEventListener('click', clickHandler)
        svgElement.removeEventListener('touchstart', touchHandler)
      })
    }, 200)

    return () => {
      clearTimeout(timeoutId)
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [svgContent])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Check if click is on an interactive path
        if (!event.target.classList.contains('interactive-path')) {
          handleClosePopup()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handleOverlayClick = (room, event) => {
    if (!containerRef.current) return

    event.preventDefault()
    event.stopPropagation()

    const containerRect = containerRef.current.getBoundingClientRect()
    const clientX = event.touches?.[0]?.clientX || event.clientX || 0
    const clientY = event.touches?.[0]?.clientY || event.clientY || 0

    const popupWidth = 300
    const popupHeight = 150
    let popupX = clientX - containerRect.left - (popupWidth / 2)
    let popupY = clientY - containerRect.top - popupHeight - 10

    if (popupX < 10) popupX = 10
    if (popupX + popupWidth > containerRect.width - 10) {
      popupX = containerRect.width - popupWidth - 10
    }
    if (popupY < 10) {
      popupY = clientY - containerRect.top + 20
    }

    setPopupPosition({ x: popupX, y: popupY })
    setSelectedPath({
      id: room.id,
      name: room.name,
      description: room.description,
      capacity: room.capacity,
      amenities: room.amenities,
      status: room.status
    })
  }

  return (
    <div className="interactive-svg-container" ref={containerRef}>
      <div className="svg-wrapper">
        {loading ? (
          <div className="svg-loading">Loading map...</div>
        ) : svgContent ? (
          <div className="svg-container-wrapper">
            <svg
              ref={svgRef}
              className="interactive-svg"
              viewBox={viewBox}
              preserveAspectRatio="xMidYMid meet"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
            
            {/* Green overlay boxes for specific areas */}
            {rooms.length > 0 && (
              <svg
                ref={overlaySvgRef}
                className="overlay-svg"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
              >
                {rooms.map(room => {
                  // Convert percentage to actual SVG coordinates
                  const viewBoxValues = viewBox.split(' ').map(Number)
                  const svgWidth = viewBoxValues[2]
                  const svgHeight = viewBoxValues[3]
                  
                  return (
                    <rect
                      key={room.id}
                      x={(room.x / 100) * svgWidth}
                      y={(room.y / 100) * svgHeight}
                      width={(room.width / 100) * svgWidth}
                      height={(room.height / 100) * svgHeight}
                      className="room-overlay-box"
                      onClick={(e) => handleOverlayClick(room, e)}
                      onTouchStart={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleOverlayClick(room, e)
                      }}
                      fill="rgba(76, 175, 80, 0.1)"
                      stroke="rgba(76, 175, 80, 0.5)"
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                    />
                  )
                })}
              </svg>
            )}
          </div>
        ) : (
          <div className="svg-loading">Failed to load map</div>
        )}
      </div>

      {/* Popup - only show on click */}
      {selectedPath && (
        <RoomPopup
          room={selectedPath}
          position={popupPosition}
          onClose={handleClosePopup}
        />
      )}
    </div>
  )
}
