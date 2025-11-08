import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Splash from '../Screens/Splash/index'
import Onboard from '../Screens/Onboard/index'
import Home from '../Screens/Home/index'
import DonationsRequests from '../Screens/DonationsRequests/index'
import SocialMedia from '../Screens/SocialMedia'
import MidiaScreen from '../Screens/MidiaScreen/index'
import AdminScreen from '../Screens/AdminScreen/index'

const Stack = createNativeStackNavigator()

const StackN = () => {
    return (
        <Stack.Navigator initialRouteName='Splash' screenOptions={{headerShown:false}}>
            <Stack.Screen name='Splash' component={Splash}/>
            <Stack.Screen name='Onboard' component={Onboard}/>
            <Stack.Screen name='Home' component={Home}/>
            <Stack.Screen name='DonationsRequests' component={DonationsRequests}/>
            <Stack.Screen name='SocialMedia' component={SocialMedia}/>
            <Stack.Screen name='MidiaScreen' component={MidiaScreen}/>
            <Stack.Screen name='AdminScreen' component={AdminScreen}/>
        </Stack.Navigator>
    )
}

export default StackN