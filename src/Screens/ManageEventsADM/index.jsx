import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Image,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import style from "./style";
import NavBar from "../../components/navBar";

const initialEvents = [
  {
    id: 1,
    title: "Culto de Jovens",
    date: "Sábado, 19h",
    local: "Salão da igreja",
  },
  {
    id: 2,
    title: "Culto das Irmãs",
    date: "Quinta, 20h",
    local: "Auditório principal",
  },
  { id: 3, title: "Santa Ceia", date: "Domingo, 18h", local: "Templo central" },
  {
    id: 4,
    title: "Culto das crianças",
    date: "Sábado, 15h",
    local: "Sala infantil",
  },
];

const emptyForm = { title: "", date: "", local: "" };

export default function ManageEventsADM() {
  const navigation = useNavigation();
  const [events, setEvents] = useState(initialEvents);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [pickerDate, setPickerDate] = useState(new Date());
  const [selectedDateTime, setSelectedDateTime] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateModal = () => {
    setEditingEventId(null);
    setForm(emptyForm);
    setPickerMode("date");
    setPickerDate(new Date());
    setSelectedDateTime(null);
    setIsModalVisible(true);
  };

  const openEditModal = (event) => {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      date: event.date,
      local: event.local,
    });
    const eventDateTime = event.dateTime
      ? new Date(event.dateTime)
      : new Date();
    setPickerDate(eventDateTime);
    setSelectedDateTime(event.dateTime ? eventDateTime : null);
    setPickerMode("date");
    setSelectedImage(event.image || null);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingEventId(null);
    setForm(emptyForm);
    setShowDatePicker(false);
    setPickerMode("date");
    setSelectedImage(null);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "dismissed" || !selectedDate) {
      setShowDatePicker(false);
      setPickerMode("date");
      return;
    }

    if (Platform.OS === "android" && pickerMode === "date") {
      setPickerDate(selectedDate);
      setShowDatePicker(false);
      setPickerMode("time");
      setTimeout(() => setShowDatePicker(true), 250);
      return;
    }

    const dateTime = new Date(pickerDate);
    if (Platform.OS === "android") {
      dateTime.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setPickerDate(dateTime);
      setShowDatePicker(false);
      setPickerMode("date");
    } else {
      dateTime.setTime(selectedDate.getTime());
    }

    setSelectedDateTime(dateTime);
    const formatted = dateTime.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setForm((prev) => ({ ...prev, date: formatted }));
  };

  const handleSaveEvent = () => {
    if (!form.title.trim()) return;

    if (editingEventId !== null) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === editingEventId
            ? {
                ...event,
                title: form.title.trim(),
                date: form.date.trim() || event.date,
                dateTime: selectedDateTime?.toISOString() || event.dateTime,
                local: form.local.trim() || event.local,
                image: selectedImage || event.image,
              }
            : event,
        ),
      );
    } else {
      setEvents((prev) => [
        {
          id: Date.now(),
          title: form.title.trim(),
          date: form.date.trim() || "Data a definir",
          dateTime: selectedDateTime?.toISOString(),
          local: form.local.trim() || "Local a definir",
          image: selectedImage,
        },
        ...prev,
      ]);
    }

    handleCloseModal();
  };

  return (
    <SafeAreaView style={style.container}>
      <View style={style.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={style.backButton}
        >
          <Icon name="arrow-left" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={style.contentContainer}>
        <ScrollView
          style={style.scrollView}
          contentContainerStyle={style.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={style.title}>GERENCIAR EVENTOS</Text>

          <TouchableOpacity
            style={style.addCard}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <Text style={style.addText}>Adicionar Evento</Text>
            <View style={style.plusCircle}>
              <Icon name="plus" size={38} color="#0B233E" />
            </View>
          </TouchableOpacity>

          <Text style={style.sectionTitle}>EVENTOS</Text>

          <View style={style.searchContainer}>
            <Icon
              name="search"
              size={20}
              color="#0B233E"
              style={style.searchIcon}
            />
            <TextInput
              style={style.searchInput}
              placeholder="search..."
              placeholderTextColor="#3B3B3B"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={style.listContainer}>
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={style.eventItem}
                onPress={() => openEditModal(event)}
                activeOpacity={0.85}
              >
                <Text style={style.eventText}>{event.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={style.modalBackdrop}>
          <View style={style.modalCard}>
            <View style={style.modalHeader}>
              <Text style={style.modalTitle}>
                {editingEventId !== null ? "EDITAR" : "ADICIONAR"}
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={style.closeButton}
              >
                <Icon name="x" size={22} color="#1D1D1D" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={style.input}
              placeholder="Título"
              placeholderTextColor="#0B233E"
              value={form.title}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
            />

            <TouchableOpacity
              style={style.dateButton}
              onPress={() => {
                setPickerMode("date");
                setShowDatePicker(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={style.dateButtonText}>
                {form.date ? form.date : "Dia e Horário"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                key={pickerMode}
                value={pickerMode === "time" ? pickerDate : pickerDate}
                mode={Platform.OS === "ios" ? "datetime" : pickerMode}
                display="default"
                onChange={handleDateChange}
              />
            )}

            <TextInput
              style={style.input}
              placeholder="Local"
              placeholderTextColor="#0B233E"
              value={form.local}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, local: value }))
              }
            />

            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={style.previewImage}
              />
            ) : null}

            <View style={style.modalActions}>
              <TouchableOpacity
                style={style.primaryButton}
                onPress={handleSaveEvent}
              >
                <Text style={style.primaryButtonText}>Salvar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={style.iconButton}
                onPress={handlePickImage}
              >
                <Icon name="image" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NavBar />
    </SafeAreaView>
  );
}
