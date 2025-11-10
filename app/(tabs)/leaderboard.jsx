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

  const competition = "magnum2025"; // can make dynamic later

  useEffect(() => {
    const db = getDatabase(firebaseApp);
    const submissionsRef = ref(db, `submissions/${competition}`);
    const resultsRef = ref(db, `results/${competition}`);

    // Listen for results
    const unsubscribeResults = onValue(resultsRef, (resultsSnap) => {
      const resultsData = resultsSnap.exists() ? resultsSnap.val() : {};

      // Listen for submissions under the competition
      const unsubscribeSubs = onValue(submissionsRef, (subsSnap) => {
        if (subsSnap.exists()) {
          const data = subsSnap.val();

          const formatted = Object.keys(data).map((teamKey) => {
            const submission = data[teamKey];
            const preds = Object.values(submission.predictions || {});

            // Only include matches that have results
            const matchesWithResults = preds.filter(
              (p) => resultsData[p.id] !== undefined
            );

            const correct = matchesWithResults.filter(
              (p) => resultsData[p.id] === p.winner
            ).length;

            const score =
              matchesWithResults.length > 0
                ? Math.round((correct / matchesWithResults.length) * 100)
                : 0;

            return {
              teamName: submission.teamName || teamKey,
              competition: submission.competition,
              predictions: preds,
              score,
            };
          });

          // Sort descending by score
          formatted.sort((a, b) => b.score - a.score);
          setSubmissions(formatted);
        } else {
          setSubmissions([]);
        }
        setLoading(false);
      });

      // Cleanup listener for submissions
      return () => unsubscribeSubs();
    });

    // Cleanup listener for results
    return () => unsubscribeResults();
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
