import * as ImagePicker from "expo-image-picker";
import { UploadCloudIcon, CheckCircleIcon } from "lucide-react-native";
import { useState } from "react";
import { View, Image, Alert } from "react-native";

import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useMedplum, useMedplumContext } from "@medplum/react-hooks";
import { saveVitalsToFHIR } from "@/utils/fhirVitals";

// Validation: returns an error string or null
function validateFormValues(fv: { hemoglobin: string; glucose: string; heartRate: string; systolic: string; diastolic: string }): string | null {
  const hb  = parseFloat(fv.hemoglobin);
  const gl  = parseFloat(fv.glucose);
  const hr  = parseFloat(fv.heartRate);
  const sys = parseFloat(fv.systolic);
  const dia = parseFloat(fv.diastolic);

  if (fv.hemoglobin && (isNaN(hb) || hb <= 0)) return "Hemoglobin must be a positive number.";
  if (fv.glucose    && (isNaN(gl) || gl <= 0)) return "Glucose must be a positive number.";
  if (fv.heartRate  && (isNaN(hr) || hr <= 0)) return "Heart Rate must be a positive number.";
  if ((fv.systolic && !fv.diastolic) || (!fv.systolic && fv.diastolic))
    return "Both Systolic and Diastolic are required for Blood Pressure.";
  if (fv.systolic  && (isNaN(sys) || sys <= 0)) return "Systolic must be a positive number.";
  if (fv.diastolic && (isNaN(dia) || dia <= 0)) return "Diastolic must be a positive number.";

  const hasAny = fv.hemoglobin || fv.glucose || fv.heartRate || fv.systolic;
  if (!hasAny) return "Please enter at least one vital value before saving.";

  return null;
}

