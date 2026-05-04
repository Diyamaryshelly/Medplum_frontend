import { useMedplumContext, useMedplum } from "@medplum/react-hooks";
import { Stack } from "expo-router";
import { FileTextIcon, RefreshCwIcon, EditIcon, CheckIcon } from "lucide-react-native";
import { useState, useEffect } from "react";
import { ScrollView, View, Image } from "react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { OrderbookUpload } from "@/components/OrderbookUpload";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import { usePatients } from "@/hooks/usePatients";
import { useOrderbook, OrderbookEntry } from "@/hooks/useOrderbook";
import { Observation } from "@medplum/fhirtypes";

function EditableObservation({ obs, onUpdate }: { obs: Observation, onUpdate: (obs: Observation, val: number) => Promise<void> }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(obs.valueQuantity?.value?.toString() || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate(obs, parseFloat(editValue));
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to update observation", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View className="flex-row items-center justify-between mb-2">
            <Text size="sm" className="text-typography-700 flex-1">
                {obs.code?.text || obs.code?.coding?.[0]?.display}
            </Text>
            {isEditing ? (
                <View className="flex-row items-center gap-2 flex-1 justify-end">
                    <Input className="w-20" size="sm">
                        <InputField value={editValue} onChangeText={setEditValue} keyboardType="numeric" />
                    </Input>
                    <Text size="sm" className="text-typography-500 mr-2">{obs.valueQuantity?.unit}</Text>
                    <Button size="sm" onPress={handleSave} disabled={isSaving}>
                        <ButtonIcon as={CheckIcon} />
                    </Button>
                </View>
            ) : (
                <View className="flex-row items-center justify-end flex-1">
                    <Text size="sm" bold className="text-typography-900 mr-1">
                        {obs.valueQuantity?.value}
                    </Text>
                    <Text size="sm" className="text-typography-500 mr-3">{obs.valueQuantity?.unit}</Text>
                    <Button variant="link" size="sm" onPress={() => setIsEditing(true)}>
                        <ButtonIcon as={EditIcon} size="sm" className="text-primary-500" />
                    </Button>
                </View>
            )}
        </View>
    );
}

function OrderbookEntryCard({ entry, onUpdateObs }: { entry: OrderbookEntry, onUpdateObs: (obs: Observation, val: number) => Promise<void> }) {
    const medplum = useMedplum();
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const loadAttachment = async () => {
            const attachment = entry.document.content?.[0]?.attachment;
            if (attachment?.url) {
                try {
                    const blob = await medplum.download(attachment.url);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (isMounted) {
                            setImageUrl(reader.result as string);
                        }
                    };
                    reader.readAsDataURL(blob);
                } catch (e) {
                    console.error("Failed to load attachment image", e);
                }
            }
        };
        loadAttachment();
        
        return () => {
            isMounted = false;
        };
    }, [entry.document.content, medplum]);

    return (
        <Card className="p-4 bg-background-0 mb-4">
            <VStack space="sm">
                <Text size="xs" className="text-typography-400">
                    {entry.document.date ? new Date(entry.document.date).toLocaleString() : "Unknown Date"}
                </Text>
                
                {imageUrl && (
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 150, borderRadius: 8 }} resizeMode="cover" />
                )}
                
                {entry.observations.length > 0 ? (
                    <VStack className="mt-2 pt-2 border-t border-outline-100">
                        <Heading size="xs" className="mb-2 text-typography-500 uppercase">Extracted Vitals</Heading>
                        {entry.observations.map(obs => (
                            <EditableObservation key={obs.id} obs={obs} onUpdate={onUpdateObs} />
                        ))}
                    </VStack>
                ) : (
                    <Text size="sm" className="text-typography-500 italic mt-2">No data extracted.</Text>
                )}
            </VStack>
        </Card>
    );
}

import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

export default function OrderbookScreen() {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const profile = spoofedPatient || medplumProfile;
  const { patients, isLoading: isLoadingPatients } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const isPractitioner = profile?.resourceType === "Practitioner";
  const isPatient = profile?.resourceType === "Patient";

  const targetPatientId = isPractitioner ? selectedPatientId : undefined;
  
  const { entries, isLoading, fetchOrderbook, updateObservation } = useOrderbook(targetPatientId);

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

        {isPatient && (
            <OrderbookUpload onSuccess={fetchOrderbook} />
        )}

        <VStack space="md">
          <Heading size="sm" className="px-1">Report History</Heading>
          {entries.length === 0 ? (
            <Card className="p-8 items-center justify-center">
              <FileTextIcon size={48} className="text-outline-300 mb-2" />
              <Text className="text-typography-500">No reports uploaded yet</Text>
            </Card>
          ) : (
            entries.map((entry) => (
                <OrderbookEntryCard key={entry.document.id} entry={entry} onUpdateObs={updateObservation} />
            ))
          )}
        </VStack>
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
