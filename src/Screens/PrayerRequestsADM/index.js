// Arquivo: PrayerRequestsADM.js (AJUSTADO COM IMAGEM)

import React, { useMemo, useState } from "react";
import { View, ScrollView, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, Image } from "react-native"; 
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useNavigation } from '@react-navigation/native'; 

import AdminHeader from "../../components/header/AdminHeader.jsx"; 
import { ListItem } from "../../components/ListItem"; 
import NavBar from "../../components/navBar"; 
import { listPrayerRequests } from "../../services/supabaseData";
import useScreenData from "../../hooks/useScreenData";

export default function PrayerRequestsADM() {
    const navigation = useNavigation();
    const [searchText, setSearchText] = useState("");
    const { data: prayerRequests, loading, errorMessage } = useScreenData(
        listPrayerRequests, { authenticated: true }
    );

    const filteredPrayerRequests = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return prayerRequests;
        return prayerRequests.filter((item) =>
            item.nome.toLowerCase().includes(query) ||
            item.pedido.toLowerCase().includes(query)
        );
    }, [prayerRequests, searchText]);
    
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
                            value={searchText}
                            onChangeText={setSearchText}
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
                    {loading && <Text style={styles.stateText}>Carregando pedidos...</Text>}
                    {!loading && !!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                    {!loading && !errorMessage && filteredPrayerRequests.length === 0 && (
                        <Text style={styles.stateText}>Nenhum pedido de oração encontrado.</Text>
                    )}
                    {filteredPrayerRequests.map((item) => (
                        <ListItem
                            key={item.id}
                            title={`${item.nome} (${new Date(item.created_at).toLocaleDateString("pt-BR")})`}
                            hasContent={true} 
                            content={<Text style={styles.contentText}>{item.pedido}</Text>}
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
    },
    stateText: { textAlign: "center", color: "#555", padding: 20 },
    errorText: { textAlign: "center", color: "#B00020", padding: 20 },
});
