import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Splash from "../Screens/Splash/index";
import Onboard from "../Screens/Onboard/index";
import Home from "../Screens/Home/index";
import DonationsRequests from "../Screens/DonationsRequests/index";
import SocialMedia from "../Screens/SocialMedia";
import MidiaScreen from "../Screens/MidiaScreen/index";
import LoginScreen from "../Screens/Login/index";
import AdminScreen from "../Screens/AdminScreen/index";
import PrayerRequestsADM from "../Screens/PrayerRequestsADM/index";
import ParticipacoesADM from "../Screens/ParticipacoesADM/index";
import EventsAndMedia from "../Screens/EventsAndMedia/index";
import ManageEventsADM from "../Screens/ManageEventsADM";

const Stack = createNativeStackNavigator();

const StackN = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Onboard" component={Onboard} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="DonationsRequests" component={DonationsRequests} />
      <Stack.Screen name="SocialMedia" component={SocialMedia} />
      <Stack.Screen name="MidiaScreen" component={MidiaScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AdminScreen" component={AdminScreen} />
      <Stack.Screen name="PrayerRequestsADM" component={PrayerRequestsADM} />
      <Stack.Screen name="ParticipacoesADM" component={ParticipacoesADM} />
      <Stack.Screen name="ManageEventsADM" component={ManageEventsADM} />
      <Stack.Screen name="EventsAndMedia" component={EventsAndMedia} />
    </Stack.Navigator>
  );
};

export default StackN;
