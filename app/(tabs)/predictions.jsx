import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { matches } from "../../constants/matches";
import { getDatabase, ref, onValue } from "firebase/database";
import { firebaseApp } from "../../firebaseConfig";

export default function MyPredictionsScreen() {
  const [predictions, setPredictions] = useState([]);
  const [results, setResults] = useState({});
  const router = useRouter();

  // Load user's saved predictions
  const loadPredictions = async () => {
    const stored = await AsyncStorage.getItem("lockedPredictions");
    if (stored) {
      const parsed = JSON.parse(stored);
      const ordered = matches
        .map((m) => parsed.predictions.find((p) => p.id === m.id))
        .filter(Boolean);
      setPredictions(ordered);
    } else {
      setPredictions([]);
    }
  };

  // ✅ Live listener for match results
  const startResultsListener = () => {
    const db = getDatabase(firebaseApp);
    const resultsRef = ref(db, "results/Magnum2025");

    const unsubscribe = onValue(resultsRef, (snapshot) => {
      if (snapshot.exists()) {
        setResults(snapshot.val());
      } else {
        setResults({});
      }
    });

    return unsubscribe; // return the cleanup function directly
  };

  useFocusEffect(
    useCallback(() => {
      loadPredictions();
      const unsubscribe = startResultsListener();
      return () => unsubscribe(); // cleanly detach listener
    }, [])
  );

  const renderItem = ({ item }) => {
    const matchResult = results[item.id];
    let resultText = "⏰ Pending";

    if (matchResult) {
      const correct = matchResult === item.winner;
      resultText = `${matchResult} ${correct ? "✅" : "❌"}`;
    }

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
      {/* 🔙 Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace("/")}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Your Predictions</Text>

      {/* Table header */}
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
