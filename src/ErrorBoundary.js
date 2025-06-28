import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console for debugging
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                The app encountered an error. Please try refreshing the page.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-gray-100 p-4 rounded text-sm">
                  <summary className="font-medium cursor-pointer mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-red-600 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                  <details className="mt-2">
                    <summary className="font-medium cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-600 overflow-auto mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                </details>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 