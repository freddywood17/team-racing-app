import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { get, getDatabase, ref, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { matches as rawMatches } from "../constants/matches";
import { firebaseApp } from "../firebaseConfig";

export default function MatchesScreen() {
  const router = useRouter();
  const [predictions, setPredictions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submissionClosed, setSubmissionClosed] = useState(false);
  const [teams, setTeams] = useState({});

  const competition = "magnum2025";

  // Load saved predictions
  useEffect(() => {
    const loadPredictions = async () => {
      const stored = await AsyncStorage.getItem("predictions");
      setPredictions(stored ? JSON.parse(stored) : []);
    };
    loadPredictions();
  }, [modalVisible]);

  // Check deadline
  useEffect(() => {
    const checkDeadline = async () => {
      const db = getDatabase(firebaseApp);
      const snap = await get(ref(db, `${competition}/deadline`));
      const deadline = snap.exists() ? new Date(snap.val()) : null;
      if (deadline && new Date() > deadline) setSubmissionClosed(true);
    };
    checkDeadline();
  }, []);

  // Load teams dynamically
  useEffect(() => {
    const fetchTeams = async () => {
      const db = getDatabase(firebaseApp);
      const snap = await get(ref(db, `${competition}/teams`));
      if (snap.exists()) {
        setTeams(snap.val());
      }
    };
    fetchTeams();
  }, []);

  // Merge predictions with match data
  const orderedMatches = rawMatches.map((m) => {
    const existing = predictions.find((p) => p.id === m.id);
    return existing
      ? { ...m, winner: existing.winner, competitionId: competition }
      : { ...m, competitionId: competition };
  });

  const handlePreviewAndSubmit = async () => {
    const db = getDatabase(firebaseApp);
    const snap = await get(ref(db, `${competition}/deadline`));
    const deadline = snap.exists() ? new Date(snap.val()) : null;

    if (deadline && new Date() > deadline) {
      Alert.alert(
        "Submissions Closed",
        `Predictions for ${competition} closed at ${deadline.toLocaleString()}.`
      );
      return;
    }

    if (predictions.length === 0) {
      Alert.alert("No Predictions", "You have not made any predictions yet!");
      return;
    }

    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Competition Predictions</Text>

      <FlatList
        data={orderedMatches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const teamAName = teams[item.teamA]?.teamName || item.teamA;
          const teamBName = teams[item.teamB]?.teamName || item.teamB;
          const selectedWinner = predictions.find(
            (p) => p.id === item.id
          )?.winner;

          return (
            <View style={styles.matchItem}>
              <Text style={styles.matchText}>
                {teamAName} vs {teamBName}
              </Text>
              <View style={styles.teamsContainer}>
                {[teamAName, teamBName].map((team) => {
                  const isSelected = selectedWinner === team;
                  return (
                    <TouchableOpacity
                      key={team}
                      style={[
                        styles.teamButton,
                        isSelected && styles.selectedTeamButton,
                      ]}
                      onPress={async () => {
                        const newPredictions = predictions.filter(
                          (p) => p.id !== item.id
                        );
                        newPredictions.push({
                          id: item.id,
                          teamA: teamAName,
                          teamB: teamBName,
                          winner: team,
                          competitionId: competition,
                        });
                        setPredictions(newPredictions);
                        await AsyncStorage.setItem(
                          "predictions",
                          JSON.stringify(newPredictions)
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.teamButtonText,
                          isSelected && styles.selectedTeamButtonText,
                        ]}
                      >
                        {team}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
      />

      <Button
        title="Preview & Submit"
        onPress={handlePreviewAndSubmit}
        disabled={submissionClosed}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Your Predictions</Text>

            {predictions
              .slice()
              .sort((a, b) => parseInt(a.id) - parseInt(b.id))
              .map((p) => (
                <Text key={p.id} style={styles.predictionText}>
                  {p.teamA} vs {p.teamB} →{" "}
                  <Text style={{ fontWeight: "bold" }}>{p.winner}</Text>
                </Text>
              ))}

            <View style={styles.modalButtons}>
              <Button title="Go Back" onPress={() => setModalVisible(false)} />
              <Button
                title="Submit"
                onPress={async () => {
                  try {
                    const teamId = await AsyncStorage.getItem("teamName");
                    if (!teamId) {
                      alert(
                        "No team selected. Please go back and select your team first."
                      );
                      return;
                    }

                    const db = getDatabase(firebaseApp);
                    const teamRef = ref(db, `${competition}/teams/${teamId}`);
                    const teamSnap = await get(teamRef);

                    if (teamSnap.exists() && teamSnap.val().hasSubmitted) {
                      alert("Your team has already made their predictions!");
                      return;
                    }

                    const predictionsObj = {};
                    predictions.forEach((p, index) => {
                      predictionsObj[index] = p;
                    });

                    const submission = {
                      teamName: teams[teamId]?.teamName || teamId,
                      competition,
                      timeSubmitted: new Date().toISOString(),
                      predictions: predictionsObj,
                    };

                    // ✅ Save under competition path
                    await set(
                      ref(db, `${competition}/submissions/${teamId}`),
                      submission
                    );
                    await update(teamRef, { hasSubmitted: true });

                    await AsyncStorage.setItem(
                      "lockedPredictions",
                      JSON.stringify(submission)
                    );
                    await AsyncStorage.removeItem("predictions");

                    alert("Predictions submitted successfully!");
                    setModalVisible(false);
                    router.replace("/(tabs)/predictions");
                  } catch (error) {
                    console.error("Error submitting predictions:", error);
                    alert("Error submitting predictions.");
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: { position: "absolute", top: 40, left: 20, zIndex: 1 },
  matchItem: { marginVertical: 10 },
  matchText: { fontSize: 18, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  predictionText: { fontSize: 16, marginVertical: 6 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  teamsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  teamButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
  },
  selectedTeamButton: { backgroundColor: "#28a745", borderColor: "#28a745" },
  teamButtonText: { fontSize: 16, textAlign: "center", color: "#007AFF" },
  selectedTeamButtonText: { color: "white", fontWeight: "bold" },
});
