import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const isMapPage = ({ url }) => url === 'about:blank' || url.startsWith('https://www.google.com/maps/embed?');

export default function LocationMap({ url, title }) {
  const iframeUrl = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  // O Google exige que o mapa incorporado seja carregado dentro de um iframe.
  const html = `<!doctype html>
    <html lang="pt-BR">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:100%;border:0}</style>
      <iframe title="Mapa do endereço" src="${iframeUrl}" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </html>`;
  return (
    <WebView
      source={{ html }}
      accessibilityLabel={title}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={isMapPage}
      setSupportMultipleWindows={false}
      thirdPartyCookiesEnabled={false}
      startInLoadingState
      renderError={() => (
        <View style={styles.error}>
          <Text>Não foi possível carregar o mapa.</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
});
