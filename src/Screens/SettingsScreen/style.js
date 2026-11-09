import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#002D62",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    color: "#0B233E",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 18,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#0B233E",
    fontSize: 15,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: "#002D62",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default styles;
