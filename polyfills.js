import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Storage from "./utils/storage";

if (Platform.OS === "web") {
  const map = ["getItem","setItem","removeItem","clear","getAllKeys","multiSet","multiGet","multiRemove"];
  for (const m of map) {
    if (typeof Storage[m] === "function") {
      AsyncStorage[m] = Storage[m].bind(Storage);
    }
  }
}
