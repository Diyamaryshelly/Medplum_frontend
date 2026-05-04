import { useMedplumContext } from "@medplum/react-hooks";
import { Tabs } from "expo-router";
import { MessageSquareIcon, ActivityIcon, PillIcon, VideoIcon, UserIcon } from "lucide-react-native";
import { useEffect } from "react";

import { Icon } from "@/components/ui/icon";

import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

export default function TabsLayout() {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const profile = spoofedPatient || medplumProfile;
  const isPractitioner = profile?.resourceType === "Practitioner";

  const commonScreenOptions = {
    headerShown: true,
    tabBarActiveTintColor: "#007AFF",
    tabBarInactiveTintColor: "#8E8E93",
    tabBarStyle: {
      borderTopWidth: 1,
      borderTopColor: "#E5E5EA",
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
    },
    headerStyle: {
      backgroundColor: "#fff",
    },
    headerTitleStyle: {
      fontWeight: "bold",
    },
  };

  if (isPractitioner) {
    return (
      <Tabs screenOptions={commonScreenOptions as any}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Messages",
            headerShown: false,
            tabBarLabel: "Chat",
            tabBarIcon: ({ color }) => <Icon as={MessageSquareIcon} size="md" style={{ color }} />,
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: "Patients",
            tabBarIcon: ({ color }) => <Icon as={UserIcon} size="md" style={{ color }} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Vitals",
            tabBarIcon: ({ color }) => <Icon as={ActivityIcon} size="md" style={{ color }} />,
          }}
        />
        <Tabs.Screen
          name="orderbook"
          options={{
            title: "Prescriptions",
            tabBarIcon: ({ color }) => <Icon as={PillIcon} size="md" style={{ color }} />,
          }}
        />
        <Tabs.Screen
          name="video"
          options={{
            title: "Video Call",
            tabBarIcon: ({ color }) => <Icon as={VideoIcon} size="md" style={{ color }} />,
          }}
        />
      </Tabs>
    );
  }

  // Patient Layout
  return (
    <Tabs screenOptions={commonScreenOptions as any}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Messages",
          headerShown: false,
          tabBarLabel: "Chat",
          tabBarIcon: ({ color }) => <Icon as={MessageSquareIcon} size="md" style={{ color }} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <Icon as={ActivityIcon} size="md" style={{ color }} />,
        }}
      />
      <Tabs.Screen
        name="orderbook"
        options={{
          title: "Orderbook",
          tabBarIcon: ({ color }) => <Icon as={PillIcon} size="md" style={{ color }} />,
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: "Video Consultation",
          tabBarIcon: ({ color }) => <Icon as={VideoIcon} size="md" style={{ color }} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

