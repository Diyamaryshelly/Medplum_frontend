import { useMedplumContext } from "@medplum/react-hooks";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { Alert, View } from "react-native";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MessageDeleteModal } from "@/components/MessageDeleteModal";
import { useAvatars } from "@/hooks/useAvatars";
import { useSingleThread } from "@/hooks/useSingleThread";

async function getAttachment() {
  try {
    // Request permissions if needed
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please grant media library access to attach images and videos.",
      );
      return null;
    }

    // Pick media
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos", "livePhotos"],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    Alert.alert("Error", "Failed to attach media. Please try again.");
    console.error("Error getting attachment:", error);
    return null;
  }
}

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useMedplumContext();
  const { thread, isLoadingThreads, isLoading, sendMessage, markMessageAsRead, deleteMessages } =
    useSingleThread({
      threadId: id,
    });
  const { getAvatarURL, isLoading: isAvatarsLoading } = useAvatars([
    thread?.getAvatarRef({ profile }),
  ]);
  const [message, setMessage] = useState("");
  const [messageKey, setMessageKey] = useState(0); // Add key to force re-render
  const messageRef = useRef(message);
  const inputRef = useRef<any>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    messageRef.current = message;
  }, [message]);
  
  const [isAttaching, setIsAttaching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // If thread is not loading and the thread undefined, redirect to the index page
  useEffect(() => {
    if (!isLoadingThreads && !isLoading && !thread) {
      router.replace("/");
    }
  }, [isLoadingThreads, isLoading, thread]);

  // Mark all unread messages as read when the thread is loaded
  useEffect(() => {
    if (!thread) return;
    thread.messages.forEach((message) => {
      if (!message.read) {
        markMessageAsRead({ threadId: thread.id, messageId: message.id });
      }
    });
  }, [thread, markMessageAsRead]);

  const handleSendMessage = useCallback(
    async (attachment?: ImagePicker.ImagePickerAsset) => {
      const currentMessage = messageRef.current;
      console.log("[ThreadPage] handleSendMessage called, message:", currentMessage);
      
      if (!thread) {
        console.log("[ThreadPage] No thread, returning");
        return;
      }
      if (!currentMessage.trim() && !attachment) {
        console.log("[ThreadPage] Empty message and no attachment, returning");
        return;
      }
      
      console.log("[ThreadPage] Setting isSending to true");
      setIsSending(true);
      
      // Clear immediately before sending
      console.log("[ThreadPage] Clearing message state immediately");
      setMessage("");
      messageRef.current = "";

      try {
        console.log("[ThreadPage] Calling sendMessage with:", currentMessage);
        await sendMessage({
          threadId: thread.id,
          message: currentMessage,
          attachment,
        });
        console.log("[ThreadPage] Message sent successfully");
      } catch (error) {
        console.error("[ThreadPage] Failed to send message:", error);
        // Restore message on error
        setMessage(currentMessage);
        messageRef.current = currentMessage;
        Alert.alert("Error", "Failed to send message. Please try again.");
        throw error;
      } finally {
        console.log("[ThreadPage] Setting isSending to false");
        setIsSending(false);
      }
    },
    [thread, sendMessage],
  );

  const handleAttachment = useCallback(async () => {
    if (!thread) return;
    setIsAttaching(true);
    const attachment = await getAttachment();
    setIsAttaching(false);
    if (attachment) {
      await handleSendMessage(attachment);
    }
  }, [thread, handleSendMessage]);

  const handleMessageSelect = useCallback((messageId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!thread) return;
    setIsDeleting(true);
    try {
      await deleteMessages({
        threadId: thread.id,
        messageIds: Array.from(selectedMessages),
      });
      setSelectedMessages(new Set());
    } catch (error) {
      console.error("Error deleting messages:", error);
      Alert.alert("Error", "Failed to delete messages. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }, [thread, selectedMessages, deleteMessages]);

  const handleDeleteMessages = useCallback(() => {
    if (!thread || selectedMessages.size === 0) return;
    setIsDeleteModalOpen(true);
  }, [thread, selectedMessages]);

  const handleCancelSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  if (!thread || isAvatarsLoading) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
      <ChatHeader
        currentThread={thread}
        getAvatarURL={getAvatarURL}
        selectedCount={selectedMessages.size}
        onDelete={handleDeleteMessages}
        onCancelSelection={handleCancelSelection}
        isDeleting={isDeleting}
      />
      <ChatMessageList
        messages={thread.messages}
        loading={isSending || isLoading}
        selectedMessages={selectedMessages}
        onMessageSelect={handleMessageSelect}
        selectionEnabled={selectedMessages.size > 0}
      />
      <ChatMessageInput
        key={messageKey}
        message={message}
        setMessage={(newMessage) => {
          console.log("[ThreadPage] setMessage called with:", newMessage);
          setMessage(newMessage);
          messageRef.current = newMessage;
        }}
        onAttachment={handleAttachment}
        onSend={async () => {
          console.log("[ThreadPage] onSend called, current message:", message);
          await handleSendMessage();
        }}
        isSending={isSending || isAttaching}
        disabled={selectedMessages.size > 0}
      />
      <MessageDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        selectedCount={selectedMessages.size}
        isDeleting={isDeleting}
      />
    </View>
  );
}
