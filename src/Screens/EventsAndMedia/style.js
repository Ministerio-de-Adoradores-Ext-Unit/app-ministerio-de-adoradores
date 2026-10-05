import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  eventList: {
    paddingHorizontal: 22,
    paddingBottom: 3,
    gap: 10,
  },
  eventCard: {
    width: 165,
    minHeight: "60%",
    padding: 7,
    borderRadius: 11,
    backgroundColor: "#001F3D",
    overflow: "hidden",
    marginBottom: "20%",
  },
  eventImage: {
    width: "100%",
    height: 92,
    borderRadius: 7,
    backgroundColor: "#d9dfe5",
    resizeMode: "cover",
  },
  eventTitle: {
    marginTop: 10,
    marginBottom: 12,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  detailIcon: {
    width: 13,
    color: "#fff",
    fontSize: 10,
  },
  eventDetailText: {
    flex: 1,
    color: "#fff",
    fontSize: 10,
  },
  carouselDots: {
    height: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  activeDot: {
    width: 17,
    height: 4,
    backgroundColor: "#001F3D",
  },
  dot: {
    width: 5,
    height: 4,
    backgroundColor: "#9aa6b2",
  },
  categoryList: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 12,
    gap: 11,
  },
  categoryButton: {
    width: 78,
    alignItems: "center",
  },
  categoryImage: {
    width: 68,
    height: 68,
    borderRadius: 50,
    borderWidth: 1,
    marginVertical: 10,
    borderColor: "#d6dce2",
  },
  categoryTitle: {
    minHeight: 44,
    marginTop: 4,
    color: "#172a3a",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 18, 35, 0.48)",
  },
  modalContent: {
    maxHeight: "78%",
    minHeight: "52%",
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#f0f0f0",
  },
  modalHandle: {
    width: 52,
    height: 4,
    marginBottom: 12,
    alignSelf: "center",
    backgroundColor: "#111",
  },
  modalHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    flex: 1,
    color: "#102338",
    fontSize: 15,
    fontWeight: "700",
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  photoGrid: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  photoRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  photoItem: {
    width: "48%",
    aspectRatio: 1.2,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#d7dce0",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  downloadButton: {
    position: "absolute",
    right: 7,
    bottom: 7,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#001F3D",
  },
});

export default styles;
