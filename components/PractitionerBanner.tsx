import { TouchableOpacity, View } from "react-native";
import { useMedplumContext } from "@medplum/react-hooks";
import { Text } from "@/components/ui/text";
import { useContextSwitcher } from "@/contexts/ContextSwitcherContext";

export function PractitionerBanner() {
  const { isSpoofing, switchBack } = useContextSwitcher();
  const { profile } = useMedplumContext();
  const isPractitioner = profile?.resourceType === "Practitioner";

  if (!isPractitioner && !isSpoofing) {
    return null;
  }

  if (isSpoofing) {
    return (
      <View className="bg-warning-500 py-2 flex-row justify-center items-center">
        <Text className="text-center text-xs text-typography-900 mr-2">
          Viewing as {profile?.name?.[0]?.given?.join(" ")} (Patient)
        </Text>
        <TouchableOpacity onPress={switchBack} className="bg-typography-900 px-2 py-1 rounded">
          <Text className="text-xs text-typography-0">Switch Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-success-500 py-0.5">
      <Text className="text-center text-xs text-typography-0">Practitioner View</Text>
    </View>
  );
}
