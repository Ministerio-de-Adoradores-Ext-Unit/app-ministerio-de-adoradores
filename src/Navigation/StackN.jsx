import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Splash from '../Screens/Splash/index'
import Onboard from '../Screens/Onboard/index'
import Home from '../Screens/Home/index'
import DonationsRequests from '../Screens/DonationsRequests/index'


const Stack = createNativeStackNavigator()

const StackN = () => {
    return (
        <Stack.Navigator initialRouteName='Splash' screenOptions={{headerShown:false}}>
            <Stack.Screen name='Splash' component={Splash}/>
            <Stack.Screen name='Onboard' component={Onboard}/>
            <Stack.Screen name='Home' component={Home}/>
            <Stack.Screen name='DonationsRequests' component={DonationsRequests}/>
        </Stack.Navigator>
    )
}

export default StackN