import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { get, getDatabase, onValue, ref, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { firebaseApp } from "../firebaseConfig";

export default function HomeScreen() {
  const router = useRouter();
  const competition = "magnum2025"; // dynamic later

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teams, setTeams] = useState([]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [hasPredictions, setHasPredictions] = useState(false);

  // Load deadline
  useEffect(() => {
    const loadDeadline = async () => {
      const db = getDatabase(firebaseApp);
      const snap = await get(ref(db, `${competition}/deadline`));
      if (snap.exists()) {
        const deadline = new Date(snap.val());
        if (new Date() > deadline) setDeadlinePassed(true);
      }
    };
    loadDeadline();
  }, []);

  // Check local predictions
  useEffect(() => {
    const checkLocalPredictions = async () => {
      const stored = await AsyncStorage.getItem("lockedPredictions");
      if (stored) setHasPredictions(true);
    };
    checkLocalPredictions();
  }, []);

  // Load teams
  useEffect(() => {
    const db = getDatabase(firebaseApp);
    const teamsRef = ref(db, `${competition}/teams`);

    const unsubscribe = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const teamList = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].teamName || key,
          hasSubmitted: !!data[key].hasSubmitted,
        }));
        setTeams(teamList);
      } else {
        setTeams([]);
      }
      setLoadingTeams(false);
    });

    return () => unsubscribe();
  }, []);

  const getSelectedTeamName = () => {
    const team = teams.find((t) => t.id === selectedTeamId);
    return team ? team.name : "";
  };

  // Main button
  const handleMainButtonPress = () => {
    if (hasPredictions || deadlinePassed) {
      router.push("/(tabs)/predictions");
    } else {
      setModalVisible(true);
    }
  };

  // Continue with selected team
  const handleContinue = async () => {
    if (!selectedTeamId) {
      Alert.alert("Please select a team");
      return;
    }

    const db = getDatabase(firebaseApp);
    const teamRef = ref(db, `${competition}/teams/${selectedTeamId}`);
    const snap = await get(teamRef);
    const teamData = snap.exists() ? snap.val() : {};

    if (teamData.hasSubmitted) {
      Alert.alert(
        "Team Already Submitted",
        `${
          teamData.teamName || getSelectedTeamName()
        } has already entered predictions!`,
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    await AsyncStorage.setItem("teamName", selectedTeamId);
    setModalVisible(false);
    router.push("/competition");
  };

  // Admin/dev: reset hasSubmitted locally and remotely
  const handleClearLocalData = async () => {
    try {
      const db = getDatabase(firebaseApp);
      const teamsRef = ref(db, `${competition}/teams`);
      const snapshot = await get(teamsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const updates = {};
        Object.keys(data).forEach((teamKey) => {
          updates[`${competition}/teams/${teamKey}/hasSubmitted`] = false;
        });
        await update(ref(db), updates);
      }

      await AsyncStorage.multiRemove(["lockedPredictions", "teamName"]);
      setHasPredictions(false);

      Alert.alert("All data cleared", "Local data and team submissions reset.");
    } catch (err) {
      console.error("Error clearing local data:", err);
      Alert.alert("Error", "Failed to clear data. Check your connection.");
    }
  };

  const buttonText = deadlinePassed
    ? "View Predictions Here"
    : hasPredictions
    ? "View Your Predictions"
    : "Make Your Predictions";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oxford Magnum Sweepstake</Text>

      <TouchableOpacity
        style={[
          styles.button,
          (deadlinePassed || hasPredictions) && styles.disabledButton,
        ]}
        onPress={handleMainButtonPress}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "red", marginTop: 15 }]}
        onPress={handleClearLocalData}
      >
        <Text style={styles.buttonText}>Clear Local Data</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalView}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>

                <Text style={styles.modalTitle}>Select Your Team</Text>

                {loadingTeams ? (
                  <ActivityIndicator size="large" color="#007AFF" />
                ) : teams.length > 0 ? (
                  <>
                    <Picker
                      selectedValue={selectedTeamId}
                      onValueChange={(itemValue) =>
                        setSelectedTeamId(itemValue)
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Choose your team..." value="" />
                      {teams
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((team) => (
                          <Picker.Item
                            key={team.id}
                            label={
                              team.hasSubmitted
                                ? `${team.name} (Already Entered)`
                                : team.name
                            }
                            value={team.id}
                            enabled={!team.hasSubmitted}
                          />
                        ))}
                    </Picker>

                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={handleContinue}
                    >
                      <Text style={styles.continueText}>
                        Continue as {getSelectedTeamName() || "Team"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text>No teams available yet.</Text>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  disabledButton: { backgroundColor: "#888" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  closeButton: { position: "absolute", top: 10, right: 10, zIndex: 1 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  picker: { width: "100%", marginVertical: 10 },
  continueButton: {
    marginTop: 15,
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  continueText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
