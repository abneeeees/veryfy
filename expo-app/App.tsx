import { StatusBar } from "expo-status-bar";
import { startTransition, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import ResultScreen from "./app/result";
import ScanScreen from "./app/index";
import type { CheckinResponse } from "./types/checkin";

type Screen = "scanner" | "result";

export default function App() {
  const [screen, setScreen] = useState<Screen>("scanner");
  const [result, setResult] = useState<CheckinResponse | null>(null);

  const handleResult = (nextResult: CheckinResponse) => {
    startTransition(() => {
      setResult(nextResult);
      setScreen("result");
    });
  };

  const handleScanAgain = () => {
    startTransition(() => {
      setResult(null);
      setScreen("scanner");
    });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          {screen === "scanner" || result === null ? (
            <ScanScreen onResult={handleResult} />
          ) : (
            <ResultScreen result={result} onScanAgain={handleScanAgain} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe6",
  },
  container: {
    flex: 1,
  },
});
