import React, { useCallback, useEffect, useRef, useState } from "react";
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
import useScreenData from "../../hooks/useScreenData";
import { listEventsWithImages } from "../../services/supabaseData";
import { saveEvent } from "../../services/supabaseEvents";
import showMessage from "../../utils/showMessage";

const emptyForm = { title: "", date: "", local: "" };
const formatDateTime = (date) => date.toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const dateInputValue = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ManageEventsADM() {
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const loadEvents = useCallback(() => listEventsWithImages(), [refreshKey]);
  const eventsState = useScreenData(loadEvents, { authenticated: true });
  const events = eventsState.data.map((event) => {
    const dateTime = `${event.data}T${event.horario}`;
    return { ...event, title: event.titulo, dateTime, date: formatDateTime(new Date(dateTime)), image: event.imageUrl };
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [pickerDate, setPickerDate] = useState(new Date());
  const [selectedDateTime, setSelectedDateTime] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [savedImagePath, setSavedImagePath] = useState(null);
  const [working, setWorking] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  const pickerTimer = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(pickerTimer.current);
    };
  }, []);

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateModal = () => {
    if (sending.current) return;
    setEditingEventId(null);
    setForm(emptyForm);
    setPickerMode("date");
    setPickerDate(new Date());
    setSelectedDateTime(null);
    setSelectedImage(null);
    setSelectedImageAsset(null);
    setRemoveImage(false);
    setSavedImagePath(null);
    setIsModalVisible(true);
  };

  const openEditModal = (event) => {
    if (sending.current) return;
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
    setSelectedImageAsset(null);
    setRemoveImage(false);
    setSavedImagePath(event.imagem_url || null);
    setIsModalVisible(true);
  };

  const resetModal = () => {
    clearTimeout(pickerTimer.current);
    setIsModalVisible(false);
    setEditingEventId(null);
    setForm(emptyForm);
    setShowDatePicker(false);
    setPickerMode("date");
    setSelectedImage(null);
    setSelectedImageAsset(null);
    setRemoveImage(false);
    setSavedImagePath(null);
  };

  const handleCloseModal = () => {
    if (!sending.current) resetModal();
  };

  const handlePickImage = async () => {
    if (sending.current) return;
    sending.current = true;
    setWorking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage("Permissão necessária", "Permita o acesso às fotos para escolher a capa do evento.");
        return;
      }
      if (!mounted.current) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, quality: 1, base64: true,
      });
      if (!result.canceled && mounted.current && result.assets?.[0]) {
        setSelectedImage(result.assets[0].uri);
        setSelectedImageAsset(result.assets[0]);
        setRemoveImage(false);
      }
    } catch {
      if (mounted.current) showMessage("Não foi possível selecionar", "Tente abrir suas fotos novamente.");
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
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
      clearTimeout(pickerTimer.current);
      pickerTimer.current = setTimeout(() => {
        if (mounted.current) setShowDatePicker(true);
      }, 250);
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

    dateTime.setSeconds(0, 0);
    setSelectedDateTime(dateTime);
    const formatted = formatDateTime(dateTime);
    setForm((prev) => ({ ...prev, date: formatted }));
  };

  const handleSaveEvent = async () => {
    if (sending.current) return;
    sending.current = true;
    setWorking(true);
    try {
      await saveEvent({
        id: editingEventId || undefined,
        title: form.title,
        dateTime: selectedDateTime,
        local: form.local,
        imageAsset: selectedImageAsset || undefined,
        removeImage,
        expectedImagePath: editingEventId !== null ? savedImagePath : undefined,
      });
      if (mounted.current) {
        resetModal();
        setRefreshKey((value) => value + 1);
        showMessage("Evento salvo", "As informações do evento foram salvas com sucesso.");
      }
    } catch (error) {
      if (mounted.current) showMessage("Não foi possível salvar o evento", error.message);
    } finally {
      sending.current = false;
      if (mounted.current) setWorking(false);
    }
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
            disabled={working}
            accessibilityRole="button"
            accessibilityLabel="Adicionar evento"
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
            {eventsState.loading && <Text style={style.eventText}>Carregando eventos...</Text>}
            {!!eventsState.errorMessage && <Text style={style.eventText}>Não foi possível carregar os eventos. Reabra a tela para tentar novamente.</Text>}
            {!eventsState.loading && !eventsState.errorMessage && filteredEvents.length === 0 && (
              <Text style={style.eventText}>Nenhum evento encontrado.</Text>
            )}
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={style.eventItem}
                onPress={() => openEditModal(event)}
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel={`Editar evento: ${event.title}`}
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
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel="Fechar evento"
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
              editable={!working}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
            />

            <TouchableOpacity
              style={style.dateButton}
              disabled={working}
              accessibilityRole="button"
              accessibilityLabel="Escolher dia e horário"
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

            {showDatePicker && Platform.OS === "web" && (
              <View style={style.dateButton}>
                <input
                  type="datetime-local"
                  aria-label="Dia e horário do evento"
                  value={dateInputValue(pickerDate)}
                  disabled={working}
                  onChange={(event) => {
                    const dateTime = new Date(event.target.value);
                    if (Number.isNaN(dateTime.getTime())) return;
                    setPickerDate(dateTime);
                    setSelectedDateTime(dateTime);
                    setForm((prev) => ({ ...prev, date: formatDateTime(dateTime) }));
                  }}
                  style={{ width: "100%", border: 0, backgroundColor: "transparent", color: "#0B233E", fontSize: 16 }}
                />
              </View>
            )}
            {showDatePicker && Platform.OS !== "web" && (
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
              editable={!working}
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
                {editingEventId !== null && !removeImage && (selectedImage || savedImagePath) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedImage(null);
                      setSelectedImageAsset(null);
                      setRemoveImage(true);
                    }}
                    disabled={working}
                    accessibilityRole="button"
                    accessibilityLabel="Remover capa do evento"
                    style={style.removeImageButton}
                  >
                    <Icon name="trash-2" size={16} color="#0B233E" />
                    <Text style={style.removeImageText}>Remover capa</Text>
                  </TouchableOpacity>
                )}
            {removeImage && <Text style={style.removeImageText}>A capa será removida ao salvar. O evento e as inscrições serão mantidos.</Text>}

            <View style={style.modalActions}>
              <TouchableOpacity
                style={style.primaryButton}
                onPress={handleSaveEvent}
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel="Salvar evento"
                accessibilityState={{ disabled: working, busy: working }}
              >
                <Text style={style.primaryButtonText}>{working ? "Salvando..." : "Salvar"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={style.iconButton}
                onPress={handlePickImage}
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel="Escolher capa do evento"
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
