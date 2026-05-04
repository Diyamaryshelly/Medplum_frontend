import { useMedplum } from "@medplum/react-hooks";
import { Stack } from "expo-router";
import { UserIcon } from "lucide-react-native";
import { ScrollView, View, TouchableOpacity } from "react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";
import { usePatients } from "@/hooks/usePatients";

export default function PatientsScreen() {
  const { patients, isLoading } = usePatients();
  const { switchToPatient } = useContextSwitcher();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
      <Stack.Screen 
        options={{ 
          title: "My Patients",
          headerShown: true,
        }} 
      />
      
      <ScrollView className="flex-1 p-4">
        <VStack space="md">
          <Heading size="sm" className="px-1 mb-2">Assigned Patients</Heading>
          {patients.length === 0 ? (
            <Card className="p-8 items-center justify-center">
              <UserIcon size={48} className="text-outline-300 mb-2" />
              <Text className="text-typography-500">No assigned patients</Text>
            </Card>
          ) : (
            patients.map((patient) => (
              <TouchableOpacity key={patient.id} onPress={() => switchToPatient(patient)}>
                <Card className="p-4 bg-background-0 mb-3 active:bg-secondary-50">
                  <View className="flex-row items-center">
                    <View className="bg-primary-100 p-3 rounded-full mr-4">
                      <UserIcon size={24} className="text-primary-600" />
                    </View>
                    <VStack>
                      <Text size="lg" bold className="text-typography-900">
                        {patient.name?.[0]?.text || patient.name?.[0]?.given?.join(" ") || "Unknown Patient"}
                      </Text>
                      <Text size="sm" className="text-typography-500 mt-1">
                        ID: {patient.id?.substring(0, 8)}
                      </Text>
                      {patient.birthDate && (
                        <Text size="sm" className="text-typography-500">
                          DOB: {patient.birthDate}
                        </Text>
                      )}
                    </VStack>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </VStack>
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
