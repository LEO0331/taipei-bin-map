import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The recovery UI intentionally avoids exposing implementation details to visitors.
  }

  render() {
    if (this.state.hasError) {
      return <main className="app-recovery"><h1>Unable to load the map</h1><p>請重新整理頁面以載入最新版本。若問題持續，請清除本站資料後再試。</p><button type="button" onClick={() => window.location.reload()}>Refresh page</button></main>;
    }
    return this.props.children;
  }
}
