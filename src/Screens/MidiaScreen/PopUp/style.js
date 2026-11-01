import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
  },
  modalCard: {
    width: "100%",
    maxHeight: "82%",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderRadius: 14,
    backgroundColor: "#fffafa",
    elevation: 8,
  },
  header: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#a8b5c2",
  },
  title: {
    flex: 1,
    color: "#003b70",
    fontSize: 15,
    fontWeight: "800",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 9,
  },
  imageTile: {
    width: "30.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: "#003b70",
    elevation: 3,
  },
  selectedTile: {
    borderWidth: 2,
    borderColor: "#65b8ff",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  selectionMark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 35, 67, 0.48)",
  },
  status: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusText: {
    color: "#17334d",
    fontSize: 14,
  },
  errorText: {
    marginTop: 4,
    color: "#a12622",
    fontSize: 12,
  },
  selectionText: {
    marginTop: 2,
    color: "#304b63",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#a8b5c2",
  },
  saveButton: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: "#003b70",
    elevation: 2,
  },
  saveText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  deleteButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9eb0c1",
    borderRadius: 7,
    backgroundColor: "#fff",
  },
  disabledButton: {
    opacity: 0.55,
  },
});

export default styles;
