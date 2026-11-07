import { Alert, Platform } from "react-native";

export default function showMessage(title, message) {
  if (Platform.OS === "web") {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}
