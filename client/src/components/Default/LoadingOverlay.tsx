const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-content">
          <div className="loading-spinner"></div>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );

export default LoadingOverlay;