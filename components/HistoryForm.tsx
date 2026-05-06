import { useMedplumContext } from "@medplum/react-hooks";
import { HeartIcon, ThermometerIcon, ActivityIcon, WindIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { FormControl, FormControlLabel, FormControlLabelText } from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Input, InputField, InputSlot, InputIcon } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { useVitals } from "@/hooks/useVitals";

export function HistoryForm({ patientId, onSuccess }: { patientId?: string; onSuccess?: () => void }) {
  const { addVital } = useVitals();
  const { profile } = useMedplumContext();
  const [heartRate, setHeartRate] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spO2, setSpO2] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetPatientId = patientId || (profile?.resourceType === "Patient" ? profile.id : undefined);

  const handleSubmit = async () => {
    if (!targetPatientId) return;
    setIsSubmitting(true);
    try {
      if (heartRate) {
        await addVital("8867-4", "Heart rate", parseFloat(heartRate), "beats/min", targetPatientId);
      }
      if (systolic && diastolic) {
        await addVital("8480-6", "Systolic blood pressure", parseFloat(systolic), "mm[Hg]", targetPatientId);
        await addVital("8462-4", "Diastolic blood pressure", parseFloat(diastolic), "mm[Hg]", targetPatientId);
      }
      if (temperature) {
        await addVital("8310-5", "Body temperature", parseFloat(temperature), "Cel", targetPatientId);
      }
      if (spO2) {
        await addVital("2708-6", "Oxygen saturation in Arterial blood", parseFloat(spO2), "%", targetPatientId);
      }
      onSuccess?.();
      setHeartRate("");
      setSystolic("");
      setDiastolic("");
      setTemperature("");
      setSpO2("");
    } catch (error) {
      console.error("Failed to add history:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VStack space="md" className="p-4 bg-background-0 rounded-lg shadow-sm border border-outline-100">
      <Heading size="md">Enter History</Heading>
      
      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Heart Rate (bpm)</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputSlot className="pl-3">
            <InputIcon as={HeartIcon} />
          </InputSlot>
          <InputField
            placeholder="e.g. 72"
            value={heartRate}
            onChangeText={setHeartRate}
            keyboardType="numeric"
          />
        </Input>
      </FormControl>

      <View className="flex-row gap-4">
        <FormControl className="flex-1">
          <FormControlLabel>
            <FormControlLabelText>Systolic (mmHg)</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              placeholder="120"
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="numeric"
            />
          </Input>
        </FormControl>
        <FormControl className="flex-1">
          <FormControlLabel>
            <FormControlLabelText>Diastolic (mmHg)</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              placeholder="80"
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="numeric"
            />
          </Input>
        </FormControl>
      </View>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Temperature (°C)</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputSlot className="pl-3">
            <InputIcon as={ThermometerIcon} />
          </InputSlot>
          <InputField
            placeholder="36.6"
            value={temperature}
            onChangeText={setTemperature}
            keyboardType="numeric"
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>SpO2 (%)</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputSlot className="pl-3">
            <InputIcon as={WindIcon} />
          </InputSlot>
          <InputField
            placeholder="98"
            value={spO2}
            onChangeText={setSpO2}
            keyboardType="numeric"
          />
        </Input>
      </FormControl>

      <Button className="mt-2" onPress={handleSubmit} disabled={isSubmitting}>
        <ButtonText>{isSubmitting ? "Submitting..." : "Submit Vitals"}</ButtonText>
      </Button>
    </VStack>
  );
}
