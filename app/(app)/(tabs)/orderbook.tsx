import { useMedplumContext } from "@medplum/react-hooks";
import { Stack } from "expo-router";
import { RefreshCwIcon } from "lucide-react-native";
import { useState, useEffect } from "react";
import { ScrollView, View } from "react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { OrderbookUpload } from "@/components/OrderbookUpload";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { usePatients } from "@/hooks/usePatients";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

export default function OrderbookScreen() {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const profile = spoofedPatient || medplumProfile;
  const { patients, isLoading: isLoadingPatients } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const isPractitioner = profile?.resourceType === "Practitioner";
  const isPatient = profile?.resourceType === "Patient";

  const targetPatientId = isPractitioner ? selectedPatientId : (isPatient ? profile?.id : undefined);
  
  const { entries, isLoading, fetchOrderbook } = useOrderbook(targetPatientId);

  useEffect(() => {
    if (isPractitioner && patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id!);
    }
  }, [patients, selectedPatientId, isPractitioner]);

  if ((isPractitioner && isLoadingPatients) || (targetPatientId && isLoading) || (isPatient && isLoading)) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
      <Stack.Screen 
        options={{ 
          title: isPractitioner ? "Prescriptions" : "Orderbook",
          headerShown: true,
          headerRight: () => (
            <Button variant="link" onPress={fetchOrderbook}>
              <ButtonIcon as={RefreshCwIcon} />
            </Button>
          )
        }} 
      />
      
      <ScrollView className="flex-1 p-4">
        {isPractitioner && (
          <VStack space="md" className="mb-6">
            <VStack space="xs" className="px-1">
              <Text size="xs" bold className="text-typography-500 uppercase">Select Patient</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {patients.map((p) => (
                  <Button 
                    key={p.id} 
                    variant={selectedPatientId === p.id ? "solid" : "outline"}
                    size="sm"
                    onPress={() => setSelectedPatientId(p.id!)}
                  >
                    <ButtonText>{p.name?.[0]?.given?.join(" ") || "Unknown"}</ButtonText>
                  </Button>
                ))}
              </ScrollView>
            </VStack>
          </VStack>
        )}

        {(isPatient || isPractitioner) && (
            <OrderbookUpload patientId={targetPatientId} onSuccess={fetchOrderbook} />
        )}
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
