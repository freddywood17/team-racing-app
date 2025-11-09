import React, { useEffect, useState } from "react";
import { Tabs, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export default function TabLayout() {
  const [hasPredictions, setHasPredictions] = useState(null); // null = loading
  const navigation = useNavigation();

  // 🔁 Function to check AsyncStorage
  const checkPredictions = async () => {
    try {
      const stored = await AsyncStorage.getItem("lockedPredictions");
      setHasPredictions(!!stored);
    } catch (err) {
      console.error("Error checking predictions:", err);
      setHasPredictions(false);
    }
  };

  // ✅ Check when the layout first loads
  useEffect(() => {
    checkPredictions();
  }, []);

  // 👀 Re-check whenever you come back to this tab layout
  useFocusEffect(
    React.useCallback(() => {
      checkPredictions();
    }, [])
  );

  // 🎯 Listen for manual refresh events from index.jsx (optional but powerful)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", checkPredictions);
    return unsubscribe;
  }, [navigation]);

  if (hasPredictions === null) {
    // ⏳ Simple loading indicator while AsyncStorage is checked
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Tabs>
      {/* 🏆 Always visible: leaderboard */}
      <Tabs.Screen
        name="leaderboard"
        options={{ title: "Leaderboard", headerShown: false }}
      />

      {/* ⚙️ Only show Matches before predictions are made */}
      {!hasPredictions && (
        <Tabs.Screen
          name="competition"
          options={{ title: "Matches", headerShown: false }}
        />
      )}

      {/* 📊 Only show My Predictions after predictions are made */}
      {hasPredictions && (
        <Tabs.Screen
          name="predictions"
          options={{ title: "My Predictions", headerShown: false }}
        />
      )}
    </Tabs>
  );
}
