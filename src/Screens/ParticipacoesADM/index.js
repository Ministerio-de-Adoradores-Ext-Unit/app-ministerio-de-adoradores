import React, { useState, useMemo } from "react";
import { View, ScrollView, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, Image } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useNavigation } from '@react-navigation/native'; 

import AdminHeader from "../../components/header/AdminHeader"; 
import { ListItem } from "../../components/ListItem"; 
import NavBar from "../../components/navBar"; 
import { listEventRegistrations } from "../../services/supabaseData";
import useScreenData from "../../hooks/useScreenData";

export default function ParticipacoesADM() {
    const navigation = useNavigation();
    
    const [searchText, setSearchText] = useState(''); 
    const { data: participations, loading, errorMessage } = useScreenData(
        listEventRegistrations, { authenticated: true }
    );

    const filteredParticipations = useMemo(() => {
        if (!searchText.trim()) {
            return participations;
        }
        const lowerCaseSearch = searchText.trim().toLowerCase();
        return participations.filter(item => 
            item.nome_completo.toLowerCase().includes(lowerCaseSearch) ||
            item.email.toLowerCase().includes(lowerCaseSearch) ||
            item.events?.titulo?.toLowerCase().includes(lowerCaseSearch)
        );
    }, [participations, searchText]);

    return (
        <SafeAreaView style={styles.container}>
            
            <AdminHeader /> 

            <ScrollView style={styles.scrollView}>
                
                <Text style={styles.mainTitle}>PARTICIPAÇÕES</Text>

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
                    {loading && <Text style={styles.stateText}>Carregando participações...</Text>}
                    {!loading && !!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                    {!loading && !errorMessage && filteredParticipations.length === 0 && (
                        <Text style={styles.stateText}>Nenhuma participação encontrada.</Text>
                    )}
                    {filteredParticipations.map((item) => (
                        <ListItem
                            key={item.id} 
                            title={item.nome_completo}
                            hasContent={true} 
                            content={
                                <Text style={styles.contentText}>
                                    {item.events?.titulo ?? "Evento não encontrado"}{"\n"}
                                    {item.telefone}{"\n"}{item.email}
                                </Text>
                            }
                            isDark={false} 
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
        backgroundColor: "#FFFFFF", 
    },
    scrollView: {
        flex: 1,
    },
    mainTitle: {
        fontSize: 28, 
        fontWeight: 'bold',
        color: '#000', 
        paddingHorizontal: 20,
        marginTop: 15,    
        marginBottom: 20, 
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
        borderRadius: 15, 
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
        width: 30, 
        height: 30, 
        resizeMode: 'contain', 
        tintColor: '#000', 
    },
    listContainer: {
        paddingVertical: 10,
    },
    contentText: {
        fontSize: 14,
        color: '#333', 
    },
    stateText: { textAlign: "center", color: "#555", padding: 20 },
    errorText: { textAlign: "center", color: "#B00020", padding: 20 },
});
