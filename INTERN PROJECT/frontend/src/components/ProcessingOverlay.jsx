import { FaSpinner, FaCheckCircle, FaBrain } from 'react-icons/fa';

export default function ProcessingOverlay({ steps, currentStep }) {
  return (
    <div className="processing-overlay">
      <div className="processing-card">
        <div className="ai-spinner" />
        <h4 className="mb-1" style={{ color: 'var(--govt-navy)' }}>AI Processing</h4>
        <p className="text-muted small mb-0">Analyzing your input with LLM + RAG...</p>
        <div className="processing-steps">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`processing-step ${idx < currentStep ? 'done' : idx === currentStep ? 'active' : ''}`}
            >
              <span className="step-icon">
                {idx < currentStep ? (
                  <FaCheckCircle />
                ) : idx === currentStep ? (
                  <FaSpinner className="fa-spin" />
                ) : (
                  <FaBrain style={{ opacity: 0.3 }} />
                )}
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
