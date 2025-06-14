const StatusCard = ({ title, value, icon, color }) => {
  return (
    <div className="col-md-3 mb-4">
      <div className="card status-card h-100">
        <div className="card-body">
          <div className={`status-icon text-${color}`}>
            <i className={`bi ${icon}`}></i>
          </div>
          <p>{title}</p>
          <h3>{value}</h3>
        </div>
      </div>
    </div>
  )
}
