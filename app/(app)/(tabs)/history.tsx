import { useMedplumContext, useMedplum } from "@medplum/react-hooks";
import { Stack } from "expo-router";
import { RefreshCwIcon, FileTextIcon, EditIcon, CheckIcon, Trash2Icon } from "lucide-react-native";
import { useState, useEffect } from "react";
import { ScrollView, View, Image, Alert, Platform } from "react-native";

import { LoadingScreen } from "@/components/LoadingScreen";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import { usePatients } from "@/hooks/usePatients";
import { useOrderbook, OrderbookEntry } from "@/hooks/useOrderbook";
import { Observation } from "@medplum/fhirtypes";

import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

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
        <View className="flex-row items-center justify-between py-2 px-3 bg-background-0 rounded-md">
            <Text size="sm" className="text-typography-700 flex-1 font-medium">
                {obs.code?.text || obs.code?.coding?.[0]?.display}
            </Text>
            {isEditing ? (
                <View className="flex-row items-center gap-2">
                    <Input className="w-20 h-9" size="sm">
                        <InputField 
                            value={editValue} 
                            onChangeText={setEditValue} 
                            keyboardType="numeric"
                            className="text-center"
                        />
                    </Input>
                    <Text size="sm" className="text-typography-600 min-w-[40px]">
                        {obs.valueQuantity?.unit}
                    </Text>
                    <Button size="xs" onPress={handleSave} disabled={isSaving} className="h-9 px-3">
                        <ButtonIcon as={CheckIcon} size="sm" />
                    </Button>
                </View>
            ) : (
                <View className="flex-row items-center gap-2">
                    <Text size="md" bold className="text-primary-600 min-w-[50px] text-right">
                        {obs.valueQuantity?.value}
                    </Text>
                    <Text size="sm" className="text-typography-600 min-w-[40px]">
                        {obs.valueQuantity?.unit}
                    </Text>
                    <Button variant="link" size="xs" onPress={() => setIsEditing(true)} className="h-9 px-2">
                        <ButtonIcon as={EditIcon} size="sm" className="text-primary-500" />
                    </Button>
                </View>
            )}
        </View>
    );
}

function OrderbookEntryCard({ entry, onUpdateObs, onDelete }: { 
    entry: OrderbookEntry, 
    onUpdateObs: (obs: Observation, val: number) => Promise<void>,
    onDelete: () => Promise<void>
}) {
    const medplum = useMedplum();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDelete = () => {
        // For web, use window.confirm; for native, use Alert
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(
                "Are you sure you want to delete this report? This action cannot be undone."
            );
            if (confirmed) {
                performDelete();
            }
        } else {
            Alert.alert(
                "Delete Report",
                "Are you sure you want to delete this report? This action cannot be undone.",
                [
                    {
                        text: "Cancel",
                        style: "cancel"
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: performDelete
                    }
                ]
            );
        }
    };

    const performDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
        } catch (error) {
            console.error("Failed to delete report:", error);
            if (Platform.OS === 'web') {
                window.alert("Failed to delete report. Please try again.");
            } else {
                Alert.alert("Error", "Failed to delete report. Please try again.");
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="bg-background-0 overflow-hidden">
            <VStack space="md" className="p-4">
                {/* Date Header with Delete Button */}
                <View className="flex-row items-center justify-between pb-2 border-b border-outline-100">
                    <View className="flex-1">
                        <Text size="sm" bold className="text-typography-900">
                            Medical Report
                        </Text>
                        <Text size="xs" className="text-typography-500">
                            {entry.document.date ? new Date(entry.document.date).toLocaleDateString() : "Unknown Date"}
                        </Text>
                    </View>
                    <Button 
                        variant="link" 
                        size="sm" 
                        onPress={handleDelete}
                        disabled={isDeleting}
                        className="h-9"
                    >
                        <ButtonIcon as={Trash2Icon} size="sm" className="text-error-500" />
                    </Button>
                </View>
                
                {/* Report Image */}
                {imageUrl && (
                    <View className="rounded-lg overflow-hidden bg-background-100">
                        <Image 
                            source={{ uri: imageUrl }} 
                            style={{ width: '100%', height: 200 }} 
                            resizeMode="contain"
                        />
                    </View>
                )}
                
                {/* Extracted Vitals */}
                {entry.observations.length > 0 && (
                    <VStack space="sm" className="pt-2">
                        <Text size="sm" bold className="text-typography-700 uppercase tracking-wide">
                            Extracted Vitals
                        </Text>
                        <VStack space="xs" className="bg-background-50 rounded-lg p-3">
                            {entry.observations.map(obs => (
                                <EditableObservation key={obs.id} obs={obs} onUpdate={onUpdateObs} />
                            ))}
                        </VStack>
                    </VStack>
                )}
            </VStack>
        </Card>
    );
}

export default function HistoryScreen() {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const profile = spoofedPatient || medplumProfile;
  const { patients, isLoading: isLoadingPatients } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const isPatient = profile?.resourceType === "Patient";
  const isPractitioner = profile?.resourceType === "Practitioner";

  const targetPatientId = isPractitioner ? selectedPatientId : (isPatient ? profile?.id : undefined);
  const { entries, isLoading: isLoadingOrderbook, fetchOrderbook, updateObservation, deleteReport } = useOrderbook(targetPatientId);

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id!);
    }
  }, [patients, selectedPatientId]);

  if (isLoadingPatients || isLoadingOrderbook) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
      <Stack.Screen 
        options={{ 
          title: "History",
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

        <VStack space="lg">
          <View className="flex-row items-center justify-between px-1">
            <Heading size="md" className="text-typography-900">Report History</Heading>
            <Text size="xs" className="text-typography-500">{entries.length} {entries.length === 1 ? 'report' : 'reports'}</Text>
          </View>
          
          {entries.length === 0 ? (
            <Card className="p-12 items-center justify-center bg-background-0">
              <FileTextIcon size={56} className="text-outline-300 mb-3" />
              <Text size="md" bold className="text-typography-700 mb-1">No Reports Yet</Text>
              <Text size="sm" className="text-typography-500 text-center">
                Upload medical reports to see them here
              </Text>
            </Card>
          ) : (
            <VStack space="md">
              {entries.map((entry) => (
                  <OrderbookEntryCard 
                    key={entry.document.id} 
                    entry={entry} 
                    onUpdateObs={updateObservation}
                    onDelete={async () => {
                      const observationIds = entry.observations.map(obs => obs.id!).filter(Boolean);
                      await deleteReport(entry.document.id!, observationIds);
                    }}
                  />
              ))}
            </VStack>
          )}
        </VStack>
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
