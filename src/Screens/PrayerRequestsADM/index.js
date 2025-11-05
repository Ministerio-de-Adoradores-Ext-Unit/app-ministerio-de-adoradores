// Arquivo: PrayerRequestsADM.js (AJUSTADO COM IMAGEM)

import React from "react";
import { View, ScrollView, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, Image } from "react-native"; 
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useNavigation } from '@react-navigation/native'; 

import AdminHeader from "../../components/header/AdminHeader.jsx"; 
import { ListItem } from "../../components/ListItem"; 
import NavBar from "../../components/navBar"; 

const prayerRequestsData = [
    { 
        name: "ANA SILVA (SAÚDE)", 
        defaultOpen: true, 
        content: "Peço oração urgente pela saúde de meu filho, João. Ele fará uma cirurgia delicada na próxima semana. Agradeço imensamente as orações da igreja.",
        date: "01/11/2025"
    },
    { 
        name: "MARCOS FERREIRA (EMPREGO)", 
        defaultOpen: false, 
        content: "Gostaria que orem por mim. Fui demitido e estou buscando uma nova colocação profissional na área de TI.",
        date: "30/10/2025"
    },
    { 
        name: "PATRÍCIA MOURA (FAMÍLIA)", 
        defaultOpen: true, 
        content: "Oração pela restauração do meu casamento. Temos passado por momentos difíceis, mas cremos que Deus pode intervir.",
        date: "29/10/2025"
    },
];

export default function PrayerRequestsADM() {
    const navigation = useNavigation();
    
    return (
        <SafeAreaView style={styles.container}>
            
            <AdminHeader /> 

            <ScrollView style={styles.scrollView}>
                
                <Text style={styles.mainTitle}>PEDIDOS DE ORAÇÕES</Text>

                <View style={styles.searchFilterContainer}>
                    <View style={styles.searchBox}>
                        <Icon name="search" size={24} color="#888" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="search..."
                            placeholderTextColor="#888"
                            
                        />
                    </View>
                    
                    
                    <TouchableOpacity style={styles.filterButton}>
                        
                        <Image 
                            source={require("../../../assets/img/Filter.png")} 
                            style={styles.filterImage} 
                        />
                    </TouchableOpacity>
                    
                    
                </View>

                <View style={styles.listContainer}>
                    {prayerRequestsData.map((item, index) => (
                        <ListItem
                            key={index}
                            title={`${item.name} (${item.date})`} 
                            hasContent={true} 
                            content={<Text style={styles.contentText}>{item.content}</Text>}
                            defaultExpanded={item.defaultOpen}
                            isDark={true} 
                        />
                    ))}
                    <View style={{height: 100}} /> 
                </View>
            </ScrollView>
            
            <NavBar navigation={navigation} isAdmin={true} /> 

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f0f0", 
    },
    scrollView: {
        flex: 1,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        paddingHorizontal: 20,
        marginTop: 15,    
        marginBottom: 15, 
    },
    searchFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20, 
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EAEAEA', 
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 45,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
        paddingVertical: 0,
    },
    filterButton: {
        padding: 4, 
    },
   
    filterImage: {
        width: 34, 
        height: 34, 
        resizeMode: 'contain', 
    },
    listContainer: {
        paddingVertical: 10,
    },
    contentText: {
        fontSize: 14,
        color: '#FFF', 
    }
});