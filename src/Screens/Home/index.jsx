import React from "react";
import { View, Text, SafeAreaView, StyleSheet, ScrollView } from "react-native";
import { Button } from "../../components/button";
import NavBar from "../../components/navBar";
import SimpleHeader from "../../components/header/simpleHeader";
import { MenuButton } from "../../components/menuButton";
import Carousel from "../../components/carousel";
import ContactCard from "../../components/contactCard";
import AboutUs from "../../components/aboutUs";
import Address from "../../components/address"; 
import { useNavigation } from '@react-navigation/native';

export default function Home() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <SimpleHeader />

      <ScrollView style={styles.scrollView}>

      <View style={styles.carousel}>
        <Carousel />
      </View>

      <View style={styles.menuContainer}>
        <View style={styles.menu}>
          <MenuButton imageSource={require('../../../assets/img/img_eventos.png')} title={'EVENTOS'} />
          <MenuButton imageSource={require('../../../assets/img/img_midias.png')} title={'MÍDIAS'} />
          <MenuButton imageSource={require('../../../assets/img/img_doacao.png')} title={'DOAÇÕES'} onPress={() => navigation.navigate('DonationsRequests')} />
          <MenuButton imageSource={require('../../../assets/img/img_oracoes.png')} title={'ORAÇÕES'} onPress={() => navigation.navigate('DonationsRequests')} />
          <MenuButton imageSource={require('../../../assets/img/img_participe.png')} title={'PARTICIPE'} />
          <MenuButton imageSource={require('../../../assets/img/img_live.png')} title={'LIVES'} />
        </View>

        <ContactCard />
        <AboutUs />
      </View>
      <Address />
      </ScrollView>

      <NavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  carousel: {
    marginTop: 10,
    marginBottom: 20,
  },
  menuContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  menu: {
    width: '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  scrollView: {
    paddingBottom: '10px',
  }
});
