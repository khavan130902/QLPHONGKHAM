import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  Platform,
} from 'react-native';
import { DevSettings } from 'react-native';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: string | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, info: any) {
    // Save error so we can show it in UI
    console.error('[ErrorBoundary] Caught error:', error, info);
    this.setState({
      hasError: true,
      error,
      errorInfo: info?.componentStack ?? null,
    });
  }

  renderFallback() {
    const { error, errorInfo } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.heading}>Error</Text>
          <Text style={styles.message}>
            {error?.message ?? 'Unknown error'}
          </Text>

          {error?.stack ? (
            <>
              <Text style={styles.heading}>Stack</Text>
              <Text style={styles.stack}>{error.stack}</Text>
            </>
          ) : null}

          {errorInfo ? (
            <>
              <Text style={styles.heading}>Component stack</Text>
              <Text style={styles.stack}>{errorInfo}</Text>
            </>
          ) : null}
        </ScrollView>

        {__DEV__ ? (
          <View style={styles.buttons}>
            <View style={styles.buttonWrap}>
              <Button title="Reload JS" onPress={() => DevSettings.reload()} />
            </View>
            {/* On Android physical device, DevSettings may not be available. */}
            {Platform.OS === 'android' ? null : null}
          </View>
        ) : null}
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#c00' },
  scroll: { flex: 1, marginBottom: 12 },
  scrollContent: { paddingBottom: 24 },
  heading: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  message: { fontSize: 13, color: '#111', marginTop: 4 },
  stack: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : undefined,
  },
  buttons: { flexDirection: 'row', justifyContent: 'center' },
  buttonWrap: { marginHorizontal: 8 },
});
