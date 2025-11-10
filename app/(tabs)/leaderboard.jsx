import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { firebaseApp } from "../../firebaseConfig";

export default function LeaderboardScreen() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const competition = "magnum2025"; // can be dynamic later

  useEffect(() => {
    const db = getDatabase(firebaseApp);
    const submissionsRef = ref(db, `submissions/${competition}`);
    const resultsRef = ref(db, `results/${competition}`);

    let resultsData = {};

    // Listen for results first
    onValue(resultsRef, (snapshot) => {
      resultsData = snapshot.exists() ? snapshot.val() : {};

      // Then listen for submissions
      onValue(submissionsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          const formatted = Object.keys(data).map((teamKey) => {
            const submission = data[teamKey];

            // Convert predictions object to array
            const preds = Object.values(submission.predictions || {});

            // Only count matches that have results
            const matchesWithResults = preds.filter(
              (p) => resultsData[p.id] !== undefined
            );

            const correct = matchesWithResults.filter(
              (p) => resultsData[p.id] === p.winner
            ).length;

            const totalCount = matchesWithResults.length;

            const score =
              totalCount > 0 ? Math.round((correct / totalCount) * 100) : 0;

            return {
              teamName: submission.teamName || teamKey,
              competition: submission.competition,
              predictions: preds,
              score,
            };
          });

          formatted.sort((a, b) => b.score - a.score);
          setSubmissions(formatted);
        } else {
          setSubmissions([]);
        }

        setLoading(false);
      });
    });
  }, []);

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  if (submissions.length === 0)
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No submissions yet 🕓</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Leaderboard</Text>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.teamName}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name}>{item.teamName}</Text>
            <Text style={styles.score}>{item.score}%</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rank: { fontWeight: "bold", fontSize: 18 },
  name: { fontSize: 18, flex: 1, textAlign: "center" },
  score: { fontSize: 18, fontWeight: "bold" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, color: "gray" },
});
