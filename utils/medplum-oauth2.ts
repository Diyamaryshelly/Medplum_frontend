import { Platform } from "react-native";

export const oauth2ClientId =
  Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_MEDPLUM_WEB_CLIENT_ID!
    : process.env.EXPO_PUBLIC_MEDPLUM_NATIVE_CLIENT_ID!;
const baseUrl = process.env.EXPO_PUBLIC_MEDPLUM_BASE_URL || "https://api.medplum.com";

export const oAuth2Discovery = {
  authorizationEndpoint: `${baseUrl}/oauth2/authorize`,
  tokenEndpoint: `${baseUrl}/oauth2/token`,
  userInfoEndpoint: `${baseUrl}/oauth2/userinfo`,
};
