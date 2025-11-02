import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    marginLeft: "9%",
  },
  input: {
    height: 45,
    width: "85%",
    backgroundColor: "#f3f3f3",
    borderRadius: 15,
    marginLeft: "7%",
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  inputShadow: {
    backgroundColor: "#f3f3f3",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
    elevation: 5,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    fontSize: 15,
    color: "#333",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "80%",
    paddingVertical: 10,
    maxHeight: "60%",
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
});
export default styles;