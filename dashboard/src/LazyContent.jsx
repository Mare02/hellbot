import { Component, Suspense } from 'react';
import { ResourceState } from './components';

class ContentErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <ResourceState
          error="This content could not be loaded. Reload the dashboard to try again."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

export default function LazyContent({ children, resetKey }) {
  return (
    <ContentErrorBoundary key={resetKey}>
      <Suspense fallback={<ResourceState loading />}>{children}</Suspense>
    </ContentErrorBoundary>
  );
}
