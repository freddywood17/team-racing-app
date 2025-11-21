import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { getDatabase, onValue, ref } from "firebase/database";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { firebaseApp } from "../../firebaseConfig";

export default function MyPredictionsScreen() {
  const [predictions, setPredictions] = useState([]);
  const [results, setResults] = useState({});
  const router = useRouter();

  // Load the user's saved + locked predictions
  const loadPredictions = async () => {
    const stored = await AsyncStorage.getItem("lockedPredictions");

    if (stored) {
      const parsed = JSON.parse(stored);

      // Ensure predictions exist
      if (parsed && parsed.predictions) {
        // Convert object → array
        const arr = Object.values(parsed.predictions);

        // Sort by match ID
        const ordered = arr.sort((a, b) => Number(a.id) - Number(b.id));

        setPredictions(ordered);
      } else {
        setPredictions([]);
      }
    } else {
      setPredictions([]);
    }
  };

  // Live listener for results
  const startResultsListener = () => {
    const db = getDatabase(firebaseApp);

    // Correct path: magnum2025/results
    const resultsRef = ref(db, "magnum2025/results");

    const unsubscribe = onValue(resultsRef, (snapshot) => {
      setResults(snapshot.exists() ? snapshot.val() : {});
    });

    return unsubscribe;
  };

  useFocusEffect(
    useCallback(() => {
      loadPredictions();
      const unsubscribe = startResultsListener();
      return () => unsubscribe();
    }, [])
  );

  const renderItem = ({ item }) => {
    const matchResult = results[item.id];

    const resultText = matchResult
      ? `${matchResult} ${matchResult === item.winner ? "✅" : "❌"}`
      : "⏰ Pending";

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, styles.match]}>
          {item.teamA} vs {item.teamB}
        </Text>
        <Text style={[styles.cell, styles.pick]}>{item.winner}</Text>
        <Text style={[styles.cell, styles.status]}>{resultText}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace("/")}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Your Predictions</Text>

      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.match]}>Match</Text>
        <Text style={[styles.cell, styles.pick]}>Your Pick</Text>
        <Text style={[styles.cell, styles.status]}>Result</Text>
      </View>

      <FlatList
        data={predictions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
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
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerRow: { borderBottomWidth: 2, borderBottomColor: "#333" },
  cell: { flex: 1, textAlign: "center" },
  match: { flex: 2, fontWeight: "500" },
  pick: { flex: 1 },
  status: { flex: 1 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },
});
