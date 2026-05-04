import { PillIcon, CalendarIcon, ClockIcon } from "lucide-react-native";
import { useState } from "react";

import { Button, ButtonText } from "@/components/ui/button";
import { FormControl, FormControlLabel, FormControlLabelText } from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Input, InputField, InputSlot, InputIcon } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { useMedications } from "@/hooks/useMedications";

export function MedicationForm({ patientId, onSuccess }: { patientId: string; onSuccess?: () => void }) {
  const { prescribeMedication } = useMedications();
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!drugName || !dosage) return;
    setIsSubmitting(true);
    try {
      await prescribeMedication(patientId, drugName, dosage, frequency, duration);
      onSuccess?.();
      setDrugName("");
      setDosage("");
      setFrequency("");
      setDuration("");
    } catch (error) {
      console.error("Failed to prescribe medication:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VStack space="md" className="p-4 bg-background-0 rounded-lg shadow-sm border border-outline-100">
      <Heading size="md">Prescribe Medication</Heading>
      
      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Drug Name</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputSlot className="pl-3">
            <InputIcon as={PillIcon} />
          </InputSlot>
          <InputField
            placeholder="e.g. Amoxicillin"
            value={drugName}
            onChangeText={setDrugName}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Dosage</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="e.g. 500mg"
            value={dosage}
            onChangeText={setDosage}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Frequency</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputSlot className="pl-3">
            <InputIcon as={ClockIcon} />
          </InputSlot>
          <InputField
            placeholder="e.g. Twice daily"
            value={frequency}
            onChangeText={setFrequency}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Duration</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputSlot className="pl-3">
            <InputIcon as={CalendarIcon} />
          </InputSlot>
          <InputField
            placeholder="e.g. 7 days"
            value={duration}
            onChangeText={setDuration}
          />
        </Input>
      </FormControl>

      <Button className="mt-2" onPress={handleSubmit} disabled={isSubmitting}>
        <ButtonText>{isSubmitting ? "Prescribing..." : "Prescribe"}</ButtonText>
      </Button>
    </VStack>
  );
}