export function OrderbookUpload({ patientId, onSuccess }: { patientId?: string; onSuccess?: () => void }) {
  const medplum = useMedplum();
  const { profile } = useMedplumContext();
  const { uploadReport, fetchOrderbook } = useOrderbook(patientId);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // imageUri — local URI of selected image (used for preview thumbnail + save)
  const [imageUri, setImageUri] = useState<string | null>(null);

  // extractedData — full OCR payload + base64/mimeType kept for save path only
  const [extractedData, setExtractedData] = useState<any>(null);

  // previewData — lightweight vitals object populated directly from OCR response.
  // This is the ONLY thing that drives the preview card — never depends on FHIR.
  const [previewData, setPreviewData] = useState<{
    hemoglobin: string;
    glucose: string;
    heartRate: string;
    systolic: string;
    diastolic: string;
  } | null>(null);

  // formValues — editable copy of previewData; user can tweak before saving
  const [formValues, setFormValues] = useState({
    hemoglobin: "",
    glucose: "",
    heartRate: "",
    systolic: "",
    diastolic: "",
  });

  const handleUpload = async () => {
    // Clear all stale state before each new upload attempt
    setImageUri(null);
    setExtractedData(null);
    setPreviewData(null);
    setFormValues({ hemoglobin: "", glucose: "", heartRate: "", systolic: "", diastolic: "" });
    setSaveError(null);
    setIsSaved(false);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please grant media library access to upload reports.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Set the image URI immediately so the thumbnail is available later
        setImageUri(asset.uri);
        setIsProcessing(true);

        console.log("[OrderbookUpload] Starting OCR via backend (http://localhost:5000)...");

        // Convert base64 to Blob for multipart upload
        const byteCharacters = atob(asset.base64!);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: asset.mimeType || "image/jpeg" });

        const formData = new FormData();
        formData.append("file", blob as any, "upload.jpg");

        const response = await fetch("http://localhost:8103/ocr/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Backend OCR failed: ${response.statusText}`);
        }

        const parsed = await response.json();
        console.log("[OrderbookUpload] OCR result from backend:", JSON.stringify(parsed, null, 2));

        // ── Build preview vitals directly from OCR response ──────────────────
        // Backend returns camelCase (heartRate). snake_case (heart_rate) kept
        // as fallback for compatibility with older backend versions.
        const vitalsPreview = {
          hemoglobin: parsed.hemoglobin  != null ? String(parsed.hemoglobin)  : "",
          glucose:    parsed.glucose     != null ? String(parsed.glucose)     : "",
          heartRate:  (parsed.heartRate ?? parsed.heart_rate) != null
                        ? String(parsed.heartRate ?? parsed.heart_rate) : "",
          systolic:   parsed.systolic    != null ? String(parsed.systolic)    : "",
          diastolic:  parsed.diastolic   != null ? String(parsed.diastolic)   : "",
        };

        console.log("[OrderbookUpload] Setting previewData:", JSON.stringify(vitalsPreview, null, 2));

        // Set previewData FIRST — this drives the preview card render
        setPreviewData(vitalsPreview);

        // Mirror into editable form values
        setFormValues(vitalsPreview);

        // Keep the full payload (including base64/mimeType) for the save step
        setExtractedData({ ...parsed, base64: asset.base64, mimeType: asset.mimeType });

        setIsProcessing(false);
      }
    } catch (error) {
      console.error("[OrderbookUpload] Upload or OCR error:", error);
      // Clear imageUri so no stale thumbnail persists after failure
      setImageUri(null);
      setIsProcessing(false);
      Alert.alert(
        "OCR Failed",
        "Could not extract data from the image. Please try a clearer photo of the report."
      );
    }
  };

  const handleSave = async () => {
    // ── Guard: prevent double-submit ──────────────────────────────────────────
    if (isUploading || !imageUri) return;

    // ── Validate form values (formValues is the single source of truth) ──────
    const validationError = validateFormValues(formValues);
    if (validationError) {
      Alert.alert("Validation Error", validationError);
      return;
    }

    // ── Resolve patient ID ───────────────────────────────────────────────────
    const targetPatientId = patientId || (profile?.resourceType === "Patient" ? profile.id : undefined);
    if (!targetPatientId) {
      Alert.alert("Error", "No patient found. Please log in again.");
      console.error("[OrderbookUpload] Save aborted — no patientId.");
      return;
    }

    setIsUploading(true);
    setIsSaved(false);
    setSaveError(null);

    try {
      // ── Step 1: Upload image → get DocumentReference ─────────────────────
      const fetchResponse = await fetch(imageUri);
      const blob = await fetchResponse.blob();
      const docRef = await uploadReport(blob, "medical-report.jpg", extractedData?.mimeType || "image/jpeg");
      const docRefId = docRef?.id;

      console.log("[OrderbookUpload] Patient ID:", targetPatientId);
      console.log("[OrderbookUpload] DocumentReference ID:", docRefId ?? "(none — image upload may have failed)");

      // ── Step 2: Build numeric vitals from formValues (single source of truth)
      const vitalsToSave = {
        hemoglobin: formValues.hemoglobin ? parseFloat(formValues.hemoglobin)  : undefined,
        glucose:    formValues.glucose    ? parseFloat(formValues.glucose)     : undefined,
        heartRate:  formValues.heartRate  ? parseFloat(formValues.heartRate)   : undefined,
        systolic:   formValues.systolic   ? parseFloat(formValues.systolic)    : undefined,
        diastolic:  formValues.diastolic  ? parseFloat(formValues.diastolic)   : undefined,
      };

      console.log("[OrderbookUpload] Vitals being saved to FHIR:", JSON.stringify(vitalsToSave, null, 2));

      // ── Step 3: Save to FHIR via saveVitalsToFHIR directly ──────────────
      await saveVitalsToFHIR(vitalsToSave, targetPatientId, medplum, docRefId);

      // ── Step 4: Refresh list + notify parent ─────────────────────────────
      await fetchOrderbook();
      onSuccess?.();

      // ── Step 5: Show success + reset all state ───────────────────────────
      setIsSaved(true);
      setTimeout(() => {
        setImageUri(null);
        setExtractedData(null);
        setPreviewData(null);
        setSaveError(null);
        setFormValues({ hemoglobin: "", glucose: "", heartRate: "", systolic: "", diastolic: "" });
        setIsSaved(false);
      }, 1200);

    } catch (error) {
      console.error("[OrderbookUpload] Save failed:", error);
      setSaveError("Could not save vitals. Check your connection and tap Retry.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setImageUri(null);
    setExtractedData(null);
    setPreviewData(null);
    setSaveError(null);
    setFormValues({ hemoglobin: "", glucose: "", heartRate: "", systolic: "", diastolic: "" });
  };

  // ── Preview card ─────────────────────────────────────────────────────────
  // Shown as soon as previewData is set from OCR — no FHIR dependency.
  if (previewData !== null) {
    return (
      <Card className="p-4 mb-4 bg-background-0">
        <Heading size="sm" className="mb-4">Review Extracted Data</Heading>

        {isSaved && (
          <View className="bg-success-100 border border-success-300 rounded-lg p-3 mb-4">
            <Text className="text-success-700 text-center" bold>✅ Vitals saved successfully!</Text>
          </View>
        )}

        {saveError && (
          <View className="bg-error-100 border border-error-300 rounded-lg p-3 mb-4">
            <Text className="text-error-700 text-center mb-2">{saveError}</Text>
            <Button size="sm" variant="outline" onPress={handleSave}>
              <ButtonText>Retry Save</ButtonText>
            </Button>
          </View>
        )}

        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 16 }}
            resizeMode="contain"
          />
        )}

        <VStack space="md">
          <View>
            <Text size="xs" className="text-typography-500 uppercase mb-1">Hemoglobin (g/dL)</Text>
            <Input>
              <InputField
                value={formValues.hemoglobin}
                onChangeText={(v) => setFormValues({ ...formValues, hemoglobin: v })}
                keyboardType="numeric"
              />
            </Input>
          </View>

          <View>
            <Text size="xs" className="text-typography-500 uppercase mb-1">Glucose (mg/dL)</Text>
            <Input>
              <InputField
                value={formValues.glucose}
                onChangeText={(v) => setFormValues({ ...formValues, glucose: v })}
                keyboardType="numeric"
              />
            </Input>
          </View>

          <View>
            <Text size="xs" className="text-typography-500 uppercase mb-1">Heart Rate (bpm)</Text>
            <Input>
              <InputField
                value={formValues.heartRate}
                onChangeText={(v) => setFormValues({ ...formValues, heartRate: v })}
                keyboardType="numeric"
              />
            </Input>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text size="xs" className="text-typography-500 uppercase mb-1">Systolic (mmHg)</Text>
              <Input>
                <InputField
                  value={formValues.systolic}
                  onChangeText={(v) => setFormValues({ ...formValues, systolic: v })}
                  keyboardType="numeric"
                />
              </Input>
            </View>
            <View className="flex-1">
              <Text size="xs" className="text-typography-500 uppercase mb-1">Diastolic (mmHg)</Text>
              <Input>
                <InputField
                  value={formValues.diastolic}
                  onChangeText={(v) => setFormValues({ ...formValues, diastolic: v })}
                  keyboardType="numeric"
                />
              </Input>
            </View>
          </View>

          <View className="flex-row gap-2 mt-4">
            <Button variant="outline" className="flex-1" onPress={handleCancel}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button className="flex-1" onPress={handleSave} disabled={isUploading}>
              <ButtonIcon as={CheckCircleIcon} className="mr-2" />
              <ButtonText>{isUploading ? "Saving..." : "Save Report"}</ButtonText>
            </Button>
          </View>
        </VStack>
      </Card>
    );
  }

  // ── Upload / processing card ──────────────────────────────────────────────
  return (
    <Card className="p-6 mb-4 bg-primary-50 items-center justify-center border border-primary-200 border-dashed rounded-xl">
      <Heading size="md" className="mb-2 text-primary-900">Upload Medical Report</Heading>
      <Text className="text-center text-typography-600 mb-6 px-4">
        Upload a picture of your medical report (like a blood test). We will automatically extract key vitals for your order book.
      </Text>
      <Button onPress={handleUpload} disabled={isProcessing} size="lg">
        <ButtonIcon as={UploadCloudIcon} className="mr-2" />
        <ButtonText>{isProcessing ? "Analyzing Image..." : "Select Image"}</ButtonText>
      </Button>
    </Card>
  );
}
