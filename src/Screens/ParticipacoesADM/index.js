import React, { useState, useMemo } from "react"; 
import { View, ScrollView, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Image } from "react-native"; 
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useNavigation } from '@react-navigation/native'; 

import AdminHeader from "../../components/header/AdminHeader"; 
import { ListItem } from "../../components/ListItem"; 
import NavBar from "../../components/navBar"; 


const initialParticipationsData = [
    { 
        id: 1, 
        name: "Maria Alves de Souza", 
        content: "Doação de Alimentos\n29/08/2024 - 17:00", 
        defaultOpen: true, 
        status: "Ativo"
    },
    { 
        id: 2,
        name: "Alfreduo De Lima", 
        content: "Campanha do Agasalho\n12/09/2024 - 08:00",
        defaultOpen: false, 
        status: "Ativo"
    },
    { 
        id: 3,
        name: "Ana Costa", 
        content: "Campanha do Agasalho\n12/09/2024 - 08:00",
        defaultOpen: true, 
        status: "Pendente"
    },
];

export default function ParticipacoesADM() {
    const navigation = useNavigation();
    
    const [searchText, setSearchText] = useState(''); 
    const [participations, setParticipations] = useState(initialParticipationsData);

    const handleEditParticipation = (participationId) => {
        Alert.alert(
            "Ação ADM", 
            `Abrir detalhes/edição da participação ID: ${participationId}.`
        );
    };

    const filteredParticipations = useMemo(() => {
        if (!searchText) {
            return participations;
        }
        const lowerCaseSearch = searchText.toLowerCase();
        return participations.filter(item => 
            item.name.toLowerCase().includes(lowerCaseSearch) ||
            item.content.toLowerCase().includes(lowerCaseSearch)
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
                    {filteredParticipations.map((item) => (
                        <ListItem
                            key={item.id} 
                            title={item.name} 
                            hasContent={true} 
                            content={<Text style={styles.contentText}>{item.content}</Text>}
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
});