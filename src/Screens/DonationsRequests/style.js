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
    paddingTop: 15,
    paddingBottom: 100, 
  },

  banner: {
    width: "90%",
    height: 106,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginVertical: 10,
    alignSelf: "center",
    overflow: "hidden",
  },

  image: {
    flex: 1,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  formSection: {
    marginTop: 20,
    paddingHorizontal: 15,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#001F3D",
    textAlign: "center",
    marginVertical: 5,
  },
});

export default styles;
