// client/src/components/ui/spinner.tsx
import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div role="status" aria-live="polite" aria-label="Loading">
      <span>Loading...</span>
    </div>
  );
};

export default Spinner;
