import { useMedplumContext } from "@medplum/react-hooks";
import { EllipsisVerticalIcon, PlusIcon, RefreshCwIcon, WifiIcon, WifiOffIcon } from "lucide-react-native";
import { useState } from "react";
import { Platform } from "react-native";

import { PatientSelectorModal } from "@/components/PatientSelectorModal";
import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";
import { useChatConnectionState } from "@/hooks/useChatConnectionState";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverBackdrop, PopoverBody, PopoverContent } from "@/components/ui/popover";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";

interface ThreadListHeaderProps {
  onLogout?: () => void;
  onCreateThread?: () => void;
  onRefresh?: () => void;
}

export function ThreadListHeader({ onLogout, onCreateThread, onRefresh }: ThreadListHeaderProps) {
  const { profile: medplumProfile } = useMedplumContext();
  const { spoofedPatient } = useContextSwitcher();
  const { connectedOnce, reconnecting } = useChatConnectionState();
  const profile = spoofedPatient || medplumProfile;
  const isPatient = profile?.resourceType === "Patient";
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <View className="border-b border-outline-100 bg-background-0">
      <View className="h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <Text size="lg" bold className="text-typography-900">
            Chat threads
          </Text>
          {/* Connection Status Indicator */}
          {reconnecting ? (
            <View className="flex-row items-center gap-1 px-2 py-1 bg-warning-100 rounded-full">
              <Icon as={WifiOffIcon} size="xs" className="text-warning-600" />
              <Text size="xs" className="text-warning-600">Reconnecting...</Text>
            </View>
          ) : connectedOnce ? (
            <View className="flex-row items-center gap-1 px-2 py-1 bg-success-100 rounded-full">
              <Icon as={WifiIcon} size="xs" className="text-success-600" />
              <Text size="xs" className="text-success-600">Live</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          {/* Refresh Button */}
          {onRefresh && (
            <Pressable
              onPress={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full p-2 active:bg-secondary-100"
            >
              <Icon 
                as={RefreshCwIcon} 
                size="md" 
                className={`text-typography-700 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Pressable>
          )}

          {isPatient && onCreateThread && (
            <Button variant="outline" action="primary" size="sm" onPress={() => onCreateThread()}>
              <ButtonIcon as={PlusIcon} size="sm" />
              <ButtonText>New Thread</ButtonText>
            </Button>
          )}

          <Popover
            onClose={() => setIsMenuVisible(false)}
            offset={Platform.OS !== "web" ? -10 : 0}
            placement="bottom right"
            isOpen={isMenuVisible}
            trigger={(triggerProps) => (
              <Pressable
                {...triggerProps}
                onPress={() => setIsMenuVisible(true)}
                className="rounded-full p-2 active:bg-secondary-100"
              >
                <Icon as={EllipsisVerticalIcon} size="md" className="text-typography-700" />
              </Pressable>
            )}
          >
            <PopoverBackdrop />
            <PopoverContent>
              <PopoverBody>
                {!isPatient && (
                  <Pressable
                    onPress={() => {
                      setIsMenuVisible(false);
                      setIsPatientModalOpen(true);
                    }}
                    className="flex-row items-center p-2 active:bg-secondary-100 border-b border-outline-100 mb-1"
                  >
                    <Text className="text-typography-700 font-medium">View as Patient</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setIsMenuVisible(false);
                    onLogout?.();
                  }}
                  className="flex-row items-center p-2 active:bg-secondary-100"
                >
                  <Text className="text-typography-700 text-error-600">Logout</Text>
                </Pressable>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </View>
      </View>
      <PatientSelectorModal 
        isOpen={isPatientModalOpen} 
        onClose={() => setIsPatientModalOpen(false)} 
      />
    </View>
  );
}
