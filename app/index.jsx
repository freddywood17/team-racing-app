import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase, ref, get, onValue, update } from "firebase/database";
import { firebaseApp } from "../firebaseConfig";
import { Picker } from "@react-native-picker/picker";

export default function HomeScreen() {
  const router = useRouter();
  const competition = "Magnum2025"; // can be dynamic later

  const [modalVisible, setModalVisible] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState([]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [hasPredictions, setHasPredictions] = useState(false);

  // 🕓 Load deadline from Firebase
  useEffect(() => {
    const checkDeadline = async () => {
      const db = getDatabase(firebaseApp);
      const deadlineSnap = await get(ref(db, `deadlines/${competition}`));
      if (deadlineSnap.exists()) {
        const deadline = new Date(deadlineSnap.val());
        if (new Date() > deadline) setDeadlinePassed(true);
      }
    };
    checkDeadline();
  }, []);

  // 📦 Check if user has already made predictions locally
  useEffect(() => {
    const checkLocalPredictions = async () => {
      const stored = await AsyncStorage.getItem("lockedPredictions");
      if (stored) setHasPredictions(true);
    };
    checkLocalPredictions();
  }, []);

  // 🔥 Load team list from Firebase dynamically
  useEffect(() => {
    const db = getDatabase(firebaseApp);
    const teamsRef = ref(db, `teams/competitions/${competition}`);

    const unsubscribe = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const teamList = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].name,
          hasSubmitted: data[key].hasSubmitted || false,
        }));
        setTeams(teamList);
      } else {
        setTeams([]);
      }
      setLoadingTeams(false);
    });

    return () => unsubscribe();
  }, []);

  // 🚀 Handle main button press
  const handleMainButtonPress = () => {
    if (hasPredictions || deadlinePassed) {
      router.push("/(tabs)/predictions");
    } else {
      setModalVisible(true);
    }
  };

  // ✅ Handle team selection
  const handleContinue = async () => {
    if (!teamName) {
      Alert.alert("Please select a team");
      return;
    }

    const db = getDatabase(firebaseApp);
    const teamRef = ref(db, `teams/competitions/${competition}/${teamName}`);
    const teamSnap = await get(teamRef);
    const teamData = teamSnap.exists() ? teamSnap.val() : {};

    if (teamData.hasSubmitted) {
      Alert.alert(
        "Team Already Submitted",
        `${teamData.name} has already entered their predictions!`,
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    await AsyncStorage.setItem("teamName", teamName);
    setModalVisible(false);
    router.push("/competition");
  };

  // 🧹 Admin/dev button
  const handleClearLocalData = async () => {
    try {
      const db = getDatabase(firebaseApp);
      const teamsRef = ref(db, `teams/competitions/${competition}`);
      const snapshot = await get(teamsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const updates = {};
        Object.keys(data).forEach((teamKey) => {
          updates[
            `teams/competitions/${competition}/${teamKey}/hasSubmitted`
          ] = false;
        });
        await update(ref(db), updates);
      }

      await AsyncStorage.multiRemove(["lockedPredictions", "teamName"]);
      setHasPredictions(false);

      Alert.alert(
        "All data cleared",
        "Local data and team submissions have been reset."
      );
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

      {/* 🧩 Team selection modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Your Team</Text>

            {loadingTeams ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : teams.length > 0 ? (
              <>
                <Picker
                  selectedValue={teamName}
                  onValueChange={(itemValue) => setTeamName(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Choose your team..." value="" />
                  {teams.map((team) => (
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
                    Continue as {teamName || "Team"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text>No teams available yet.</Text>
            )}
          </View>
        </View>
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
  },
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
