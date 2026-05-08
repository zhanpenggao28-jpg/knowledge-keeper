import { Component, ReactNode } from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="出现错误"
          subTitle={this.state.error?.message || '未知错误'}
          extra={
            <Button type="primary" onClick={() => this.setState({ hasError: false })}>
              重试
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}
