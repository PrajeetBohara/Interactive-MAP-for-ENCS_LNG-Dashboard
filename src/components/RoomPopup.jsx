import React from 'react'
import './RoomPopup.css'

export function RoomPopup({ room, position, onClose }) {
  if (!room) return null

  const statusColors = {
    Available: '#4CAF50',
    Occupied: '#F44336',
    Maintenance: '#FF9800'
  }

  return (
    <div
      className="room-popup"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="popup-close" onClick={onClose}>×</button>
      <h3 className="popup-title">{room.name}</h3>
      <p className="popup-description">{room.description}</p>
      <div className="popup-details">
        <div className="popup-detail-item">
          <span className="detail-label">Capacity:</span>
          <span className="detail-value">{room.capacity} people</span>
        </div>
        <div className="popup-detail-item">
          <span className="detail-label">Status:</span>
          <span 
            className="detail-value status-badge"
            style={{ backgroundColor: statusColors[room.status] || '#757575' }}
          >
            {room.status}
          </span>
        </div>
        {room.amenities && room.amenities.length > 0 && (
          <div className="popup-detail-item">
            <span className="detail-label">Amenities:</span>
            <span className="detail-value">{room.amenities.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
