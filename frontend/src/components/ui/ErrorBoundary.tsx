import { Component, type ReactNode } from "react";

/**
 * Catches render crashes below it so one malformed row cannot take the
 * whole app down (see Regla 1 in CLAUDE.md). Shows a retry card instead
 * of unmounting the tree into a white screen.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Something went wrong showing this section.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
            Algo falló al mostrar esta sección.
          </p>
          <button
            type="button"
            className="btn-ghost mt-3 text-xs"
            onClick={() => this.setState({ error: null })}
          >
            Retry / Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
