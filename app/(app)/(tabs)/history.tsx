import { useMedplumContext } from "@medplum/react-hooks";
import { Stack } from "expo-router";
import { ActivityIcon, RefreshCwIcon } from "lucide-react-native";
import { useState, useEffect } from "react";
import { ScrollView, View } from "react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HistoryForm } from "@/components/HistoryForm";
import { usePatients } from "@/hooks/usePatients";
import { useVitals } from "@/hooks/useVitals";

import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

export default function HistoryScreen() {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const profile = spoofedPatient || medplumProfile;
  const { vitals, isLoading, fetchVitals } = useVitals();
  const { patients, isLoading: isLoadingPatients } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const isPatient = profile?.resourceType === "Patient";
  const isPractitioner = profile?.resourceType === "Practitioner";

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id!);
    }
  }, [patients, selectedPatientId]);

  if (isLoading || isLoadingPatients) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
      <Stack.Screen 
        options={{ 
          title: "History",
          headerShown: true,
          headerRight: () => (
            <Button variant="link" onPress={fetchVitals}>
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
          <View className="mb-6">
            <HistoryForm 
              patientId={isPractitioner ? selectedPatientId : undefined} 
              onSuccess={fetchVitals} 
            />
          </View>
        )}

        <VStack space="md">
          <Heading size="sm" className="px-1">Recent History</Heading>
          {vitals.length === 0 ? (
            <Card className="p-8 items-center justify-center">
              <ActivityIcon size={48} className="text-outline-300 mb-2" />
              <Text className="text-typography-500">No history recorded yet</Text>
            </Card>
          ) : (
            vitals.map((observation) => (
              <Card key={observation.id} className="p-4 bg-background-0">
                <View className="flex-row justify-between items-center">
                  <VStack>
                    <Text size="sm" bold className="text-typography-900">
                      {observation.code?.text || observation.code?.coding?.[0]?.display}
                    </Text>
                    <Text size="xs" className="text-typography-500">
                      {observation.effectiveDateTime ? new Date(observation.effectiveDateTime).toLocaleString() : "N/A"}
                    </Text>
                  </VStack>
                  <Text size="lg" bold className="text-primary-600">
                    {observation.valueQuantity?.value} {observation.valueQuantity?.unit}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </VStack>
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
