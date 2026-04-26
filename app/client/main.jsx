import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  componentDidCatch(error, info) {
    this.setState({ error: error?.message || String(error) });
    console.error('[ISTV] Render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { padding: '40px', fontFamily: 'monospace', color: '#ff4444', background: '#080808', minHeight: '100vh' }
      }, React.createElement('h2', null, 'ISTV — Render Error'), React.createElement('pre', null, this.state.error));
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(StrictMode, null,
      React.createElement(Dashboard)
    )
  )
);
