import { useMedplumContext } from "@medplum/react-hooks";
import { Stack } from "expo-router";
import { VideoIcon, PhoneIcon, PhoneOffIcon } from "lucide-react-native";
import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

export default function VideoCallScreen() {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const profile = spoofedPatient || medplumProfile;
  const [isInCall, setIsInCall] = useState(false);
  const [roomID, setRoomID] = useState("");
  const isPractitioner = profile?.resourceType === "Practitioner";

  const startCall = () => {
    // Generate a random room ID or use a specific one
    const newRoomID = `medplum-call-${Math.random().toString(36).substring(7)}`;
    setRoomID(newRoomID);
    setIsInCall(true);
    
    // In a real app, you'd save this roomID to a FHIR Encounter or Communication
    // and notify the patient.
    console.log("Starting call in room:", newRoomID);
  };

  const joinCall = () => {
    // In a real app, you'd fetch the active room ID from an Encounter or Notification
    setRoomID("medplum-demo-room"); 
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
    setRoomID("");
  };

  if (isInCall && roomID) {
    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <WebView 
          source={{ uri: `https://meet.jit.si/${roomID}#config.startWithAudioMuted=true&config.startWithVideoMuted=false` }}
          style={{ flex: 1 }}
        />
        <View className="absolute bottom-10 left-0 right-0 items-center">
          <Button action="negative" size="lg" className="rounded-full h-16 w-16" onPress={endCall}>
            <ButtonIcon as={PhoneOffIcon} size="xl" />
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-50 p-4">
      <Stack.Screen options={{ title: "Video Consultation", headerShown: true }} />
      
      <VStack space="xl" className="mt-10">
        <Card className="p-6 items-center">
          <View className="bg-primary-50 p-4 rounded-full mb-4">
            <VideoIcon size={48} className="text-primary-600" />
          </View>
          <Heading size="lg" className="text-center mb-2">
            Telemedicine Call
          </Heading>
          <Text className="text-center text-typography-500 mb-6">
            {isPractitioner 
              ? "Start a secure video consultation with your patient." 
              : "Join the video call initiated by your healthcare provider."}
          </Text>

          {isPractitioner ? (
            <Button size="lg" className="w-full" onPress={startCall}>
              <ButtonIcon as={PhoneIcon} className="mr-2" />
              <ButtonText>Start New Call</ButtonText>
            </Button>
          ) : (
            <Button size="lg" className="w-full" action="secondary" onPress={joinCall}>
              <ButtonIcon as={PhoneIcon} className="mr-2" />
              <ButtonText>Join Call</ButtonText>
            </Button>
          )}
        </Card>

        <VStack space="sm">
          <Text size="xs" bold className="text-typography-400 uppercase px-1">
            How it works
          </Text>
          <Card className="p-4 bg-background-0">
            <Text size="sm" className="text-typography-600">
              1. {isPractitioner ? "Click 'Start New Call' to create a secure room." : "Wait for your practitioner to start the session."}
            </Text>
            <Text size="sm" className="text-typography-600 mt-2">
              2. Both parties join the encrypted video session.
            </Text>
            <Text size="sm" className="text-typography-600 mt-2">
              3. End the call when the consultation is complete.
            </Text>
          </Card>
        </VStack>
      </VStack>
    </View>
  );
}
