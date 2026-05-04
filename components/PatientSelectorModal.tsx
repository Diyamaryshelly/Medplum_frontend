import { Patient } from "@medplum/fhirtypes";
import { UserIcon, XIcon } from "lucide-react-native";
import { View, ScrollView, TouchableOpacity } from "react-native";

import { LoadingDots } from "@/components/LoadingDots";
import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";
import { usePatients } from "@/hooks/usePatients";

export function PatientSelectorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { patients, isLoading } = usePatients();
  const { switchToPatient } = useContextSwitcher();

  const handleSelect = (patient: Patient) => {
    switchToPatient(patient);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader className="border-b border-outline-100 pb-4">
          <Heading size="md" className="text-typography-900">
            View App as Patient
          </Heading>
          <Button variant="link" size="sm" onPress={onClose}>
            <ButtonIcon as={XIcon} className="text-typography-500" />
          </Button>
        </ModalHeader>
        <ModalBody className="pt-4">
          {isLoading ? (
            <View className="py-8 items-center justify-center">
              <LoadingDots />
            </View>
          ) : patients.length === 0 ? (
            <Text className="text-center text-typography-500 py-4">No patients available.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {patients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  onPress={() => handleSelect(patient)}
                  className="flex-row items-center p-3 mb-2 bg-secondary-50 rounded-lg active:bg-secondary-100 border border-secondary-200"
                >
                  <View className="bg-primary-100 p-2 rounded-full mr-3">
                    <UserIcon size={20} className="text-primary-600" />
                  </View>
                  <View>
                    <Text className="text-typography-900 font-semibold">
                      {patient.name?.[0]?.text || patient.name?.[0]?.given?.join(" ") || "Unknown"}
                    </Text>
                    <Text className="text-typography-500 text-xs">
                      ID: {patient.id?.substring(0, 8)}...
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
