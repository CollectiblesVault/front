import { Alert, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export function useReportsExport({
  authToken,
  exportRange,
  buildExportCsv,
  reportsSummaryCsvApi,
}) {
  const handleExport = async () => {
    try {
      let csv = "";

      if (authToken != null) {
        try {
          csv = await reportsSummaryCsvApi({
            token: authToken,
            period: exportRange,
          });
        } catch {
          csv = buildExportCsv();
        }
      } else {
        csv = buildExportCsv();
      }

      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report_${exportRange}_${Date.now()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 800);
        return;
      }

      const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

      if (!baseDir) {
        await Share.share({ title: "Экспорт CSV", message: csv });
        return;
      }

      const fileUri = `${baseDir}report_${exportRange}_${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Share.share({ title: "Экспорт CSV", message: csv });
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось экспортировать");
    }
  };

  return { handleExport };
}